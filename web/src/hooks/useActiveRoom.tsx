import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { findActiveHostedRoom, getRoom } from '@/firebase/rooms'
import { useAuth } from '@/hooks/useAuth'

export type ActiveRoomSession = {
  roomId: string
  roomCode: string
  name: string
  role: 'host' | 'guest'
}

type ActiveRoomContextValue = {
  activeRoom: ActiveRoomSession | null
  isLoading: boolean
  setActiveRoom: (session: ActiveRoomSession) => void
  clearActiveRoom: () => void
  roomPath: string | null
}

const STORAGE_KEY = 'barkadaoke.activeRoom'
const ActiveRoomContext = createContext<ActiveRoomContextValue | null>(null)

function readStoredSession(uid: string): ActiveRoomSession | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}.${uid}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ActiveRoomSession
    if (!parsed?.roomId || !parsed?.roomCode) return null
    return parsed
  } catch {
    return null
  }
}

function writeStoredSession(uid: string, session: ActiveRoomSession | null) {
  try {
    const key = `${STORAGE_KEY}.${uid}`
    if (!session) {
      localStorage.removeItem(key)
      return
    }
    localStorage.setItem(key, JSON.stringify(session))
  } catch {
    // ignore private mode failures
  }
}

export function ActiveRoomProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth()
  const [activeRoom, setActiveRoomState] = useState<ActiveRoomSession | null>(
    null,
  )
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setActiveRoomState(null)
      setIsLoading(false)
      return
    }

    let cancelled = false

    async function hydrate() {
      setIsLoading(true)
      const stored = readStoredSession(user!.uid)

      try {
        if (stored) {
          const room = await getRoom(stored.roomId)
          if (cancelled) return

          if (room && room.status !== 'ended') {
            const nextSession: ActiveRoomSession = {
              roomId: room.id,
              roomCode: room.roomCode,
              name: room.name,
              role: room.hostUserId === user!.uid ? 'host' : stored.role,
            }
            writeStoredSession(user!.uid, nextSession)
            setActiveRoomState(nextSession)
            return
          }

          writeStoredSession(user!.uid, null)
        }

        // Local session can be cleared while Firestore still has an
        // active hosted room (e.g. playback sync revived status after end).
        const hosted = await findActiveHostedRoom(user!.uid)
        if (cancelled) return

        if (hosted) {
          const nextSession: ActiveRoomSession = {
            roomId: hosted.id,
            roomCode: hosted.roomCode,
            name: hosted.name,
            role: 'host',
          }
          writeStoredSession(user!.uid, nextSession)
          setActiveRoomState(nextSession)
        } else {
          writeStoredSession(user!.uid, null)
          setActiveRoomState(null)
        }
      } catch {
        if (!cancelled) setActiveRoomState(stored)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void hydrate()

    return () => {
      cancelled = true
    }
  }, [user, authLoading])

  const setActiveRoom = useCallback(
    (session: ActiveRoomSession) => {
      if (!user) return
      writeStoredSession(user.uid, session)
      setActiveRoomState(session)
    },
    [user],
  )

  const clearActiveRoom = useCallback(() => {
    if (user) writeStoredSession(user.uid, null)
    setActiveRoomState(null)
  }, [user])

  const roomPath = useMemo(() => {
    if (!activeRoom) return null
    return activeRoom.role === 'host'
      ? `/room/${activeRoom.roomId}/host`
      : `/room/${activeRoom.roomId}`
  }, [activeRoom])

  const value = useMemo(
    () => ({
      activeRoom,
      isLoading,
      setActiveRoom,
      clearActiveRoom,
      roomPath,
    }),
    [activeRoom, isLoading, setActiveRoom, clearActiveRoom, roomPath],
  )

  return (
    <ActiveRoomContext.Provider value={value}>
      {children}
    </ActiveRoomContext.Provider>
  )
}

export function useActiveRoom() {
  const context = useContext(ActiveRoomContext)
  if (!context) {
    throw new Error('useActiveRoom must be used within ActiveRoomProvider')
  }
  return context
}
