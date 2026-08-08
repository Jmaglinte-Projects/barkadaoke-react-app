import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Bookmark, ListMusic, Radio, Search } from 'lucide-react'
import { toast } from 'sonner'

import { AppNav } from '@/components/layout/AppNav'
import { CurrentSinger } from '@/components/queue/CurrentSinger'
import { NextSinger } from '@/components/queue/NextSinger'
import { QueueList } from '@/components/queue/QueueList'
import { MemberList } from '@/components/room/MemberList'
import { RoomHeader } from '@/components/room/RoomHeader'
import { SongSearch } from '@/components/search/SongSearch'
import { SavedSongsList } from '@/components/songs/SavedSongsList'
import { Button } from '@/components/ui/button'
import { savedSongToSearchResult } from '@/firebase/bookmarks'
import { addSongToQueue, removeQueueItem } from '@/firebase/queue'
import { leaveRoom } from '@/firebase/rooms'
import { useActiveRoom } from '@/hooks/useActiveRoom'
import { useAuth } from '@/hooks/useAuth'
import { useEnsureRoomMembership } from '@/hooks/useEnsureRoomMembership'
import { useQueue } from '@/hooks/useQueue'
import { useRoom } from '@/hooks/useRoom'
import { useRoomMembers } from '@/hooks/useRoomMembers'
import { useSavedSongs } from '@/hooks/useSavedSongs'
import { canControlPlayback, getMemberRole } from '@/lib/playback'
import {
  getCurrentSong,
  getNextSong,
  getUpcomingQueue,
  getVisibleQueue,
} from '@/lib/queue'
import { MAX_UPCOMING_SONGS_PER_USER } from '@/types/queue'
import type { SavedSong } from '@/types/saved-song'
import type { SongSearchResult } from '@/types/youtube'
import { cn } from '@/lib/utils'

type GuestTab = 'now' | 'search' | 'saved' | 'queue'

export function GuestRoomPage() {
  const { roomId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { setActiveRoom, clearActiveRoom } = useActiveRoom()
  const [tab, setTab] = useState<GuestTab>('now')
  const [isLeaving, setIsLeaving] = useState(false)

  const { isJoining, error: joinError } = useEnsureRoomMembership(roomId, user)
  const { room, isLoading: roomLoading, error: roomError } = useRoom(roomId)
  const { members } = useRoomMembers(roomId)
  const { queue } = useQueue(roomId)
  const {
    songs: savedSongs,
    isLoading: savedLoading,
    isSaved,
    pendingVideoId,
    toggleBookmark,
    toggleQueueItemBookmark,
  } = useSavedSongs()

  const memberRole = getMemberRole(user?.uid, room, members)
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
  const myUpcoming = useMemo(
    () => upcoming.filter((item) => item.singerUserId === user?.uid),
    [upcoming, user?.uid],
  )
  const mySong =
    myUpcoming[0] ??
    (current?.singerUserId === user?.uid ? current : null)
  const atUpcomingLimit = myUpcoming.length >= MAX_UPCOMING_SONGS_PER_USER
  const visibleQueue = useMemo(() => getVisibleQueue(queue), [queue])
  const isHost = Boolean(user && room && room.hostUserId === user.uid)
  const canControl = canControlPlayback(user?.uid, room, members)

  if (!user) {
    return null
  }

  if (isJoining || roomLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-sm text-body">Loading room…</p>
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
          <Link to="/join">Back to join</Link>
        </Button>
      </div>
    )
  }

  if (room.status === 'ended') {
    return <Navigate to="/home" replace />
  }

  async function handleLeaveRoom() {
    if (!roomId || !user || isHost) return
    const confirmed = window.confirm('Leave this karaoke room?')
    if (!confirmed) return

    setIsLeaving(true)
    try {
      await leaveRoom(roomId)
      clearActiveRoom()
      toast.message('Left the room')
      navigate('/home')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to leave room',
      )
      setIsLeaving(false)
    }
  }

  async function handleAddSong(result: SongSearchResult) {
    if (!roomId || !user) return
    try {
      await addSongToQueue(roomId, user, result, queue)
      toast.success('Song added to queue')
      setTab('queue')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add song')
    }
  }

  async function handleAddSavedSong(song: SavedSong) {
    await handleAddSong(savedSongToSearchResult(song))
  }

  async function handleRemove(id: string) {
    if (!roomId || !user) return
    const item = queue.find((entry) => entry.id === id)
    if (!item) return

    try {
      await removeQueueItem(roomId, item, user.uid, isHost)
      toast.message('Song removed')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to remove song',
      )
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-background pb-20">
      <AppNav />
      <RoomHeader room={room} />

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4">
        {tab === 'now' ? (
          <div className="space-y-4">
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
            <div className="hairline-card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="eyebrow-mono text-mute">My songs</p>
                <span className="font-mono text-xs text-mute">
                  {myUpcoming.length}/{MAX_UPCOMING_SONGS_PER_USER}
                </span>
              </div>
              {myUpcoming.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {myUpcoming.map((song) => (
                    <li key={song.id} className="truncate text-sm text-foreground">
                      {song.title}
                    </li>
                  ))}
                </ul>
              ) : mySong ? (
                <p className="mt-2 text-sm text-foreground">{mySong.title}</p>
              ) : (
                <p className="mt-2 text-sm text-body">
                  You don&apos;t have a song queued.{' '}
                  <button
                    type="button"
                    className="text-primary-soft underline-offset-2 hover:underline"
                    onClick={() => setTab('search')}
                  >
                    Search now
                  </button>
                </p>
              )}
            </div>
            <MemberList members={members} />
            {canControl ? (
              <Button variant="outline" className="w-full" asChild>
                <Link to={`/room/${room.id}/remote`}>Open remote control</Link>
              </Button>
            ) : null}
            {isHost ? (
              <Button variant="outline" className="w-full" asChild>
                <Link to={`/room/${room.id}/host`}>Open host controls</Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                disabled={isLeaving}
                onClick={() => {
                  void handleLeaveRoom()
                }}
              >
                {isLeaving ? 'Leaving…' : 'Leave room'}
              </Button>
            )}
          </div>
        ) : null}

        {tab === 'search' ? (
          <div className="space-y-3">
            {atUpcomingLimit ? (
              <p className="text-sm text-mute">
                You already have {MAX_UPCOMING_SONGS_PER_USER} upcoming songs.
                Wait until one starts or remove one to add another.
              </p>
            ) : null}
            <SongSearch onAddSong={handleAddSong} disabled={atUpcomingLimit} />
          </div>
        ) : null}

        {tab === 'saved' ? (
          <div className="space-y-3">
            <div>
              <p className="eyebrow-mono text-mute">Your collection</p>
              <h2 className="mt-1 text-lg font-semibold text-ink-strong">
                Saved songs
              </h2>
              <p className="mt-1 text-sm text-body">
                Add a bookmark to tonight&apos;s queue.
              </p>
            </div>
            {atUpcomingLimit ? (
              <p className="text-sm text-mute">
                You already have {MAX_UPCOMING_SONGS_PER_USER} upcoming songs.
                Wait until one starts or remove one to add another.
              </p>
            ) : null}
            {savedLoading ? (
              <p className="text-sm text-body">Loading saved songs…</p>
            ) : (
              <SavedSongsList
                songs={savedSongs}
                emptyLabel="Bookmark a song from Now Playing or the queue to build your collection."
                addDisabled={atUpcomingLimit}
                pendingVideoId={pendingVideoId}
                onAddToQueue={(song) => {
                  void handleAddSavedSong(song)
                }}
                onToggleSave={(song) => {
                  void toggleBookmark(song)
                }}
              />
            )}
          </div>
        ) : null}

        {tab === 'queue' ? (
          <div className="space-y-4">
            <div>
              <p className="eyebrow-mono text-mute">Up next</p>
              <h2 className="mt-1 text-lg font-semibold text-ink-strong">
                {upcoming.length} song{upcoming.length === 1 ? '' : 's'} waiting
              </h2>
            </div>
            <QueueList
              items={visibleQueue}
              currentUserId={user.uid}
              onRemove={handleRemove}
              isSaved={isSaved}
              pendingVideoId={pendingVideoId}
              onToggleBookmark={(item) => {
                void toggleQueueItemBookmark(item)
              }}
            />
          </div>
        ) : null}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto grid max-w-lg grid-cols-4">
          <TabButton
            active={tab === 'now'}
            onClick={() => setTab('now')}
            icon={<Radio className="size-4" />}
            label="Now"
          />
          <TabButton
            active={tab === 'search'}
            onClick={() => setTab('search')}
            icon={<Search className="size-4" />}
            label="Search"
          />
          <TabButton
            active={tab === 'saved'}
            onClick={() => setTab('saved')}
            icon={<Bookmark className="size-4" />}
            label="Saved"
          />
          <TabButton
            active={tab === 'queue'}
            onClick={() => setTab('queue')}
            icon={<ListMusic className="size-4" />}
            label="Queue"
          />
        </div>
      </nav>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 px-2 py-3 text-xs transition-colors',
        active ? 'text-primary' : 'text-mute hover:text-foreground',
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  )
}
