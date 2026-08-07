import { useEffect, useState } from 'react'

import { subscribeToRoomMembers } from '@/firebase/rooms'
import type { RoomMember } from '@/types/room'

export function useRoomMembers(roomId: string | undefined) {
  const [members, setMembers] = useState<RoomMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!roomId) {
      setMembers([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const unsubscribe = subscribeToRoomMembers(
      roomId,
      (nextMembers) => {
        setMembers(nextMembers)
        setIsLoading(false)
      },
      (err) => {
        setError(err.message)
        setIsLoading(false)
      },
    )

    return unsubscribe
  }, [roomId])

  return { members, isLoading, error }
}
