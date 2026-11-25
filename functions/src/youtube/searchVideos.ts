import { getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { logger } from 'firebase-functions'

import { LOCAL_RESULT_THRESHOLD, searchCatalog } from '../catalog/searchCatalog'
import type {
  SearchFallbackReason,
  SearchSource,
  SearchVideosResponse,
  SongSearchResult,
} from '../catalog/types'

const youtubeApiKey = defineSecret('YOUTUBE_API_KEY')
// Shared across function instances; retry periodically to allow quota recovery.
const QUOTA_COOLDOWN_MS = 15 * 60_000
const QUOTA_STATUS_PATH = '_searchStatus/youtube'

type SearchRequest = {
  query?: unknown
  maxResults?: unknown
  source?: unknown
}

type YouTubeSearchItem = {
  id?: { videoId?: string }
  snippet?: {
    title?: string
    channelTitle?: string
    thumbnails?: { medium?: { url?: string }; default?: { url?: string } }
  }
}

class YouTubeSearchError extends Error {
  constructor(readonly reason: SearchFallbackReason) {
    super(reason)
  }
}

async function searchYouTube(
  query: string,
  maxResults: number,
  apiKey: string,
): Promise<SongSearchResult[]> {
  const url = new URL('https://www.googleapis.com/youtube/v3/search')
  url.searchParams.set('part', 'snippet')
  url.searchParams.set('type', 'video')
  url.searchParams.set('videoEmbeddable', 'true')
  url.searchParams.set('maxResults', String(maxResults))
  url.searchParams.set(
    'q',
    /\bkaraoke\b/i.test(query) ? query : `${query} karaoke`,
  )
  url.searchParams.set('key', apiKey)

  const response = await fetch(url, { signal: AbortSignal.timeout(8_000) })
  if (!response.ok) {
    const body = await response.text()
    logger.warn('YouTube search failed', { status: response.status })
    let reasons: string[] = []
    try {
      const data = JSON.parse(body) as {
        error?: { errors?: { reason?: string }[] }
      }
      reasons = (data.error?.errors ?? []).map((error) => error.reason ?? '')
    } catch {
      // An upstream proxy can return a non-JSON error body.
    }
    throw new YouTubeSearchError(
      reasons.some(
        (reason) =>
          reason === 'quotaExceeded' || reason === 'dailyLimitExceeded',
      )
        ? 'quota-exceeded'
        : 'youtube-unavailable',
    )
  }

  const json = (await response.json()) as { items?: YouTubeSearchItem[] }
  return (json.items ?? []).flatMap((item): SongSearchResult[] => {
    const videoId = item.id?.videoId
    return videoId
      ? [
          {
            videoId,
            title: item.snippet?.title ?? 'Untitled',
            thumbnailUrl:
              item.snippet?.thumbnails?.medium?.url ??
              item.snippet?.thumbnails?.default?.url ??
              '',
            channelTitle: item.snippet?.channelTitle ?? 'YouTube',
            source: 'youtube',
            resultSource: 'youtube',
          },
        ]
      : []
  })
}

/** All modes retain a usable library fallback, including an empty result set. */
export const searchVideos = onCall(
  { secrets: [youtubeApiKey], cors: true },
  async (request): Promise<SearchVideosResponse> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in to search songs.')
    }
    const data = (request.data ?? {}) as SearchRequest
    const source = data.source ?? 'auto'
    if (!['auto', 'catalog', 'youtube'].includes(source as string)) {
      throw new HttpsError(
        'invalid-argument',
        'Choose Auto, Barkadaoke Library, or YouTube.',
      )
    }
    if (data.query != null && typeof data.query !== 'string') {
      throw new HttpsError('invalid-argument', 'Provide a search query.')
    }
    const query = String(data.query ?? '')
      .trim()
      .replace(/\s+/g, ' ')
    if ((query.length > 0 && query.length < 2) || query.length > 200) {
      throw new HttpsError(
        'invalid-argument',
        'Enter between 2 and 200 characters to search.',
      )
    }
    const maxResults = Math.min(
      Math.max(Math.floor(Number(data.maxResults)) || 8, 1),
      15,
    )
    return findVideos(query, maxResults, source as SearchSource)
  },
)

async function findVideos(
  query: string,
  maxResults: number,
  source: SearchSource,
): Promise<SearchVideosResponse> {
  // Library mode and blank-query browsing never read the API secret or call YouTube.
  const local = await searchCatalog(query, maxResults)
  const catalogResponse: SearchVideosResponse = {
    results: local,
    searchMode: 'catalog',
    youtubeSearchSucceeded: false,
  }
  if (
    source === 'catalog' ||
    !query ||
    (source === 'auto' &&
      local.length >= Math.min(LOCAL_RESULT_THRESHOLD, maxResults))
  ) {
    return catalogResponse
  }
  const fallback = (
    fallbackReason: SearchFallbackReason,
  ): SearchVideosResponse => ({
    ...catalogResponse,
    searchMode: 'catalog-fallback',
    fallbackReason,
  })
  const apiKey = youtubeApiKey.value()
  if (!apiKey) return fallback('not-configured')

  const quotaStatus = getFirestore().doc(QUOTA_STATUS_PATH)
  try {
    const status = await quotaStatus.get()
    if (Number(status.data()?.retryAt ?? 0) > Date.now()) {
      return fallback('quota-exceeded')
    }
  } catch (error) {
    logger.warn('Could not read YouTube quota status; using library', error)
    return fallback('youtube-unavailable')
  }

  try {
    const remote = await searchYouTube(query, maxResults, apiKey)
    const results = source === 'youtube' ? remote : mergeResults(local, remote)
    return {
      results: results.slice(0, maxResults),
      searchMode: source === 'youtube' ? 'youtube' : 'catalog+youtube',
      youtubeSearchSucceeded: true,
    }
  } catch (error) {
    const reason =
      error instanceof YouTubeSearchError ? error.reason : 'youtube-unavailable'
    if (reason === 'quota-exceeded') {
      try {
        await quotaStatus.set({ retryAt: Date.now() + QUOTA_COOLDOWN_MS })
      } catch (statusError) {
        logger.warn('Could not save YouTube quota cooldown', statusError)
      }
    }
    logger.warn('YouTube search unavailable; using library', { reason })
    return fallback(reason)
  }
}

function mergeResults(
  local: SongSearchResult[],
  remote: SongSearchResult[],
): SongSearchResult[] {
  const byId = new Map(local.map((song) => [song.videoId, song]))
  for (const song of remote) {
    if (!byId.has(song.videoId)) byId.set(song.videoId, song)
  }
  return [...byId.values()]
}
