import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { QueueItem } from '@/types/queue'

type NextSingerProps = {
  song: QueueItem | null
}

export function NextSinger({ song }: NextSingerProps) {
  if (!song) {
    return (
      <section className="hairline-card p-4">
        <p className="eyebrow-mono text-mute">Next</p>
        <p className="mt-2 text-sm text-body">Queue is empty</p>
      </section>
    )
  }

  return (
    <section className="hairline-card p-4">
      <p className="eyebrow-mono text-mute">Next</p>
      <div className="mt-3 flex items-center gap-3">
        <Avatar size="sm">
          <AvatarImage src={song.singerPhotoURL} alt={song.singerName} />
          <AvatarFallback>
            {song.singerName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {song.singerName}
          </p>
          <p className="truncate text-sm text-body">{song.title}</p>
        </div>
      </div>
    </section>
  )
}
