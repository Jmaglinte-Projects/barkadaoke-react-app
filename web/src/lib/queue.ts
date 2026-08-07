import type { QueueItem } from '@/types/queue'

export function getUpcomingQueue(queue: QueueItem[]) {
  return queue
    .filter((item) => item.status === 'queued')
    .sort((a, b) => a.order - b.order)
}

export function getCurrentSong(queue: QueueItem[], currentId: string | null) {
  if (!currentId) return null
  return queue.find((item) => item.id === currentId) ?? null
}

export function getNextSong(queue: QueueItem[]) {
  return getUpcomingQueue(queue)[0] ?? null
}

export function getVisibleQueue(queue: QueueItem[]) {
  return queue
    .filter((item) => item.status === 'queued' || item.status === 'playing')
    .sort((a, b) => a.order - b.order)
}
