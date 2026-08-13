import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { joinRoomByCode } from '@/firebase/rooms'
import { useActiveRoom } from '@/hooks/useActiveRoom'
import { useAuth } from '@/hooks/useAuth'
import { normalizeRoomCode } from '@/lib/room-code'

export function JoinRoomPage() {
  const { roomCode: paramCode } = useParams()
  const { user, isAuthenticated, isLoading } = useAuth()
  const {
    activeRoom,
    roomPath,
    setActiveRoom,
    isLoading: activeLoading,
  } = useActiveRoom()
  const navigate = useNavigate()
  const [code, setCode] = useState((paramCode ?? '').toUpperCase())
  const [error, setError] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  const joiningSameActiveRoom =
    Boolean(activeRoom) &&
    Boolean(paramCode) &&
    normalizeRoomCode(paramCode ?? '') === activeRoom?.roomCode

  useEffect(() => {
    if (!paramCode || !user || isLoading || activeLoading) return
    if (activeRoom && !joiningSameActiveRoom) return

    let cancelled = false

    async function autoJoin() {
      setIsJoining(true)
      setError('')
      try {
        const room = await joinRoomByCode(paramCode!, user!)
        if (!cancelled) {
          setActiveRoom({
            roomId: room.id,
            roomCode: room.roomCode,
            name: room.name,
            role: room.hostUserId === user!.uid ? 'host' : 'guest',
          })
          toast.success(`Joined ${room.name}`)
          navigate(
            room.hostUserId === user!.uid
              ? `/room/${room.id}/host`
              : `/room/${room.id}`,
            { replace: true },
          )
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to join room')
          setIsJoining(false)
        }
      }
    }

    void autoJoin()

    return () => {
      cancelled = true
    }
  }, [
    paramCode,
    user,
    isLoading,
    activeLoading,
    activeRoom,
    joiningSameActiveRoom,
    navigate,
    setActiveRoom,
  ])

  if (isLoading || activeLoading) {
    return (
      <div className="flex min-h-[50svh] items-center justify-center">
        <p className="text-sm text-body">Checking session…</p>
      </div>
    )
  }

  if (activeRoom && roomPath && !joiningSameActiveRoom) {
    return <Navigate to={roomPath} replace />
  }

  if (paramCode && isAuthenticated && isJoining && !error) {
    return (
      <div className="flex min-h-[50svh] items-center justify-center">
        <p className="text-sm text-body">Joining room…</p>
      </div>
    )
  }

  async function handleJoin(event: FormEvent) {
    event.preventDefault()
    const normalized = normalizeRoomCode(code)

    if (!normalized) {
      setError('Enter a room code.')
      return
    }

    if (!user) {
      setError('Sign in first to join a room.')
      return
    }

    if (normalized.length < 4) {
      setError('Room codes are usually 6 characters.')
      return
    }

    setIsJoining(true)
    setError('')

    try {
      const room = await joinRoomByCode(normalized, user)
      setActiveRoom({
        roomId: room.id,
        roomCode: room.roomCode,
        name: room.name,
        role: room.hostUserId === user.uid ? 'host' : 'guest',
      })
      toast.success(`Joined ${room.name}`)
      navigate(
        room.hostUserId === user.uid
          ? `/room/${room.id}/host`
          : `/room/${room.id}`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room')
      setIsJoining(false)
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10 md:px-8">
      <p className="eyebrow-mono text-mute">Join session</p>
      <h1 className="display-lg mt-2 text-ink-strong">Enter room code</h1>
      <p className="mt-3 text-body">
        Ask the host for the code on the TV, or scan their QR.
      </p>

      <form onSubmit={handleJoin} className="hairline-card mt-8 space-y-5 p-6">
        <div className="space-y-2">
          <Label htmlFor="room-code">Room code</Label>
          <Input
            id="room-code"
            value={code}
            onChange={(event) => {
              setCode(normalizeRoomCode(event.target.value))
              setError('')
            }}
            placeholder="K8P4DZ"
            className="h-12 bg-canvas-soft text-center font-mono text-lg tracking-[0.35em]"
            maxLength={8}
            autoFocus
            disabled={isJoining}
          />
        </div>

        {error ? (
          <p className="whitespace-pre-line text-sm text-destructive">{error}</p>
        ) : null}

        {!isAuthenticated ? (
          <div className="space-y-3">
            <p className="text-sm text-body">Sign in to join the room.</p>
            <GoogleSignInButton className="w-full" />
          </div>
        ) : (
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isJoining}
          >
            {isJoining ? 'Joining…' : 'Join room'}
          </Button>
        )}

        <Button type="button" variant="ghost" className="w-full" asChild>
          <Link to="/home">Back to home</Link>
        </Button>
      </form>
    </main>
  )
}
