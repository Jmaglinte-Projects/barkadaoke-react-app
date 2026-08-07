import { QueueItemRow } from '@/components/queue/QueueItem'
import type { QueueItem } from '@/types/queue'

type QueueListProps = {
  items: QueueItem[]
  canRemoveAny?: boolean
  currentUserId?: string
  onRemove?: (id: string) => void
  emptyLabel?: string
  isSaved?: (videoId: string) => boolean
  pendingVideoId?: string | null
  onToggleBookmark?: (item: QueueItem) => void
}

export function QueueList({
  items,
  canRemoveAny = false,
  currentUserId,
  onRemove,
  emptyLabel = 'No songs in the queue yet.',
  isSaved,
  pendingVideoId = null,
  onToggleBookmark,
}: QueueListProps) {
  if (items.length === 0) {
    return (
      <div className="hairline-card p-6 text-center">
        <p className="text-sm text-body">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <div className="hairline-card px-4">
      <ul>
        {items.map((item, index) => (
          <QueueItemRow
            key={item.id}
            item={item}
            index={index + 1}
            canRemove={
              canRemoveAny ||
              (Boolean(currentUserId) && item.singerUserId === currentUserId)
            }
            onRemove={onRemove}
            isSaved={isSaved?.(item.youtubeVideoId)}
            bookmarkPending={pendingVideoId === item.youtubeVideoId}
            onToggleBookmark={onToggleBookmark}
          />
        ))}
      </ul>
    </div>
  )
}
