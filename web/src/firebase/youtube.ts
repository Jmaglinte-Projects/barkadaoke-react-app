import { httpsCallable } from 'firebase/functions'

import { getFirebaseFunctions } from '@/firebase/config'
import { MOCK_SEARCH_RESULTS } from '@/lib/mock-data'
import type { SearchMode, SongSearchResult } from '@/types/youtube'

type SearchVideosResponse = {
  results: SongSearchResult[]
  searchMode: SearchMode
  youtubeSearchSucceeded: boolean
}

export type SearchKaraokeResult = {
  results: SongSearchResult[]
  searchMode: SearchMode | 'mock'
  youtubeSearchSucceeded: boolean
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

export async function searchKaraokeVideos(
  query: string,
): Promise<SearchKaraokeResult> {
  const callable = httpsCallable<{ query: string }, SearchVideosResponse>(
    getFirebaseFunctions(),
    'searchVideos',
  )

  try {
    const result = await callable({ query })
    return {
      results: withSearchDefaults(result.data.results ?? []),
      searchMode: result.data.searchMode ?? 'catalog+youtube',
      youtubeSearchSucceeded: Boolean(result.data.youtubeSearchSucceeded),
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
      code.includes('not-found') ||
      code.includes('unimplemented') ||
      code.includes('failed-precondition')
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
