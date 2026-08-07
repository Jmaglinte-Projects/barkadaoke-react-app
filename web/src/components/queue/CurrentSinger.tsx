import { BookmarkButton } from '@/components/songs/BookmarkButton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { QueueItem } from '@/types/queue'

type CurrentSingerProps = {
  song: QueueItem | null
  compact?: boolean
  isSaved?: boolean
  bookmarkPending?: boolean
  onToggleBookmark?: () => void
}

export function CurrentSinger({
  song,
  compact = false,
  isSaved = false,
  bookmarkPending = false,
  onToggleBookmark,
}: CurrentSingerProps) {
  if (!song) {
    return (
      <section className="hairline-card min-w-0 p-4 md:p-6">
        <p className="eyebrow-mono text-mute">Now singing</p>
        <p className="mt-2 text-body">Waiting for the first song…</p>
      </section>
    )
  }

  return (
    <section className="hairline-card min-w-0 border-primary/40 p-4 md:p-6">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="size-2 shrink-0 animate-pulse rounded-full bg-primary" />
          <p className="eyebrow-mono text-primary">Now singing</p>
        </div>
        {onToggleBookmark ? (
          <BookmarkButton
            saved={isSaved}
            disabled={bookmarkPending}
            onClick={onToggleBookmark}
            className="shrink-0"
          />
        ) : null}
      </div>
      <div
        className={`mt-3 flex items-start gap-3 ${compact ? '' : 'md:gap-4'}`}
      >
        <Avatar size={compact ? 'default' : 'lg'} className="shrink-0">
          <AvatarImage src={song.singerPhotoURL} alt={song.singerName} />
          <AvatarFallback>
            {song.singerName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="break-words font-semibold text-ink-strong">
            {song.singerName}
          </p>
          <p className="mt-0.5 line-clamp-2 break-words text-sm text-body">
            {song.title}
          </p>
        </div>
      </div>
    </section>
  )
}
