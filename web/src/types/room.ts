import type { PlaybackState } from '@/types/youtube'

export type RoomStatus = 'waiting' | 'active' | 'ended'
export type RoomRole = 'host' | 'guest'

export const MAX_ROOM_MEMBERS = 5

export type KaraokeRoom = {
  id: string
  name: string
  hostUserId: string
  roomCode: string
  status: RoomStatus
  currentQueueItemId: string | null
  playbackState: PlaybackState
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
