import { useEffect, useState } from 'react'

import { searchKaraokeVideos } from '@/firebase/youtube'
import type { SearchMode, SongSearchResult } from '@/types/youtube'

const DEBOUNCE_MS = 550

export function useYouTubeSearch(query: string) {
  const [results, setResults] = useState<SongSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usedFallback, setUsedFallback] = useState(false)
  const [searchMode, setSearchMode] = useState<SearchMode | 'mock' | null>(null)
  const [youtubeSearchSucceeded, setYoutubeSearchSucceeded] = useState(false)

  const trimmed = query.trim().replace(/\s+/g, ' ')

  useEffect(() => {
    if (trimmed.length < 2) {
      setResults([])
      setIsSearching(false)
      setError(null)
      setUsedFallback(false)
      setSearchMode(null)
      setYoutubeSearchSucceeded(false)
      return
    }

    let cancelled = false
    setIsSearching(true)
    setError(null)

    const timer = window.setTimeout(() => {
      void searchKaraokeVideos(trimmed)
        .then((response) => {
          if (cancelled) return
          setResults(response.results)
          setUsedFallback(response.usedFallback)
          setSearchMode(response.searchMode)
          setYoutubeSearchSucceeded(response.youtubeSearchSucceeded)
        })
        .catch((err: unknown) => {
          if (cancelled) return
          setResults([])
          setUsedFallback(false)
          setSearchMode(null)
          setYoutubeSearchSucceeded(false)
          setError(err instanceof Error ? err.message : 'Search failed')
        })
        .finally(() => {
          if (!cancelled) setIsSearching(false)
        })
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [trimmed])

  return {
    results,
    isSearching,
    error,
    usedFallback,
    searchMode,
    youtubeSearchSucceeded,
  }
}
