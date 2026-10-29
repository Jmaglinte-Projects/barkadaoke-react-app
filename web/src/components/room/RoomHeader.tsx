import { Badge } from '@/components/ui/badge'
import type { KaraokeRoom } from '@/types/room'

type RoomHeaderProps = {
  room: KaraokeRoom
  showCode?: boolean
}

export function RoomHeader({ room, showCode = true }: RoomHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 md:px-6">
      <div className="min-w-0">
        <p className="eyebrow-mono text-mute">Room</p>
        <h1 className="display-sm truncate text-ink-strong">{room.name}</h1>
      </div>

      <div className="flex items-center gap-2">
        <Badge
          variant={room.status === 'active' ? 'default' : 'outline'}
          className="rounded-full"
        >
          {room.status}
        </Badge>
        {showCode ? (
          <div className="rounded-md border border-border bg-canvas-soft px-3 py-1.5 font-mono text-sm tracking-widest text-ink-strong">
            {room.roomCode}
          </div>
        ) : null}
      </div>
    </div>
  )
}
