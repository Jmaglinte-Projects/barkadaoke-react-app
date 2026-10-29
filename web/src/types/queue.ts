export type QueueItemStatus =
  | 'queued'
  | 'playing'
  | 'completed'
  | 'skipped'
  | 'removed'

export type QueueItem = {
  id: string
  youtubeVideoId: string
  title: string
  thumbnailUrl: string
  singerUserId: string
  singerName: string
  singerPhotoURL?: string
  status: QueueItemStatus
  order: number
  createdAt: string
  startedAt?: string
  completedAt?: string
}
