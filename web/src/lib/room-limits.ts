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

/** Count against a cap without awkward `n/Unlimited` ratios. */
export function formatOccupancy(count: number, limit: SongLimit): string {
  return limit === null ? String(count) : `${count}/${limit}`
}

/** Section eyebrow for a queue list. */
export function formatQueueHeading(count: number, limit: SongLimit): string {
  if (limit !== null) return `Queue · ${count}/${limit}`
  if (count > 0) return `Queue · ${count} waiting`
  return 'Queue'
}

/** Guest queue tab title for songs still waiting. */
export function formatSongsWaiting(count: number, limit: SongLimit): string {
  if (limit !== null) return `${count}/${limit} songs waiting`
  if (count === 0) return 'No songs waiting'
  return `${count} song${count === 1 ? '' : 's'} waiting`
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
