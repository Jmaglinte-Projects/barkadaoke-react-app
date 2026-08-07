import { Link } from 'react-router-dom'
import { Bookmark } from 'lucide-react'

import { AppNav } from '@/components/layout/AppNav'
import { SavedSongsList } from '@/components/songs/SavedSongsList'
import { Button } from '@/components/ui/button'
import { useActiveRoom } from '@/hooks/useActiveRoom'
import { useAuth } from '@/hooks/useAuth'
import { useSavedSongs } from '@/hooks/useSavedSongs'

export function SavedSongsPage() {
  const { user } = useAuth()
  const { activeRoom, roomPath } = useActiveRoom()
  const {
    songs,
    isLoading,
    error,
    pendingVideoId,
    toggleBookmark,
  } = useSavedSongs()

  if (!user) {
    return null
  }

  return (
    <div className="min-h-svh bg-background">
      <AppNav />
      <main className="mx-auto max-w-lg px-4 py-8 md:max-w-2xl md:px-8">
        <div className="flex items-start gap-3">
          <span className="mt-1 flex size-9 items-center justify-center rounded-md border border-border text-primary">
            <Bookmark className="size-4" />
          </span>
          <div>
            <p className="eyebrow-mono text-mute">Your collection</p>
            <h1 className="display-sm mt-1 text-ink-strong">Saved songs</h1>
            <p className="mt-2 text-sm text-body">
              Bookmarks stay with your account across rooms. Join a room to add
              them to the queue.
            </p>
          </div>
        </div>

        {activeRoom && roomPath ? (
          <div className="hairline-card mt-6 flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-body">
              You&apos;re in{' '}
              <span className="font-mono text-ink-strong">
                {activeRoom.roomCode}
              </span>
              . Open the room&apos;s Saved tab to queue these.
            </p>
            <Button asChild size="sm">
              <Link to={roomPath}>Back to room</Link>
            </Button>
          </div>
        ) : null}

        <div className="mt-6">
          {isLoading ? (
            <p className="text-sm text-body">Loading saved songs…</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <SavedSongsList
              songs={songs}
              emptyLabel="Save a song from Now Playing or the queue during a karaoke night."
              pendingVideoId={pendingVideoId}
              onToggleSave={(song) => {
                void toggleBookmark(song)
              }}
            />
          )}
        </div>
      </main>
    </div>
  )
}
