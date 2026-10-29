import {
  PLAYER_ONLINE_THRESHOLD_MS,
  type KaraokeRoom,
  type RoomMember,
  type RoomRole,
} from '@/types/room'

export function canControlPlayback(
  userId: string | undefined,
  room: KaraokeRoom | null | undefined,
  members: RoomMember[],
): boolean {
  if (!userId || !room) return false
  if (room.hostUserId === userId) return true
  const member = members.find((entry) => entry.userId === userId)
  return member?.role === 'controller'
}

export function getMemberRole(
  userId: string | undefined,
  room: KaraokeRoom | null | undefined,
  members: RoomMember[],
): RoomRole | null {
  if (!userId || !room) return null
  if (room.hostUserId === userId) return 'host'
  return members.find((entry) => entry.userId === userId)?.role ?? null
}

export type PlayerConnectionStatus = 'connected' | 'reconnecting' | 'offline'

export function getPlayerConnectionStatus(
  lastSeenAt: string | null | undefined,
  nowMs: number = Date.now(),
): PlayerConnectionStatus {
  if (!lastSeenAt) return 'offline'
  const seenAt = Date.parse(lastSeenAt)
  if (Number.isNaN(seenAt)) return 'offline'
  const age = nowMs - seenAt
  if (age <= PLAYER_ONLINE_THRESHOLD_MS) return 'connected'
  if (age <= PLAYER_ONLINE_THRESHOLD_MS * 1.5) return 'reconnecting'
  return 'offline'
}

export function isPlayerOnline(
  lastSeenAt: string | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  return getPlayerConnectionStatus(lastSeenAt, nowMs) === 'connected'
}

export function roleSortRank(role: RoomRole): number {
  if (role === 'host') return 0
  if (role === 'controller') return 1
  return 2
}
