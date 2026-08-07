import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { QueueItem } from '@/types/queue'

type NextSingerProps = {
  song: QueueItem | null
}

export function NextSinger({ song }: NextSingerProps) {
  if (!song) {
    return (
      <section className="hairline-card min-w-0 p-4">
        <p className="eyebrow-mono text-mute">Next</p>
        <p className="mt-2 text-sm text-body">Queue is empty</p>
      </section>
    )
  }

  return (
    <section className="hairline-card min-w-0 p-4">
      <p className="eyebrow-mono text-mute">Next</p>
      <div className="mt-3 flex items-start gap-3">
        <Avatar size="sm" className="shrink-0">
          <AvatarImage src={song.singerPhotoURL} alt={song.singerName} />
          <AvatarFallback>
            {song.singerName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-semibold text-foreground">
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
