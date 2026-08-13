import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ListPlus } from 'lucide-react'
import { toast } from 'sonner'

import {
  HostAddSongsFab,
  HostAddSongsSheet,
} from '@/components/host/HostAddSongsSheet'
import { HostControls } from '@/components/player/HostControls'
import {
  YouTubePlayer,
  type YouTubePlayerHandle,
} from '@/components/player/YouTubePlayer'
import { CurrentSinger } from '@/components/queue/CurrentSinger'
import { NextSinger } from '@/components/queue/NextSinger'
import { QueueList } from '@/components/queue/QueueList'
import { MemberList } from '@/components/room/MemberList'
import { RoomHeader } from '@/components/room/RoomHeader'
import { RoomQRCode } from '@/components/room/RoomQRCode'
import { Button } from '@/components/ui/button'
import {
  addSongToQueue,
  advanceQueue,
  removeQueueItem,
  startFirstSong,
} from '@/firebase/queue'
import {
  clearPlayerPresence,
  endRoom,
  setMemberPlaybackRole,
  setPlayerPresence,
  setRoomPlaybackState,
} from '@/firebase/rooms'
import { useActiveRoom } from '@/hooks/useActiveRoom'
import { useAuth } from '@/hooks/useAuth'
import { useEnsureRoomMembership } from '@/hooks/useEnsureRoomMembership'
import { useFullscreen } from '@/hooks/useFullscreen'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useQueue } from '@/hooks/useQueue'
import { useRoom } from '@/hooks/useRoom'
import { useRoomMembers } from '@/hooks/useRoomMembers'
import { useSavedSongs } from '@/hooks/useSavedSongs'
import { getDeviceId } from '@/lib/device-id'
import { cn } from '@/lib/utils'
import {
  getCurrentSong,
  getNextSong,
  getUpcomingQueue,
  getVisibleQueue,
} from '@/lib/queue'
import type { AssignableMemberRole, PlaybackCommand } from '@/types/room'
import { PLAYER_PRESENCE_HEARTBEAT_MS } from '@/types/room'
import type { PlaybackState, SongSearchResult } from '@/types/youtube'

export function HostRoomPage() {
  const { roomId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { setActiveRoom, clearActiveRoom } = useActiveRoom()
  const playerRef = useRef<YouTubePlayerHandle>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const { isFullscreen, toggleFullscreen } = useFullscreen(stageRef)
  const isCompactLandscape = useMediaQuery(
    '(orientation: landscape) and (max-height: 500px)',
  )
  const [controlsVisible, setControlsVisible] = useState(true)
  const [showQr, setShowQr] = useState(true)
  const [isActing, setIsActing] = useState(false)
  const [addSongsOpen, setAddSongsOpen] = useState(false)
  const [rolePendingUserId, setRolePendingUserId] = useState<string | null>(
    null,
  )

  useEffect(() => {
    // Phones in landscape: give the video the screen; controls stay a tap away.
    setControlsVisible(!isCompactLandscape)
  }, [isCompactLandscape])

  const { isJoining, error: joinError } = useEnsureRoomMembership(roomId, user)
  const { room, isLoading: roomLoading, error: roomError } = useRoom(roomId)
  const { members } = useRoomMembers(roomId)
  const { queue } = useQueue(roomId)
  const { isSaved, pendingVideoId, toggleQueueItemBookmark } = useSavedSongs()

  useEffect(() => {
    if (!room || !user) return
    if (room.status === 'ended') {
      clearActiveRoom()
      return
    }
    setActiveRoom({
      roomId: room.id,
      roomCode: room.roomCode,
      name: room.name,
      role: 'host',
    })
    // Identity fields only — avoid localStorage writes on every playback tick.
  }, [
    room?.id,
    room?.roomCode,
    room?.name,
    room?.status,
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
  const visibleQueue = useMemo(() => getVisibleQueue(queue), [queue])
  const myUpcomingCount = useMemo(
    () => upcoming.filter((item) => item.singerUserId === user?.uid).length,
    [upcoming, user?.uid],
  )
  const isHost = Boolean(user && room && room.hostUserId === user.uid)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (addSongsOpen) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key !== '/') return
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return
      }
      event.preventDefault()
      setAddSongsOpen(true)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [addSongsOpen])

  const isEndingRef = useRef(false)
  const isAdvancingRef = useRef(false)
  const queueRef = useRef(queue)
  const roomRef = useRef(room)
  const lastProcessedCommandIdRef = useRef<string | null>(null)
  const commandsHydratedRef = useRef(false)
  const deviceIdRef = useRef(getDeviceId())
  const roomStatus = room?.status
  const playbackCommand = room?.playbackCommand ?? null
  const playbackCommandId = playbackCommand?.id ?? null

  useEffect(() => {
    queueRef.current = queue
  }, [queue])

  useEffect(() => {
    roomRef.current = room
  }, [room])

  const syncPlaybackState = useCallback(
    (state: PlaybackState) => {
      if (!roomId || isEndingRef.current) return
      if (room?.status === 'ended') return
      if (room?.playbackState === state) return
      void setRoomPlaybackState(roomId, state).catch(() => {
        // Ignore transient sync errors; controls still work locally.
      })
    },
    [roomId, room?.playbackState, room?.status],
  )

  const handleAdvance = useCallback(
    async (mode: 'next' | 'skip') => {
      if (!roomId) return

      const currentRoom = roomRef.current
      const currentQueue = queueRef.current
      if (!currentRoom || currentRoom.status === 'ended') return

      const nextSong = getNextSong(currentQueue)
      const hasCurrent = Boolean(currentRoom.currentQueueItemId)

      if (!nextSong) {
        toast.message(
          hasCurrent
            ? 'No more songs in the queue'
            : 'Queue is empty — add a song first',
        )
        return
      }

      setIsActing(true)
      try {
        if (!hasCurrent) {
          await startFirstSong(roomId, currentQueue)
          toast.success('First song started')
          return
        }

        await advanceQueue(
          roomId,
          currentQueue,
          currentRoom.currentQueueItemId,
          mode,
        )
        toast.success(
          mode === 'skip'
            ? `Skipped — up next: ${nextSong.singerName}`
            : `Up next: ${nextSong.singerName}`,
        )
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Could not advance queue',
        )
      } finally {
        setIsActing(false)
      }
    },
    [roomId],
  )

  const executePlaybackCommand = useCallback(
    (command: PlaybackCommand) => {
      if (!roomId || isEndingRef.current) return

      const currentRoom = roomRef.current
      const currentQueue = queueRef.current
      if (!currentRoom || currentRoom.status === 'ended') return

      const currentSong = getCurrentSong(
        currentQueue,
        currentRoom.currentQueueItemId,
      )

      switch (command.type) {
        case 'play': {
          if (!currentSong) {
            void handleAdvance('next')
            return
          }
          playerRef.current?.play()
          syncPlaybackState('playing')
          return
        }
        case 'pause': {
          playerRef.current?.pause()
          syncPlaybackState('paused')
          return
        }
        case 'restart': {
          if (!currentSong) return
          playerRef.current?.restart()
          syncPlaybackState('playing')
          toast.message('Restarted current song')
          return
        }
        case 'next': {
          void handleAdvance('next')
          return
        }
        case 'skip': {
          void handleAdvance('skip')
          return
        }
        default:
          return
      }
    },
    [handleAdvance, roomId, syncPlaybackState],
  )

  // Authoritative player: process remote/controller commands once each.
  useEffect(() => {
    if (!isHost) return

    if (!playbackCommand || !playbackCommandId) {
      commandsHydratedRef.current = true
      return
    }

    // Ignore whatever command was already on the room when this player tab opened.
    if (!commandsHydratedRef.current) {
      lastProcessedCommandIdRef.current = playbackCommandId
      commandsHydratedRef.current = true
      return
    }

    if (lastProcessedCommandIdRef.current === playbackCommandId) return
    lastProcessedCommandIdRef.current = playbackCommandId
    executePlaybackCommand(playbackCommand)
  }, [executePlaybackCommand, isHost, playbackCommand, playbackCommandId])

  // Publish player presence on a stable interval. Do NOT depend on `room` —
  // that previously restarted the heartbeat on every write and stormed Firebase.
  // Important: do not clear presence in the effect cleanup — React Strict Mode
  // (and fast remounts) race the async clear against the next beat and leave
  // remotes stuck on "No player connected".
  useEffect(() => {
    if (!roomId || !isHost || roomStatus === 'ended') return
    const activeRoomId = roomId

    const deviceId = deviceIdRef.current
    let cancelled = false

    async function beat() {
      if (cancelled || isEndingRef.current) return
      try {
        await setPlayerPresence(activeRoomId, deviceId)
      } catch (error) {
        console.warn('[barkadaoke] player presence write failed', error)
      }
    }

    void beat()
    const interval = window.setInterval(() => {
      void beat()
    }, PLAYER_PRESENCE_HEARTBEAT_MS)

    function onUnload() {
      void clearPlayerPresence(activeRoomId, deviceId)
    }
    window.addEventListener('pagehide', onUnload)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener('pagehide', onUnload)
    }
  }, [isHost, roomId, roomStatus])

  const handleEnded = useCallback(() => {
    if (!roomId || isEndingRef.current || isAdvancingRef.current) return

    const currentRoom = roomRef.current
    const currentQueue = queueRef.current
    if (!currentRoom || currentRoom.status === 'ended') return

    const nextSong = getNextSong(currentQueue)
    if (!nextSong || !currentRoom.currentQueueItemId) {
      syncPlaybackState('ended')
      toast.message('Queue finished — add another song when ready')
      return
    }

    isAdvancingRef.current = true
    void advanceQueue(
      roomId,
      currentQueue,
      currentRoom.currentQueueItemId,
      'next',
    )
      .then(() => {
        toast.success(`Up next: ${nextSong.singerName}`)
      })
      .catch((error) => {
        syncPlaybackState('ended')
        toast.error(
          error instanceof Error
            ? error.message
            : 'Could not start the next song',
        )
      })
      .finally(() => {
        isAdvancingRef.current = false
      })
  }, [roomId, syncPlaybackState])

  if (!user) {
    return null
  }

  if (isJoining || roomLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-sm text-body">Loading host view…</p>
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

  if (!isHost) {
    return <Navigate to={`/room/${room.id}`} replace />
  }

  if (room.status === 'ended') {
    return <Navigate to="/home" replace />
  }

  async function handleAddSong(result: SongSearchResult) {
    if (!roomId || !user) return
    try {
      await addSongToQueue(roomId, user, result, queue)
      toast.success('Song added to queue')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add song')
    }
  }

  async function handleRemove(id: string) {
    if (!roomId || !user || !room) return
    const item = queue.find((entry) => entry.id === id)
    if (!item) return

    try {
      if (item.id === room.currentQueueItemId) {
        await advanceQueue(roomId, queue, room.currentQueueItemId, 'skip')
      } else {
        await removeQueueItem(roomId, item, user.uid, true)
      }
      toast.message('Song removed')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to remove song',
      )
    }
  }

  async function handleEndRoom() {
    if (!roomId || !user) return
    const confirmed = window.confirm('End this karaoke room for everyone?')
    if (!confirmed) return

    setIsActing(true)
    isEndingRef.current = true
    try {
      await clearPlayerPresence(roomId, deviceIdRef.current)
      await endRoom(roomId, user.uid)
      clearActiveRoom()
      toast.success('Room ended')
      navigate('/home')
    } catch (error) {
      isEndingRef.current = false
      toast.error(error instanceof Error ? error.message : 'Failed to end room')
      setIsActing(false)
    }
  }

  async function handleChangeRole(
    memberUserId: string,
    role: AssignableMemberRole,
  ) {
    if (!roomId || !user) return
    setRolePendingUserId(memberUserId)
    try {
      await setMemberPlaybackRole(roomId, memberUserId, role, user.uid)
      toast.success(
        role === 'controller'
          ? 'Granted playback control'
          : 'Removed playback control',
      )
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update participant role',
      )
    } finally {
      setRolePendingUserId(null)
    }
  }

  return (
    <div
      className={cn(
        isCompactLandscape && 'h-svh overflow-hidden',
      )}
    >
      {isCompactLandscape ? null : <RoomHeader room={room} />}

      <div
        className={cn(
          'mx-auto grid max-w-7xl gap-4 overflow-x-hidden px-4 py-4 lg:grid-cols-[1fr_320px] lg:px-6',
          isCompactLandscape &&
          'h-full max-w-none grid-cols-1 px-0 py-0 lg:grid-cols-1',
        )}
      >
        <div
          className={cn(
            'min-w-0 space-y-4',
            isCompactLandscape && 'flex h-full flex-col space-y-0',
          )}
        >
          <div
            ref={stageRef}
            className={cn(
              'relative space-y-4',
              (isFullscreen || isCompactLandscape) &&
              'flex h-full min-h-0 flex-col gap-0 space-y-0 bg-black',
              isFullscreen && !isCompactLandscape && 'gap-3 bg-background p-3 sm:p-4',
            )}
          >
            <YouTubePlayer
              ref={playerRef}
              song={current}
              playbackState={room.playbackState}
              onPlaybackStateChange={syncPlaybackState}
              onEnded={handleEnded}
              isFullscreen={isFullscreen}
              fillViewport={isCompactLandscape && !isFullscreen}
              showControlsToggle={isCompactLandscape}
              controlsVisible={controlsVisible}
              onToggleControls={() => {
                setControlsVisible((value) => !value)
              }}
              onToggleFullscreen={() => {
                void toggleFullscreen()
              }}
            />

            <div
              className={cn(
                !controlsVisible && 'hidden',
                isCompactLandscape
                  ? 'absolute inset-x-0 bottom-0 z-30 p-2 sm:p-3'
                  : isFullscreen && 'shrink-0',
              )}
            >
              <HostControls
                playbackState={room.playbackState}
                disabled={isActing}
                hasCurrentSong={Boolean(current)}
                hasUpcomingSong={upcoming.length > 0}
                isFullscreen={isFullscreen}
                compact={isCompactLandscape}
                onToggleFullscreen={() => {
                  void toggleFullscreen()
                }}
                onPlay={() => {
                  // No current song yet — start the first queued track.
                  if (!current) {
                    void handleAdvance('next')
                    return
                  }
                  playerRef.current?.play()
                  syncPlaybackState('playing')
                }}
                onPause={() => {
                  playerRef.current?.pause()
                  syncPlaybackState('paused')
                }}
                onRestart={() => {
                  playerRef.current?.restart()
                  syncPlaybackState('playing')
                  toast.message('Restarted current song')
                }}
                onNext={() => {
                  void handleAdvance('next')
                }}
                onSkip={() => {
                  void handleAdvance('skip')
                }}
              />
            </div>
          </div>

          {isCompactLandscape ? null : (
            <>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
                <CurrentSinger
                  song={current}
                  isSaved={current ? isSaved(current.youtubeVideoId) : false}
                  bookmarkPending={
                    current != null && pendingVideoId === current.youtubeVideoId
                  }
                  onToggleBookmark={
                    current
                      ? () => {
                        void toggleQueueItemBookmark(current)
                      }
                      : undefined
                  }
                />
                <NextSinger song={next} />
              </div>

              <section className="lg:pb-20">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="eyebrow-mono text-mute">Queue</p>
                    <p className="mt-1 font-mono text-sm text-body">
                      {upcoming.length} upcoming
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    className="h-11"
                    onClick={() => setAddSongsOpen(true)}
                  >
                    <ListPlus data-icon="inline-start" />
                    Add songs
                  </Button>
                </div>
                <QueueList
                  items={visibleQueue}
                  canRemoveAny
                  onRemove={handleRemove}
                  isSaved={isSaved}
                  pendingVideoId={pendingVideoId}
                  onToggleBookmark={(item) => {
                    void toggleQueueItemBookmark(item)
                  }}
                />
              </section>
            </>
          )}
        </div>

        {isCompactLandscape ? null : (
          <aside className="min-w-0 space-y-4">
            <Button
              type="button"
              size="lg"
              className="hidden h-12 w-full text-base lg:inline-flex"
              onClick={() => setAddSongsOpen(true)}
            >
              <ListPlus data-icon="inline-start" />
              Add songs to queue
              <kbd className="ml-auto rounded border border-primary-foreground/30 px-1.5 py-0.5 font-mono text-[10px]">
                /
              </kbd>
            </Button>

            <div className="flex items-center justify-between">
              <p className="eyebrow-mono text-mute">Invite</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowQr((value) => !value)}
              >
                {showQr ? 'Hide QR' : 'Show QR'}
              </Button>
            </div>
            {showQr ? <RoomQRCode roomCode={room.roomCode} /> : null}
            <MemberList
              members={members}
              canManageRoles
              rolePendingUserId={rolePendingUserId}
              onChangeRole={(memberUserId, role) => {
                void handleChangeRole(memberUserId, role)
              }}
            />
            <Button variant="outline" className="w-full" asChild>
              <Link to={`/room/${room.id}/remote`}>Open remote control</Link>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link to={`/room/${room.id}`}>Open guest view</Link>
            </Button>
            <Button
              variant="destructive"
              className="w-full"
              disabled={isActing}
              onClick={() => {
                void handleEndRoom()
              }}
            >
              End room
            </Button>
          </aside>
        )}
      </div>

      {!addSongsOpen && !isCompactLandscape ? (
        <HostAddSongsFab
          upcomingCount={myUpcomingCount}
          onClick={() => setAddSongsOpen(true)}
        />
      ) : null}

      <HostAddSongsSheet
        open={addSongsOpen}
        onOpenChange={setAddSongsOpen}
        myUpcomingCount={myUpcomingCount}
        onAddSong={handleAddSong}
      />
    </div>
  )
}
