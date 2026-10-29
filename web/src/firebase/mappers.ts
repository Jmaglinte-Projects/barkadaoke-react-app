import type { DocumentData, Timestamp } from 'firebase/firestore'

import { isPositiveInteger, readRoomSettings } from '@/lib/room-limits'
import type { QueueItem } from '@/types/queue'
import type {
  KaraokeRoom,
  PlaybackCommand,
  RoomMember,
  RoomRole,
} from '@/types/room'
import type { SavedSong } from '@/types/saved-song'

function toIso(value: unknown): string {
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as Timestamp).toDate === 'function'
  ) {
    return (value as Timestamp).toDate().toISOString()
  }

  if (typeof value === 'string') return value
  return new Date().toISOString()
}

function mapRoomRole(value: unknown): RoomRole {
  if (value === 'host' || value === 'controller' || value === 'guest') {
    return value
  }
  return 'guest'
}

function mapPlaybackCommand(value: unknown): PlaybackCommand | null {
  if (!value || typeof value !== 'object') return null
  const data = value as Record<string, unknown>
  const type = data.type
  if (
    type !== 'play' &&
    type !== 'pause' &&
    type !== 'next' &&
    type !== 'skip' &&
    type !== 'restart'
  ) {
    return null
  }
  const id = typeof data.id === 'string' ? data.id : null
  const issuedBy = typeof data.issuedBy === 'string' ? data.issuedBy : null
  if (!id || !issuedBy) return null
  return {
    id,
    type,
    issuedBy,
    issuedAt: toIso(data.issuedAt),
  }
}

export function mapRoom(id: string, data: DocumentData): KaraokeRoom {
  return {
    id,
    name: String(data.name ?? 'Karaoke Room'),
    hostUserId: String(data.hostUserId ?? ''),
    roomCode: String(data.roomCode ?? ''),
    status: (data.status as KaraokeRoom['status']) ?? 'waiting',
    currentQueueItemId:
      typeof data.currentQueueItemId === 'string'
        ? data.currentQueueItemId
        : null,
    playbackState:
      (data.playbackState as KaraokeRoom['playbackState']) ?? 'idle',
    playbackCommand: mapPlaybackCommand(data.playbackCommand),
    playerLastSeenAt:
      typeof data.playerLastSeenAt === 'string' ? data.playerLastSeenAt : null,
    playerDeviceId:
      typeof data.playerDeviceId === 'string' ? data.playerDeviceId : null,
    settings: readRoomSettings(data.settings),
    memberCount: Number(data.memberCount ?? 0),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  }
}

export function mapMember(id: string, data: DocumentData): RoomMember {
  return {
    userId: String(data.userId ?? id),
    displayName: String(data.displayName ?? 'Guest'),
    photoURL: typeof data.photoURL === 'string' ? data.photoURL : undefined,
    role: mapRoomRole(data.role),
    songLimitOverride:
      data.songLimitOverride === null ||
      isPositiveInteger(data.songLimitOverride)
        ? data.songLimitOverride
        : undefined,
    joinedAt: toIso(data.joinedAt),
  }
}

export function mapQueueItem(id: string, data: DocumentData): QueueItem {
  return {
    id,
    youtubeVideoId: String(data.youtubeVideoId ?? ''),
    title: String(data.title ?? 'Untitled'),
    thumbnailUrl: String(data.thumbnailUrl ?? ''),
    singerUserId: String(data.singerUserId ?? ''),
    singerName: String(data.singerName ?? 'Singer'),
    singerPhotoURL:
      typeof data.singerPhotoURL === 'string' ? data.singerPhotoURL : undefined,
    status: (data.status as QueueItem['status']) ?? 'queued',
    order: Number(data.order ?? 0),
    createdAt: toIso(data.createdAt),
    startedAt: data.startedAt ? toIso(data.startedAt) : undefined,
    completedAt: data.completedAt ? toIso(data.completedAt) : undefined,
  }
}

export function mapSavedSong(id: string, data: DocumentData): SavedSong {
  return {
    videoId: String(data.videoId ?? id),
    title: String(data.title ?? 'Untitled'),
    thumbnailUrl: String(data.thumbnailUrl ?? ''),
    channelTitle: String(data.channelTitle ?? ''),
    savedAt: toIso(data.savedAt),
  }
}
