import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'

import { SongSearchResultRow } from '@/components/search/SongSearchResult'
import { Input } from '@/components/ui/input'
import { useYouTubeSearch } from '@/hooks/useYouTubeSearch'
import type { SongSearchResult } from '@/types/youtube'

type SongSearchProps = {
  onAddSong: (result: SongSearchResult) => void
  disabled?: boolean
  autoFocus?: boolean
}

export function SongSearch({
  onAddSong,
  disabled = false,
  autoFocus = false,
}: SongSearchProps) {
  const [query, setQuery] = useState('')
  const fieldRef = useRef<HTMLDivElement>(null)
  const { results, isSearching, error, usedFallback, searchMode } =
    useYouTubeSearch(query)

  useEffect(() => {
    if (!autoFocus || disabled) return
    const timer = window.setTimeout(() => {
      fieldRef.current?.querySelector('input')?.focus()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [autoFocus, disabled])

  return (
    <div className="space-y-4">
      <div ref={fieldRef} className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mute" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search karaoke songs…"
          className="h-11 bg-canvas-soft pl-10"
          disabled={disabled}
          autoFocus={autoFocus}
        />
      </div>

      {usedFallback && query.trim() ? (
        <p className="text-xs text-mute">
          Showing demo results — deploy the `searchVideos` Cloud Function for
          live YouTube search.
        </p>
      ) : null}

      {!usedFallback && searchMode === 'catalog-fallback' && query.trim() ? (
        <p className="text-xs text-mute">
          Showing songs already available in Barkadaoke.
        </p>
      ) : null}

      {query.trim() ? (
        <div className="hairline-card px-4">
          {isSearching ? (
            <p className="py-6 text-center text-sm text-body">Searching…</p>
          ) : error ? (
            <p className="py-6 text-center text-sm text-destructive">{error}</p>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-sm text-body">No results found.</p>
          ) : (
            <ul>
              {results.map((result) => (
                <SongSearchResultRow
                  key={result.videoId}
                  result={result}
                  onAdd={onAddSong}
                  disabled={disabled}
                />
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="hairline-card p-6 text-center">
          <p className="text-sm text-body">
            Search for a song — we&apos;ll append &quot;karaoke&quot; for you.
          </p>
        </div>
      )}
    </div>
  )
}
