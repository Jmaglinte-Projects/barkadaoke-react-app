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
      <section className="hairline-card p-4 md:p-6">
        <p className="eyebrow-mono text-mute">Now singing</p>
        <p className="mt-2 text-body">Waiting for the first song…</p>
      </section>
    )
  }

  return (
    <section className="hairline-card border-primary/40 p-4 md:p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="size-2 animate-pulse rounded-full bg-primary" />
          <p className="eyebrow-mono text-primary">Now singing</p>
        </div>
        {onToggleBookmark ? (
          <BookmarkButton
            saved={isSaved}
            disabled={bookmarkPending}
            onClick={onToggleBookmark}
          />
        ) : null}
      </div>
      <div className={`mt-3 flex items-center gap-3 ${compact ? '' : 'md:gap-4'}`}>
        <Avatar size={compact ? 'default' : 'lg'}>
          <AvatarImage src={song.singerPhotoURL} alt={song.singerName} />
          <AvatarFallback>
            {song.singerName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink-strong">
            {song.singerName}
          </p>
          <p className="truncate text-sm text-body">{song.title}</p>
        </div>
      </div>
    </section>
  )
}
