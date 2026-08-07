import { httpsCallable } from 'firebase/functions'

import { getFirebaseFunctions } from '@/firebase/config'
import { MOCK_SEARCH_RESULTS } from '@/lib/mock-data'
import type { SongSearchResult } from '@/types/youtube'

type SearchVideosResponse = {
  results: SongSearchResult[]
}

export type SearchKaraokeResult = {
  results: SongSearchResult[]
  usedFallback: boolean
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
      results: result.data.results ?? [],
      usedFallback: false,
    }
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code?: string }).code)
        : ''

    // Allow local UI work before the Cloud Function is deployed.
    if (
      code.includes('not-found') ||
      code.includes('unimplemented') ||
      code.includes('failed-precondition')
    ) {
      return {
        results: MOCK_SEARCH_RESULTS,
        usedFallback: true,
      }
    }

    throw error
  }
}
