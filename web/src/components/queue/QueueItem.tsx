import { Trash2 } from 'lucide-react'

import { BookmarkButton } from '@/components/songs/BookmarkButton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { QueueItem as QueueItemType } from '@/types/queue'

type QueueItemProps = {
  item: QueueItemType
  index: number
  canRemove?: boolean
  onRemove?: (id: string) => void
  isSaved?: boolean
  bookmarkPending?: boolean
  onToggleBookmark?: (item: QueueItemType) => void
}

export function QueueItemRow({
  item,
  index,
  canRemove = false,
  onRemove,
  isSaved = false,
  bookmarkPending = false,
  onToggleBookmark,
}: QueueItemProps) {
  return (
    <li className="flex items-center gap-3 border-b border-border py-3 last:border-b-0">
      <span className="w-6 shrink-0 font-mono text-sm text-mute">{index}</span>
      <img
        src={item.thumbnailUrl}
        alt=""
        className="size-12 shrink-0 rounded-sm object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {item.title}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <Avatar size="sm">
            <AvatarImage src={item.singerPhotoURL} alt={item.singerName} />
            <AvatarFallback>
              {item.singerName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-xs text-body">{item.singerName}</span>
          {item.status === 'playing' ? (
            <Badge className="rounded-full">Playing</Badge>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {onToggleBookmark ? (
          <BookmarkButton
            saved={isSaved}
            disabled={bookmarkPending}
            onClick={() => onToggleBookmark(item)}
          />
        ) : null}
        {canRemove ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Remove song"
            onClick={() => onRemove?.(item.id)}
          >
            <Trash2 className="size-4 text-mute" />
          </Button>
        ) : null}
      </div>
    </li>
  )
}
