import { HttpsError } from 'firebase-functions/v2/https'

export type SongLimit = number | null
export type RoomSettings = {
  queueLimit: SongLimit
  songsPerUser: SongLimit
  memberLimit: number
}

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  queueLimit: null,
  songsPerUser: 3,
  memberLimit: 5,
}

export function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

/** Missing fields belong to legacy rooms; null explicitly means unlimited. */
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

export function validateSongLimit(value: unknown, label: string): SongLimit {
  if (value !== null && !isPositiveInteger(value)) {
    throw new HttpsError(
      'invalid-argument',
      `${label} must be a positive whole number or Unlimited.`,
    )
  }
  return value
}

export function validateRoomSettings(value: unknown): RoomSettings {
  if (!value || typeof value !== 'object')
    throw new HttpsError('invalid-argument', 'Provide room settings.')
  const data = value as Record<string, unknown>
  if (!isPositiveInteger(data.memberLimit))
    throw new HttpsError(
      'invalid-argument',
      'Room capacity must be a positive whole number, including the host.',
    )
  return {
    queueLimit: validateSongLimit(data.queueLimit, 'Room queue limit'),
    songsPerUser: validateSongLimit(data.songsPerUser, 'Songs per user'),
    memberLimit: data.memberLimit,
  }
}

export function effectiveSongLimit(
  settings: RoomSettings,
  override: unknown,
): SongLimit {
  return override === null || isPositiveInteger(override)
    ? override
    : settings.songsPerUser
}

export function assertQueueCapacity(
  settings: RoomSettings,
  override: unknown,
  total: number,
  personal: number,
): void {
  if (settings.queueLimit !== null && total >= settings.queueLimit) {
    throw new HttpsError(
      'resource-exhausted',
      `The room queue is full (${total}/${settings.queueLimit}). Wait for a song to start or be removed.`,
    )
  }
  const limit = effectiveSongLimit(settings, override)
  if (limit !== null && personal >= limit) {
    throw new HttpsError(
      'resource-exhausted',
      `You can have ${limit} waiting song${limit === 1 ? '' : 's'} at a time. Wait for one to start or remove one.`,
    )
  }
}
