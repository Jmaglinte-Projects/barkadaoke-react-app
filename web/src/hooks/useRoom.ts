import { useEffect, useState } from 'react'

import { subscribeToRoom } from '@/firebase/rooms'
import type { KaraokeRoom } from '@/types/room'

export function useRoom(roomId: string | undefined) {
  const [room, setRoom] = useState<KaraokeRoom | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!roomId) {
      setRoom(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const unsubscribe = subscribeToRoom(
      roomId,
      (nextRoom) => {
        setRoom(nextRoom)
        setIsLoading(false)
      },
      (err) => {
        setError(err.message)
        setIsLoading(false)
      },
    )

    return unsubscribe
  }, [roomId])

  return { room, isLoading, error }
}
