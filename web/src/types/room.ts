import type { PlaybackState } from '@/types/youtube'

export type RoomStatus = 'waiting' | 'active' | 'ended'
export type RoomRole = 'host' | 'controller' | 'guest'

export type PlaybackCommandType = 'play' | 'pause' | 'next' | 'skip' | 'restart'

export type PlaybackCommand = {
  id: string
  type: PlaybackCommandType
  issuedBy: string
  issuedAt: string
}

export const MAX_ROOM_MEMBERS = 5

/** Heartbeat interval for the host player device. */
export const PLAYER_PRESENCE_HEARTBEAT_MS = 12_000

/** Player considered online if heartbeat is within this window. */
export const PLAYER_ONLINE_THRESHOLD_MS = 30_000

export type KaraokeRoom = {
  id: string
  name: string
  hostUserId: string
  roomCode: string
  status: RoomStatus
  currentQueueItemId: string | null
  playbackState: PlaybackState
  playbackCommand: PlaybackCommand | null
  /** Host player heartbeat for remote "connected" status. */
  playerLastSeenAt: string | null
  /** Device id of the tab currently publishing player presence. */
  playerDeviceId: string | null
  memberCount: number
  createdAt: string
  updatedAt: string
}

export type RoomMember = {
  userId: string
  displayName: string
  photoURL?: string
  role: RoomRole
  joinedAt: string
}

/** Roles the host may assign to non-host participants. */
export type AssignableMemberRole = Exclude<RoomRole, 'host'>
