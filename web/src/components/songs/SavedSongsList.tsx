import { ListPlus } from 'lucide-react'

import { BookmarkButton } from '@/components/songs/BookmarkButton'
import { BusyOverlay } from '@/components/ui/busy-overlay'
import { Button } from '@/components/ui/button'
import type { SavedSong } from '@/types/saved-song'

type SavedSongsListProps = {
  songs: SavedSong[]
  emptyLabel?: string
  addDisabled?: boolean
  isAdding?: boolean
  onAddToQueue?: (song: SavedSong) => void
  onToggleSave?: (song: SavedSong) => void
  pendingVideoId?: string | null
}

export function SavedSongsList({
  songs,
  emptyLabel = 'No saved songs yet.',
  addDisabled = false,
  isAdding = false,
  onAddToQueue,
  onToggleSave,
  pendingVideoId = null,
}: SavedSongsListProps) {
  if (songs.length === 0) {
    return (
      <div className="hairline-card p-6 text-center">
        <p className="text-sm text-body">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {isAdding ? <BusyOverlay label="Adding to queue…" /> : null}
      <div className="hairline-card px-4">
        <ul>
          {songs.map((song) => {
            const busy = pendingVideoId === song.videoId
            return (
              <li
                key={song.videoId}
                className="flex items-center gap-3 border-b border-border py-3 last:border-b-0"
              >
                <img
                  src={song.thumbnailUrl}
                  alt=""
                  className="size-12 shrink-0 rounded-sm object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {song.title}
                  </p>
                  {song.channelTitle ? (
                    <p className="mt-0.5 truncate text-xs text-mute">
                      {song.channelTitle}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {onAddToQueue ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={addDisabled || busy}
                      onClick={() => onAddToQueue(song)}
                    >
                      <ListPlus className="size-3.5" />
                      Queue
                    </Button>
                  ) : null}
                  {onToggleSave ? (
                    <BookmarkButton
                      saved
                      disabled={busy}
                      onClick={() => onToggleSave(song)}
                    />
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
