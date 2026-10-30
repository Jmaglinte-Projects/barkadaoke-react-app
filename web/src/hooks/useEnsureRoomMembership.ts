import { useEffect, useState } from 'react'

import { joinRoom } from '@/firebase/rooms'
import type { UserProfile } from '@/types/user'

export function useEnsureRoomMembership(
  roomId: string | undefined,
  user: UserProfile | null,
) {
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uid = user?.uid

  useEffect(() => {
    if (!roomId || !uid) return

    let cancelled = false

    async function ensure() {
      setIsJoining(true)
      setError(null)
      try {
        await joinRoom(roomId!, { uid: uid! })
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to join room')
        }
      } finally {
        if (!cancelled) setIsJoining(false)
      }
    }

    void ensure()

    return () => {
      cancelled = true
    }
  }, [roomId, uid])

  return { isJoining, error }
}
