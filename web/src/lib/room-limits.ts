import type {
  KaraokeRoom,
  RoomMember,
  RoomSettings,
  SongLimit,
} from '@/types/room'

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  queueLimit: null,
  songsPerUser: 3,
  memberLimit: 5,
}

export function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

export function readRoomSettings(value: unknown): RoomSettings {
  const data =
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return {
    queueLimit:
      data.queueLimit === null || isPositiveInteger(data.queueLimit)
        ? data.queueLimit
        : DEFAULT_ROOM_SETTINGS.queueLimit,
    songsPerUser:
      data.songsPerUser === null || isPositiveInteger(data.songsPerUser)
        ? data.songsPerUser
        : DEFAULT_ROOM_SETTINGS.songsPerUser,
    memberLimit: isPositiveInteger(data.memberLimit)
      ? data.memberLimit
      : DEFAULT_ROOM_SETTINGS.memberLimit,
  }
}

export function getUserSongLimit(
  settings: RoomSettings,
  member?: RoomMember,
): SongLimit {
  return member?.songLimitOverride !== undefined
    ? member.songLimitOverride
    : settings.songsPerUser
}

export function formatLimit(limit: SongLimit): string {
  return limit === null ? 'Unlimited' : String(limit)
}

export function getQueueLimitMessage(
  room: KaraokeRoom | null,
  member: RoomMember | undefined,
  total: number,
  personal: number,
): string | null {
  if (!room) return null
  if (room.settings.queueLimit !== null && total >= room.settings.queueLimit) {
    return `Room queue is full (${total}/${room.settings.queueLimit}). Wait for a song to start or be removed.`
  }
  const limit = getUserSongLimit(room.settings, member)
  if (limit !== null && personal >= limit) {
    return `Your allowance is ${limit} waiting song${limit === 1 ? '' : 's'}. Wait for one to start or remove one to add another.`
  }
  return null
}
