import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'

import { getDb, getFirebaseFunctions } from '@/firebase/config'
import { mapMember, mapRoom } from '@/firebase/mappers'
import { createRequestCache } from '@/lib/request-cache'
import { roleSortRank } from '@/lib/playback'
import { DEFAULT_ROOM_SETTINGS, readRoomSettings } from '@/lib/room-limits'
import { generateRoomCode, normalizeRoomCode } from '@/lib/room-code'
import type {
  AssignableMemberRole,
  KaraokeRoom,
  PlaybackCommandType,
  RoomMember,
  RoomSettings,
  SongLimit,
} from '@/types/room'
import type { UserProfile } from '@/types/user'
import type { PlaybackState } from '@/types/youtube'

type JoinRoomResponse = {
  roomId: string
  name: string
  roomCode: string
  hostUserId: string
  status: string
  memberCount: number
  settings?: unknown
  alreadyMember: boolean
}

function getCallableErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message: unknown }).message)
    // Firebase prefixes some messages like "Firebase: ..." — keep the useful part.
    const cleaned = message
      .replace(/^Firebase:\s*/i, '')
      .replace(/\s*\([^)]*\)\s*$/, '')
    if (cleaned.trim()) return cleaned.trim()
  }
  return fallback
}

async function isRoomCodeAvailable(roomCode: string): Promise<boolean> {
  const snapshot = await getDocs(
    query(
      collection(getDb(), 'rooms'),
      where('roomCode', '==', roomCode),
      where('status', 'in', ['waiting', 'active']),
      limit(1),
    ),
  )
  return snapshot.empty
}

async function createUniqueRoomCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateRoomCode()
    if (await isRoomCodeAvailable(code)) {
      return code
    }
  }
  throw new Error('Could not generate a unique room code. Try again.')
}

export async function findActiveHostedRoom(
  hostUserId: string,
): Promise<KaraokeRoom | null> {
  const snapshot = await getDocs(
    query(
      collection(getDb(), 'rooms'),
      where('hostUserId', '==', hostUserId),
      where('status', 'in', ['waiting', 'active']),
      limit(1),
    ),
  )
  const docSnap = snapshot.docs[0]
  if (!docSnap) return null
  return mapRoom(docSnap.id, docSnap.data())
}

export async function createRoom(
  user: UserProfile,
  name: string,
): Promise<KaraokeRoom> {
  const existing = await findActiveHostedRoom(user.uid)
  if (existing) {
    throw new Error(
      `You already have an active room (${existing.roomCode}). End it before creating another.`,
    )
  }

  const db = getDb()
  const roomRef = doc(collection(db, 'rooms'))
  const roomCode = await createUniqueRoomCode()
  const roomName = name.trim() || 'Karaoke Night'

  const batch = writeBatch(db)
  batch.set(roomRef, {
    name: roomName,
    hostUserId: user.uid,
    roomCode,
    status: 'active',
    currentQueueItemId: null,
    playbackState: 'idle',
    playbackCommand: null,
    playerLastSeenAt: null,
    playerDeviceId: null,
    settings: DEFAULT_ROOM_SETTINGS,
    memberCount: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  batch.set(doc(roomRef, 'members', user.uid), {
    userId: user.uid,
    displayName: user.displayName,
    photoURL: user.photoURL ?? null,
    role: 'host',
    joinedAt: serverTimestamp(),
  })
  await batch.commit()

  return {
    id: roomRef.id,
    name: roomName,
    hostUserId: user.uid,
    roomCode,
    status: 'active',
    currentQueueItemId: null,
    playbackState: 'idle',
    playbackCommand: null,
    playerLastSeenAt: null,
    playerDeviceId: null,
    settings: DEFAULT_ROOM_SETTINGS,
    memberCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export async function findActiveRoomByCode(
  roomCode: string,
): Promise<KaraokeRoom | null> {
  const normalized = normalizeRoomCode(roomCode)
  if (!normalized) return null

  const snapshot = await getDocs(
    query(
      collection(getDb(), 'rooms'),
      where('roomCode', '==', normalized),
      where('status', 'in', ['waiting', 'active']),
      limit(1),
    ),
  )

  const docSnap = snapshot.docs[0]
  if (!docSnap) return null
  return mapRoom(docSnap.id, docSnap.data())
}

export async function getRoom(roomId: string): Promise<KaraokeRoom | null> {
  const snap = await getDoc(doc(getDb(), 'rooms', roomId))
  if (!snap.exists()) return null
  return mapRoom(snap.id, snap.data())
}

// Strict Mode and concurrent consumers share work, but later visits revalidate.
const joinRequests = createRequestCache()

/** Trusted join via Cloud Function (transaction-safe room capacity). */
export function joinRoom(
  roomId: string,
  user: Pick<UserProfile, 'uid'>,
): Promise<KaraokeRoom> {
  return joinRequests(`${user.uid}:id:${roomId}`, () => performJoinRoom(roomId))
}

async function performJoinRoom(roomId: string): Promise<KaraokeRoom> {
  try {
    const callable = httpsCallable<{ roomId: string }, JoinRoomResponse>(
      getFirebaseFunctions(),
      'joinRoom',
    )
    const result = await callable({ roomId })
    const data = result.data

    return {
      id: data.roomId,
      name: data.name,
      hostUserId: data.hostUserId,
      roomCode: data.roomCode,
      status: data.status as KaraokeRoom['status'],
      currentQueueItemId: null,
      playbackState: 'idle',
      playbackCommand: null,
      playerLastSeenAt: null,
      playerDeviceId: null,
      settings: readRoomSettings(data.settings),
      memberCount: data.memberCount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  } catch (error) {
    throw new Error(
      getCallableErrorMessage(error, 'Failed to join room. Try again.'),
    )
  }
}

export function joinRoomByCode(
  roomCode: string,
  user: UserProfile,
): Promise<KaraokeRoom> {
  const normalized = normalizeRoomCode(roomCode)
  return joinRequests(`${user.uid}:code:${normalized}`, () =>
    performJoinRoomByCode(normalized),
  )
}

async function performJoinRoomByCode(roomCode: string): Promise<KaraokeRoom> {
  const normalized = normalizeRoomCode(roomCode)
  if (!normalized) {
    throw new Error('Enter a room code.')
  }

  try {
    const callable = httpsCallable<{ roomCode: string }, JoinRoomResponse>(
      getFirebaseFunctions(),
      'joinRoom',
    )
    const result = await callable({ roomCode: normalized })
    const data = result.data

    return {
      id: data.roomId,
      name: data.name,
      hostUserId: data.hostUserId,
      roomCode: data.roomCode,
      status: data.status as KaraokeRoom['status'],
      currentQueueItemId: null,
      playbackState: 'idle',
      playbackCommand: null,
      playerLastSeenAt: null,
      playerDeviceId: null,
      settings: readRoomSettings(data.settings),
      memberCount: data.memberCount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  } catch (error) {
    throw new Error(
      getCallableErrorMessage(error, 'Failed to join room. Try again.'),
    )
  }
}

export async function endRoom(
  roomId: string,
  hostUserId: string,
): Promise<void> {
  const room = await getRoom(roomId)
  if (!room) {
    throw new Error('Room not found.')
  }
  if (room.hostUserId !== hostUserId) {
    throw new Error('Only the host can end the room.')
  }

  await updateDoc(doc(getDb(), 'rooms', roomId), {
    status: 'ended',
    playbackState: 'idle',
    currentQueueItemId: null,
    updatedAt: serverTimestamp(),
  })
}

export async function leaveRoom(roomId: string): Promise<void> {
  try {
    const callable = httpsCallable<{ roomId: string }, { roomId: string }>(
      getFirebaseFunctions(),
      'leaveRoom',
    )
    await callable({ roomId })
  } catch (error) {
    throw new Error(
      getCallableErrorMessage(error, 'Failed to leave room. Try again.'),
    )
  }
}

const playbackWrites = new Map<
  string,
  { state: PlaybackState; promise: Promise<void> }
>()

export function setRoomPlaybackState(
  roomId: string,
  playbackState: PlaybackState,
): Promise<void> {
  // Do not set status here — a late playback sync after endRoom was
  // re-writing status to 'active' and blocking new room creation.
  const previous = playbackWrites.get(roomId)
  if (previous?.state === playbackState) return previous.promise

  // Preserve event order while sharing duplicate callbacks from controls + iframe.
  const promise = (previous?.promise ?? Promise.resolve())
    .catch(() => {})
    .then(() =>
      updateDoc(doc(getDb(), 'rooms', roomId), {
        playbackState,
        updatedAt: serverTimestamp(),
      }),
    )
  const pending = { state: playbackState, promise }
  playbackWrites.set(roomId, pending)
  const clear = () => {
    if (playbackWrites.get(roomId) === pending) playbackWrites.delete(roomId)
  }
  void promise.then(clear, clear)
  return promise
}

export async function issuePlaybackCommand(
  roomId: string,
  type: PlaybackCommandType,
  issuedBy: string,
): Promise<string> {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `cmd-${Date.now()}-${Math.random().toString(36).slice(2)}`

  await updateDoc(doc(getDb(), 'rooms', roomId), {
    playbackCommand: {
      id,
      type,
      issuedBy,
      issuedAt: new Date().toISOString(),
    },
    updatedAt: serverTimestamp(),
  })

  return id
}

export async function setPlayerPresence(
  roomId: string,
  deviceId: string,
): Promise<void> {
  // Single low-frequency room write — remotes already listen to the room doc.
  await updateDoc(doc(getDb(), 'rooms', roomId), {
    playerLastSeenAt: new Date().toISOString(),
    playerDeviceId: deviceId,
  })
}

export async function clearPlayerPresence(
  roomId: string,
  deviceId: string,
): Promise<void> {
  const room = await getRoom(roomId)
  if (!room?.playerDeviceId || room.playerDeviceId !== deviceId) return

  await updateDoc(doc(getDb(), 'rooms', roomId), {
    playerLastSeenAt: null,
    playerDeviceId: null,
  })
}

export async function setMemberPlaybackRole(
  roomId: string,
  memberUserId: string,
  role: AssignableMemberRole,
  hostUserId: string,
): Promise<void> {
  const room = await getRoom(roomId)
  if (!room) {
    throw new Error('Room not found.')
  }
  if (room.hostUserId !== hostUserId) {
    throw new Error('Only the host can change playback permissions.')
  }
  if (memberUserId === room.hostUserId) {
    throw new Error('The host always has playback control.')
  }

  await updateDoc(doc(getDb(), 'rooms', roomId, 'members', memberUserId), {
    role,
  })
}

export function subscribeToRoom(
  roomId: string,
  onChange: (room: KaraokeRoom | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(getDb(), 'rooms', roomId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null)
        return
      }
      onChange(mapRoom(snapshot.id, snapshot.data()))
    },
    (error) => onError?.(error),
  )
}

export function subscribeToRoomMembers(
  roomId: string,
  onChange: (members: RoomMember[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(getDb(), 'rooms', roomId, 'members'),
    (snapshot) => {
      const members = snapshot.docs
        .map((docSnap) => mapMember(docSnap.id, docSnap.data()))
        .sort((a, b) => {
          const rankDiff = roleSortRank(a.role) - roleSortRank(b.role)
          if (rankDiff !== 0) return rankDiff
          return a.displayName.localeCompare(b.displayName)
        })
      onChange(members)
    },
    (error) => onError?.(error),
  )
}

export async function updateRoomSettings(
  roomId: string,
  settings: RoomSettings,
  memberSongLimits: { userId: string; limit: SongLimit | 'default' }[],
): Promise<void> {
  try {
    await httpsCallable(
      getFirebaseFunctions(),
      'updateRoomSettings',
    )({ roomId, settings, memberSongLimits })
  } catch (error) {
    throw new Error(
      getCallableErrorMessage(error, 'Could not save room settings.'),
    )
  }
}
