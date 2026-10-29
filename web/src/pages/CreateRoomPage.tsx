import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createRoom } from '@/firebase/rooms'
import { useActiveRoom } from '@/hooks/useActiveRoom'
import { useAuth } from '@/hooks/useAuth'

export function CreateRoomPage() {
  const { user } = useAuth()
  const { activeRoom, roomPath, setActiveRoom, isLoading } = useActiveRoom()
  const navigate = useNavigate()
  const [name, setName] = useState('Friday Night Karaoke')
  const [isCreating, setIsCreating] = useState(false)

  if (isLoading) {
    return (
      <div className="flex min-h-[50svh] items-center justify-center">
        <p className="text-sm text-body">Loading…</p>
      </div>
    )
  }

  if (activeRoom && roomPath) {
    return <Navigate to={roomPath} replace />
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    if (!user) return

    setIsCreating(true)
    try {
      const room = await createRoom(user, name)
      setActiveRoom({
        roomId: room.id,
        roomCode: room.roomCode,
        name: room.name,
        role: 'host',
      })
      toast.success(`Room created — code ${room.roomCode}`)
      navigate(`/room/${room.id}/host`)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create room',
      )
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10 md:px-8">
      <p className="eyebrow-mono text-mute">New session</p>
      <h1 className="display-lg mt-2 text-ink-strong">Create a room</h1>
      <p className="mt-3 text-body">
        You&apos;ll get a short room code and QR guests can scan to join.
      </p>

      <form
        onSubmit={handleCreate}
        className="hairline-card mt-8 space-y-5 p-6"
      >
        <div className="space-y-2">
          <Label htmlFor="room-name">Room name</Label>
          <Input
            id="room-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Birthday karaoke"
            className="h-11 bg-canvas-soft"
            autoFocus
            disabled={isCreating}
          />
        </div>

        <div className="rounded-md border border-dashed border-border bg-canvas-soft p-4 text-sm text-body">
          Host controls stay on this device. Guests search and queue from their
          phones. Start with an unlimited queue, 3 waiting songs per person, and
          space for 5 people including you. Adjust these anytime in Room
          settings. You can only host one active room at a time.
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            size="lg"
            className="flex-1"
            disabled={isCreating}
          >
            {isCreating ? 'Creating…' : 'Create & open host'}
          </Button>
          <Button type="button" variant="outline" size="lg" asChild>
            <Link to="/home">Cancel</Link>
          </Button>
        </div>
      </form>
    </main>
  )
}
