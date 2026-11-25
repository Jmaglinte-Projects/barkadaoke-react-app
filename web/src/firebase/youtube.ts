import { httpsCallable } from 'firebase/functions'

import { getFirebaseAuth, getFirebaseFunctions } from '@/firebase/config'
import { createRequestCache } from '@/lib/request-cache'
import { MOCK_SEARCH_RESULTS } from '@/lib/mock-data'
import type {
  SearchFallbackReason,
  SearchMode,
  SearchSource,
  SongSearchResult,
} from '@/types/youtube'

type SearchVideosResponse = {
  results: SongSearchResult[]
  searchMode: SearchMode
  youtubeSearchSucceeded: boolean
  fallbackReason?: SearchFallbackReason
}

export type SearchKaraokeResult = {
  results: SongSearchResult[]
  searchMode: SearchMode | 'mock'
  youtubeSearchSucceeded: boolean
  fallbackReason?: SearchFallbackReason
  /** True only for local-dev mock results when the callable is undeployed. */
  usedFallback: boolean
}

function withSearchDefaults(results: SongSearchResult[]): SongSearchResult[] {
  return results.map((result) => ({
    ...result,
    source: result.source ?? 'youtube',
    resultSource: result.resultSource ?? 'youtube',
  }))
}

const searchRequests = createRequestCache({ ttlMs: 60_000 })

export async function searchKaraokeVideos(
  query: string,
  source: SearchSource = 'auto',
): Promise<SearchKaraokeResult> {
  const normalized = query.trim().replace(/\s+/g, ' ')
  const uid = getFirebaseAuth().currentUser?.uid ?? 'anonymous'
  return searchRequests(
    JSON.stringify([uid, source, normalized.toLowerCase()]),
    () => fetchKaraokeVideos(normalized, source),
  )
}

async function fetchKaraokeVideos(
  query: string,
  source: SearchSource,
): Promise<SearchKaraokeResult> {
  const callable = httpsCallable<
    { query: string; source: SearchSource },
    SearchVideosResponse
  >(getFirebaseFunctions(), 'searchVideos')

  try {
    const result = await callable({ query, source })
    return {
      results: withSearchDefaults(result.data.results ?? []),
      searchMode: result.data.searchMode ?? 'catalog+youtube',
      youtubeSearchSucceeded: Boolean(result.data.youtubeSearchSucceeded),
      fallbackReason: result.data.fallbackReason,
      usedFallback: false,
    }
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code?: string }).code)
        : ''

    // Dev-only: allow UI work before the Cloud Function is deployed.
    // Production YouTube failures are handled server-side as catalog-fallback.
    if (
      import.meta.env.DEV &&
      source !== 'catalog' &&
      (code.includes('not-found') || code.includes('unimplemented'))
    ) {
      return {
        results: withSearchDefaults(MOCK_SEARCH_RESULTS),
        searchMode: 'mock',
        youtubeSearchSucceeded: false,
        usedFallback: true,
      }
    }

    throw error
  }
}
