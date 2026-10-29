import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Bookmark, ListPlus, Search } from 'lucide-react'

import { SongSearch } from '@/components/search/SongSearch'
import { SavedSongsList } from '@/components/songs/SavedSongsList'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { savedSongToSearchResult } from '@/firebase/bookmarks'
import { useSavedSongs } from '@/hooks/useSavedSongs'
import { cn } from '@/lib/utils'
import { formatLimit } from '@/lib/room-limits'
import type { SongLimit } from '@/types/room'
import type { SavedSong } from '@/types/saved-song'
import type { SongSearchResult } from '@/types/youtube'

type HostAddSongsSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddSong: (song: SongSearchResult) => void | Promise<void>
  myUpcomingCount: number
  songLimit: SongLimit
  queueLimit: SongLimit
  roomUpcomingCount: number
  limitMessage: string | null
}

type AddTab = 'search' | 'saved'

export function HostAddSongsSheet({
  open,
  onOpenChange,
  onAddSong,
  myUpcomingCount,
  songLimit,
  queueLimit,
  roomUpcomingCount,
  limitMessage,
}: HostAddSongsSheetProps) {
  const titleId = useId()
  const searchPanelRef = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<AddTab>('search')
  const [isAddingSong, setIsAddingSong] = useState(false)
  const {
    songs: savedSongs,
    isLoading: savedLoading,
    pendingVideoId,
    toggleBookmark,
  } = useSavedSongs()

  const atLimit = Boolean(limitMessage)
  const addDisabled = atLimit || isAddingSong

  useEffect(() => {
    if (!open) {
      setTab('search')
      setIsAddingSong(false)
    }
  }, [open])

  useEffect(() => {
    if (!open || tab !== 'search') return
    const timer = window.setTimeout(() => {
      const input = searchPanelRef.current?.querySelector('input')
      input?.focus()
    }, 50)
    return () => window.clearTimeout(timer)
  }, [open, tab])

  async function handleAdd(song: SongSearchResult) {
    if (isAddingSong) return
    setIsAddingSong(true)
    try {
      await onAddSong(song)
    } finally {
      setIsAddingSong(false)
    }
  }

  async function handleAddSaved(song: SavedSong) {
    await handleAdd(savedSongToSearchResult(song))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton
        overlayClassName="bg-black/15 supports-backdrop-filter:bg-black/10 supports-backdrop-filter:backdrop-blur-none"
        className="w-full gap-0 overflow-hidden border-l border-border bg-background/90 p-0 shadow-xl backdrop-blur-sm sm:max-w-md md:max-w-lg"
        aria-labelledby={titleId}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          const input = searchPanelRef.current?.querySelector('input')
          input?.focus()
        }}
      >
        <SheetHeader className="border-b border-border px-5 py-5 pr-14">
          <SheetTitle id={titleId} className="text-lg font-semibold">
            Add songs
          </SheetTitle>
          <SheetDescription className="text-sm text-body">
            Search or queue from your saved list. Playback keeps running.
          </SheetDescription>
          <p className="mt-2 font-mono text-xs text-mute">
            Your upcoming: {myUpcomingCount}/{formatLimit(songLimit)}
            <span className="mt-1 block">
              Room queue: {roomUpcomingCount}/{formatLimit(queueLimit)}
            </span>
          </p>
        </SheetHeader>

        <div className="flex gap-1 border-b border-border px-3 pt-3">
          <TabButton
            active={tab === 'search'}
            onClick={() => setTab('search')}
            icon={<Search className="size-4" />}
            label="Search"
          />
          <TabButton
            active={tab === 'saved'}
            onClick={() => setTab('saved')}
            icon={<Bookmark className="size-4" />}
            label="Saved"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {atLimit ? (
            <p className="mb-4 rounded-md border border-border bg-canvas-soft px-3 py-2 text-sm text-body">
              {limitMessage}
            </p>
          ) : null}

          {tab === 'search' ? (
            <div ref={searchPanelRef}>
              <SongSearch
                onAddSong={handleAdd}
                disabled={addDisabled}
                isAdding={isAddingSong}
                autoFocus={open}
              />
            </div>
          ) : savedLoading ? (
            <p className="text-sm text-body">Loading saved songs…</p>
          ) : (
            <SavedSongsList
              songs={savedSongs}
              emptyLabel="No saved songs yet. Bookmark tracks from the queue anytime."
              addDisabled={addDisabled}
              isAdding={isAddingSong}
              pendingVideoId={pendingVideoId}
              onAddToQueue={(song) => {
                void handleAddSaved(song)
              }}
              onToggleSave={(song) => {
                void toggleBookmark(song)
              }}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function HostAddSongsFab({
  onClick,
  upcomingCount,
}: {
  onClick: () => void
  upcomingCount: number
}) {
  return (
    <Button
      type="button"
      size="sm"
      onClick={onClick}
      className="fixed right-3 bottom-3 z-40 h-10 gap-1.5 rounded-md px-3 text-sm shadow-[0_6px_20px_rgba(0,0,0,0.35)] lg:hidden"
    >
      <ListPlus className="size-4" />
      <span>Add</span>
      {upcomingCount > 0 ? (
        <span className="rounded border border-primary-foreground/30 px-1 py-0.5 font-mono text-[10px] leading-none">
          {upcomingCount}
        </span>
      ) : null}
    </Button>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex flex-1 items-center justify-center gap-2 rounded-t-md px-3 py-2.5 text-sm font-medium transition-colors',
        active
          ? 'bg-canvas-soft text-foreground'
          : 'text-mute hover:text-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  )
}
