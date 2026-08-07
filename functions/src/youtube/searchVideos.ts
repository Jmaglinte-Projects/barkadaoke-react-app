import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { logger } from 'firebase-functions'

const youtubeApiKey = defineSecret('YOUTUBE_API_KEY')

type SongSearchResult = {
  videoId: string
  title: string
  thumbnailUrl: string
  channelTitle: string
}

type SearchRequest = {
  query?: string
  maxResults?: number
}

type YouTubeSearchItem = {
  id?: { videoId?: string }
  snippet?: {
    title?: string
    channelTitle?: string
    thumbnails?: {
      medium?: { url?: string }
      default?: { url?: string }
    }
  }
}

function buildKaraokeQuery(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ')
  if (!trimmed) return ''
  if (/\bkaraoke\b/i.test(trimmed)) return trimmed
  return `${trimmed} karaoke`
}

export const searchVideos = onCall(
  {
    secrets: [youtubeApiKey],
    cors: true,
  },
  async (request): Promise<{ results: SongSearchResult[] }> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in to search songs.')
    }

    const data = (request.data ?? {}) as SearchRequest
    const query = buildKaraokeQuery(String(data.query ?? ''))
    if (query.length < 2) {
      throw new HttpsError(
        'invalid-argument',
        'Enter at least 2 characters to search.',
      )
    }

    const maxResults = Math.min(Math.max(Number(data.maxResults) || 8, 1), 15)
    const apiKey = youtubeApiKey.value()

    if (!apiKey) {
      throw new HttpsError(
        'failed-precondition',
        'YouTube API key is not configured on the server.',
      )
    }

    const url = new URL('https://www.googleapis.com/youtube/v3/search')
    url.searchParams.set('part', 'snippet')
    url.searchParams.set('type', 'video')
    url.searchParams.set('videoEmbeddable', 'true')
    url.searchParams.set('maxResults', String(maxResults))
    url.searchParams.set('q', query)
    url.searchParams.set('key', apiKey)

    let response: Response
    try {
      response = await fetch(url)
    } catch (error) {
      logger.error('YouTube search network error', error)
      throw new HttpsError('internal', 'Failed to reach YouTube search.')
    }

    if (!response.ok) {
      const body = await response.text()
      logger.error('YouTube search failed', {
        status: response.status,
        body,
      })
      throw new HttpsError(
        'internal',
        'YouTube search failed. Check the API key and quota.',
      )
    }

    const json = (await response.json()) as { items?: YouTubeSearchItem[] }
    const results: SongSearchResult[] = (json.items ?? [])
      .map((item) => {
        const videoId = item.id?.videoId
        if (!videoId) return null
        return {
          videoId,
          title: item.snippet?.title ?? 'Untitled',
          thumbnailUrl:
            item.snippet?.thumbnails?.medium?.url ??
            item.snippet?.thumbnails?.default?.url ??
            '',
          channelTitle: item.snippet?.channelTitle ?? 'YouTube',
        } satisfies SongSearchResult
      })
      .filter((item): item is SongSearchResult => item !== null)

    return { results }
  },
)
