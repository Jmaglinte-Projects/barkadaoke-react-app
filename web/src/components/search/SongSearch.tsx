import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'

import { SongSearchResultRow } from '@/components/search/SongSearchResult'
import { BusyOverlay } from '@/components/ui/busy-overlay'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useYouTubeSearch } from '@/hooks/useYouTubeSearch'
import type { SearchSource, SongSearchResult } from '@/types/youtube'

const SEARCH_SOURCES: { value: SearchSource; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'catalog', label: 'Barkadaoke Library' },
  { value: 'youtube', label: 'YouTube' },
]

const SOURCE_HELP: Record<SearchSource, string> = {
  auto: 'Search the library first, then YouTube when more results are needed.',
  catalog: 'Search songs already in Barkadaoke. Uses no YouTube search quota.',
  youtube: 'Find more karaoke videos on YouTube. Uses YouTube search quota.',
}

type SongSearchProps = {
  onAddSong: (result: SongSearchResult) => void
  disabled?: boolean
  isAdding?: boolean
  autoFocus?: boolean
}

export function SongSearch({
  onAddSong,
  disabled = false,
  isAdding = false,
  autoFocus = false,
}: SongSearchProps) {
  const [query, setQuery] = useState('')
  const [source, setSource] = useState<SearchSource>('auto')
  const fieldRef = useRef<HTMLDivElement>(null)
  const {
    results,
    isSearching,
    error,
    usedFallback,
    searchMode,
    fallbackReason,
  } = useYouTubeSearch(query, source)
  const browsing = !query.trim()
  const libraryResults =
    searchMode === 'catalog' || searchMode === 'catalog-fallback'
  const status = usedFallback
    ? 'Showing demo results. Live search is not connected in this development session.'
    : fallbackReason === 'quota-exceeded'
      ? 'YouTube search limit reached. Searching Barkadaoke Library. YouTube will be retried automatically later.'
      : fallbackReason === 'not-configured'
        ? 'YouTube search is not configured. Searching Barkadaoke Library.'
        : fallbackReason === 'youtube-unavailable'
          ? 'YouTube search is temporarily unavailable. Searching Barkadaoke Library.'
          : browsing
            ? 'Popular songs in Barkadaoke Library. Enter a title or artist to search.'
            : libraryResults
              ? 'Showing results from Barkadaoke Library.'
              : searchMode === 'catalog+youtube'
                ? 'Showing library and YouTube results.'
                : 'Showing YouTube results.'

  useEffect(() => {
    if (!autoFocus || isAdding) return
    const timer = window.setTimeout(() => {
      fieldRef.current?.querySelector('input')?.focus()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [autoFocus, isAdding])

  return (
    <div className="relative space-y-4">
      {isAdding ? <BusyOverlay label="Adding to queue…" /> : null}
      <div className="space-y-2">
        <div
          role="group"
          aria-label="Search source"
          className="grid grid-cols-[0.7fr_1.6fr_1fr] gap-1 rounded-md border border-border bg-canvas-soft p-1"
        >
          {SEARCH_SOURCES.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={source === option.value ? 'default' : 'ghost'}
              className="min-h-11 min-w-0 whitespace-normal px-1 text-sm leading-tight"
              aria-pressed={source === option.value}
              disabled={isAdding}
              onClick={() => setSource(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <p className="text-xs text-mute">{SOURCE_HELP[source]}</p>
      </div>
      <div ref={fieldRef} className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mute" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            source === 'catalog'
              ? 'Search Barkadaoke Library…'
              : 'Search karaoke songs…'
          }
          className="h-11 bg-canvas-soft pl-10"
          maxLength={200}
          disabled={isAdding}
          autoFocus={autoFocus}
        />
      </div>
      <div aria-live="polite" aria-busy={isSearching} className="space-y-3">
        {!isSearching && !error && query.trim().length !== 1 ? (
          <p className="text-sm text-body" role="status">
            {status}
          </p>
        ) : null}
        <div className="hairline-card px-4">
          {isSearching ? (
            <p className="py-6 text-center text-sm text-body">
              {browsing ? 'Loading library…' : 'Searching…'}
            </p>
          ) : error ? (
            <p className="py-6 text-center text-sm text-destructive">{error}</p>
          ) : query.trim().length === 1 ? (
            <p className="py-6 text-center text-sm text-body">
              Enter at least 2 characters to search.
            </p>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-sm text-body">
              {browsing
                ? 'No songs in the library yet. Search YouTube when available to find your first song.'
                : libraryResults
                  ? 'No matching songs in Barkadaoke Library. Try another title or artist.'
                  : 'No matching karaoke videos found on YouTube.'}
            </p>
          ) : (
            <ul>
              {results.map((result) => (
                <SongSearchResultRow
                  key={result.videoId}
                  result={result}
                  onAdd={onAddSong}
                  disabled={disabled || isAdding}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
