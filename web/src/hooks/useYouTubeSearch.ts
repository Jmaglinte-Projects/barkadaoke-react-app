import { useEffect, useState } from 'react'

import {
  searchKaraokeVideos,
  type SearchKaraokeResult,
} from '@/firebase/youtube'
import type { SearchSource } from '@/types/youtube'

const DEBOUNCE_MS = 550

type SearchState = SearchKaraokeResult & {
  requestKey: string
  isSearching: boolean
  error: string | null
}

const EMPTY_SEARCH: SearchState = {
  requestKey: '',
  results: [],
  isSearching: false,
  error: null,
  usedFallback: false,
  searchMode: 'catalog',
  youtubeSearchSucceeded: false,
}

export function useYouTubeSearch(query: string, source: SearchSource = 'auto') {
  const [state, setState] = useState<SearchState>(EMPTY_SEARCH)
  const trimmed = query.trim().replace(/\s+/g, ' ')
  const requestKey = JSON.stringify([source, trimmed])
  const tooShort = trimmed.length === 1

  useEffect(() => {
    if (tooShort) {
      setState(EMPTY_SEARCH)
      return
    }
    let cancelled = false
    setState({ ...EMPTY_SEARCH, requestKey, isSearching: true })
    const timer = window.setTimeout(() => {
      void searchKaraokeVideos(trimmed, source)
        .then((response) => {
          if (!cancelled) {
            setState({
              ...response,
              requestKey,
              isSearching: false,
              error: null,
            })
          }
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            setState({
              ...EMPTY_SEARCH,
              requestKey,
              error: error instanceof Error ? error.message : 'Search failed',
            })
          }
        })
    }, DEBOUNCE_MS)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [trimmed, source, requestKey, tooShort])

  // Do not leave old-source results clickable during a source or query change.
  if (tooShort) return EMPTY_SEARCH
  if (state.requestKey !== requestKey) {
    return { ...EMPTY_SEARCH, requestKey, isSearching: true }
  }
  return state
}
