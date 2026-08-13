import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { RemoteControls } from '@/components/player/RemoteControls'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { issuePlaybackCommand } from '@/firebase/rooms'
import { useActiveRoom } from '@/hooks/useActiveRoom'
import { useAuth } from '@/hooks/useAuth'
import { useEnsureRoomMembership } from '@/hooks/useEnsureRoomMembership'
import { useQueue } from '@/hooks/useQueue'
import { useRoom } from '@/hooks/useRoom'
import { useRoomMembers } from '@/hooks/useRoomMembers'
import {
  canControlPlayback,
  getMemberRole,
  getPlayerConnectionStatus,
  isPlayerOnline,
} from '@/lib/playback'
import {
  getCurrentSong,
  getNextSong,
  getUpcomingQueue,
} from '@/lib/queue'
import { cn } from '@/lib/utils'
import type { PlaybackCommandType } from '@/types/room'
import type { PlaybackState } from '@/types/youtube'

function playbackLabel(state: PlaybackState): string {
  switch (state) {
    case 'playing':
      return 'Playing'
    case 'paused':
      return 'Paused'
    case 'ready':
      return 'Ready'
    case 'ended':
      return 'Ended'
    case 'autoplay_blocked':
      return 'Needs play'
    case 'error':
      return 'Error'
    default:
      return 'Idle'
  }
}

export function RemoteControlPage() {
  const { roomId } = useParams()
  const { user } = useAuth()
  const { setActiveRoom, clearActiveRoom } = useActiveRoom()
  const [pendingCommand, setPendingCommand] =
    useState<PlaybackCommandType | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const { isJoining, error: joinError } = useEnsureRoomMembership(roomId, user)
  const { room, isLoading: roomLoading, error: roomError } = useRoom(roomId)
  const { members } = useRoomMembers(roomId)
  const { queue } = useQueue(roomId)

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 5_000)
    return () => window.clearInterval(id)
  }, [])

  const memberRole = getMemberRole(user?.uid, room, members)
  useEffect(() => {
    if (!room || !user) return
    if (room.status === 'ended') {
      clearActiveRoom()
      return
    }
    // Don't default a missing role to "guest" — that can re-bind the
    // session after the member doc is removed (e.g. leave from another tab).
    if (!memberRole) return

    setActiveRoom({
      roomId: room.id,
      roomCode: room.roomCode,
      name: room.name,
      role:
        memberRole === 'host'
          ? 'host'
          : memberRole === 'controller'
            ? 'controller'
            : 'guest',
    })
  }, [
    room?.id,
    room?.roomCode,
    room?.name,
    room?.status,
    memberRole,
    user,
    setActiveRoom,
    clearActiveRoom,
  ])

  const current = useMemo(
    () => getCurrentSong(queue, room?.currentQueueItemId ?? null),
    [queue, room?.currentQueueItemId],
  )
  const upcoming = useMemo(() => getUpcomingQueue(queue), [queue])
  const next = useMemo(() => getNextSong(queue), [queue])
  const isController = canControlPlayback(user?.uid, room, members)
  const playerOnline = isPlayerOnline(room?.playerLastSeenAt, nowMs)
  const connectionStatus = getPlayerConnectionStatus(
    room?.playerLastSeenAt,
    nowMs,
  )
  const connectionLabel =
    connectionStatus === 'connected'
      ? 'Connected'
      : connectionStatus === 'reconnecting'
        ? 'Reconnecting'
        : 'Player offline'

  const latestCommandType = room?.playbackCommand?.type ?? null
  // Clear pending once room state reflects the command outcome.
  useEffect(() => {
    if (!pendingCommand || latestCommandType !== pendingCommand) return
    const timeout = window.setTimeout(() => setPendingCommand(null), 400)
    return () => window.clearTimeout(timeout)
  }, [pendingCommand, latestCommandType])

  if (!user) {
    return null
  }

  if (isJoining || roomLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-sm text-body">Loading remote…</p>
      </div>
    )
  }

  if (joinError || roomError || !room) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background px-4">
        <p className="whitespace-pre-line text-center text-sm text-destructive">
          {joinError || roomError || 'Room not found.'}
        </p>
        <Button asChild variant="outline">
          <Link to="/home">Back to home</Link>
        </Button>
      </div>
    )
  }

  if (room.status === 'ended') {
    return <Navigate to="/home" replace />
  }

  if (!isController) {
    return <Navigate to={`/room/${room.id}`} replace />
  }

  const isHost = room.hostUserId === user.uid

  async function handleCommand(type: PlaybackCommandType) {
    if (!roomId || !user) return
    if (!playerOnline) {
      toast.message('No player connected — keep the host player view open on the TV/desktop')
      return
    }
    setPendingCommand(type)
    try {
      await issuePlaybackCommand(roomId, type, user.uid)
    } catch (error) {
      setPendingCommand(null)
      const message =
        error instanceof Error ? error.message : 'Could not send command'
      toast.error(
        /permission|insufficient/i.test(message)
          ? 'Playback permission denied. Ask the host to set your role to Controller.'
          : message,
      )
    }
  }

  return (
    <div>
      <header className="border-b border-border px-4 py-4">
        <div className="mx-auto flex max-w-lg flex-col gap-3 lg:px-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow-mono text-primary">Barkadaoke</p>
              <h1 className="mt-1 truncate text-xl font-semibold text-ink-strong">
                {room.name}
              </h1>
              <p className="mt-1 font-mono text-sm tracking-widest text-body">
                {room.roomCode}
              </p>
            </div>
            <Badge
              variant={
                connectionStatus === 'connected' ? 'default' : 'outline'
              }
              className="shrink-0 rounded-full"
            >
              <span
                className={cn(
                  'mr-1.5 inline-block size-1.5 rounded-full',
                  connectionStatus === 'connected'
                    ? 'bg-primary-foreground'
                    : connectionStatus === 'reconnecting'
                      ? 'animate-pulse bg-primary'
                      : 'bg-mute',
                )}
              />
              {connectionLabel}
            </Badge>
          </div>
          <p className="text-xs text-mute">Remote control — no video on this device</p>
        </div>
      </header>

      <main className="mx-auto flex max-w-lg flex-col gap-5 px-4 py-5 pb-10">
        <section className="hairline-card border-primary/40 p-4">
          <div className="flex items-center gap-2">
            <span className="size-2 animate-pulse rounded-full bg-primary" />
            <p className="eyebrow-mono text-primary">Now singing</p>
          </div>

          {current ? (
            <div className="mt-3 flex gap-3">
              <img
                src={current.thumbnailUrl}
                alt=""
                className="size-16 shrink-0 rounded-md object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 font-semibold text-ink-strong">
                  {current.title}
                </p>
                <p className="mt-1 text-sm text-body">{current.singerName}</p>
                <p className="mt-2 text-xs text-mute">
                  {playbackLabel(room.playbackState)}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-body">Waiting for the first song…</p>
          )}
        </section>

        <RemoteControls
          playbackState={room.playbackState}
          disabled={Boolean(pendingCommand)}
          pendingCommand={pendingCommand}
          hasCurrentSong={Boolean(current)}
          hasUpcomingSong={upcoming.length > 0}
          playerOnline={playerOnline}
          onCommand={(type) => {
            void handleCommand(type)
          }}
        />

        <section className="space-y-2">
          <p className="eyebrow-mono text-mute">Next</p>
          {next ? (
            <div className="hairline-card flex gap-3 p-3">
              <img
                src={next.thumbnailUrl}
                alt=""
                className="size-12 shrink-0 rounded object-cover"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {next.title}
                </p>
                <p className="truncate text-xs text-body">{next.singerName}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-body">Queue is empty</p>
          )}
        </section>

        <section className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <p className="eyebrow-mono text-mute">Queue</p>
            <p className="font-mono text-xs text-body">
              {upcoming.length} upcoming
            </p>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-body">No songs waiting</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.slice(0, 8).map((item, index) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-md border border-border/70 px-3 py-2"
                >
                  <span className="w-5 shrink-0 font-mono text-xs text-mute">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">
                      {item.title}
                    </p>
                    <p className="truncate text-xs text-body">
                      {item.singerName}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-2 pt-2">
          {isHost ? (
            <Button variant="outline" className="w-full" asChild>
              <Link to={`/room/${room.id}/host`}>Open player view</Link>
            </Button>
          ) : null}
          <Button variant="ghost" className="w-full" asChild>
            <Link to={`/room/${room.id}`}>Back to room</Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
