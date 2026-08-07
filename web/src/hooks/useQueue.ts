import { useEffect, useState } from 'react'

import { subscribeToQueue } from '@/firebase/queue'
import type { QueueItem } from '@/types/queue'

export function useQueue(roomId: string | undefined) {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!roomId) {
      setQueue([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const unsubscribe = subscribeToQueue(
      roomId,
      (items) => {
        setQueue(items)
        setIsLoading(false)
      },
      (err) => {
        setError(err.message)
        setIsLoading(false)
      },
    )

    return unsubscribe
  }, [roomId])

  return { queue, isLoading, error }
}
