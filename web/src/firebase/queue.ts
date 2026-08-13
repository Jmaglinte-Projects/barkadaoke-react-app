import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'

import { getDb } from '@/firebase/config'
import {
  getCallableErrorMessage,
  upsertCatalogSong,
} from '@/firebase/catalog'
import { mapQueueItem } from '@/firebase/mappers'
import { getNextSong, getUpcomingQueue } from '@/lib/queue'
import {
  MAX_UPCOMING_SONGS_PER_USER,
  type QueueItem,
} from '@/types/queue'
import type { UserProfile } from '@/types/user'
import type { SongSearchResult } from '@/types/youtube'

export function subscribeToQueue(
  roomId: string,
  onChange: (items: QueueItem[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(
      collection(getDb(), 'rooms', roomId, 'queue'),
      orderBy('order', 'asc'),
    ),
    (snapshot) => {
      onChange(snapshot.docs.map((docSnap) => mapQueueItem(docSnap.id, docSnap.data())))
    },
    (error) => onError?.(error),
  )
}

async function getNextOrder(roomId: string): Promise<number> {
  const snapshot = await getDocs(collection(getDb(), 'rooms', roomId, 'queue'))
  let maxOrder = 0
  for (const docSnap of snapshot.docs) {
    const order = Number(docSnap.data().order ?? 0)
    if (order > maxOrder) maxOrder = order
  }
  return maxOrder + 1
}

export async function addSongToQueue(
  roomId: string,
  user: UserProfile,
  song: SongSearchResult,
  existingQueue: QueueItem[],
): Promise<void> {
  const myUpcomingCount = getUpcomingQueue(existingQueue).filter(
    (item) => item.singerUserId === user.uid,
  ).length
  if (myUpcomingCount >= MAX_UPCOMING_SONGS_PER_USER) {
    throw new Error(
      `You can only have ${MAX_UPCOMING_SONGS_PER_USER} upcoming songs at a time.`,
    )
  }

  // Select-time catalog upsert refreshes metadata and rejects deleted videos.
  let title = song.title
  let thumbnailUrl = song.thumbnailUrl
  try {
    const catalog = await upsertCatalogSong({
      videoId: song.videoId,
      title: song.title,
      thumbnailUrl: song.thumbnailUrl,
      channelTitle: song.channelTitle,
    })
    title = catalog.title
    thumbnailUrl = catalog.thumbnailUrl
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code?: string }).code)
        : ''
    if (code.includes('not-found')) {
      throw new Error(
        getCallableErrorMessage(
          error,
          'This video is no longer available on YouTube.',
        ),
      )
    }
    // Undeployed callable / missing API key: queue with search metadata.
  }

  const order = await getNextOrder(roomId)
  await addDoc(collection(getDb(), 'rooms', roomId, 'queue'), {
    youtubeVideoId: song.videoId,
    title,
    thumbnailUrl,
    singerUserId: user.uid,
    singerName: user.displayName,
    singerPhotoURL: user.photoURL ?? null,
    status: 'queued',
    order,
    createdAt: serverTimestamp(),
  })
}

export async function removeQueueItem(
  roomId: string,
  item: QueueItem,
  actorUserId: string,
  isHost: boolean,
): Promise<void> {
  if (!isHost && item.singerUserId !== actorUserId) {
    throw new Error('You can only remove your own songs.')
  }

  await updateDoc(doc(getDb(), 'rooms', roomId, 'queue', item.id), {
    status: 'removed',
    completedAt: serverTimestamp(),
  })
}

export async function advanceQueue(
  roomId: string,
  queue: QueueItem[],
  currentQueueItemId: string | null,
  mode: 'next' | 'skip',
): Promise<void> {
  const db = getDb()
  const batch = writeBatch(db)
  const nextSong = getNextSong(queue)

  if (currentQueueItemId) {
    batch.update(doc(db, 'rooms', roomId, 'queue', currentQueueItemId), {
      status: mode === 'skip' ? 'skipped' : 'completed',
      completedAt: serverTimestamp(),
    })
  }

  if (nextSong) {
    batch.update(doc(db, 'rooms', roomId, 'queue', nextSong.id), {
      status: 'playing',
      startedAt: serverTimestamp(),
    })
    batch.update(doc(db, 'rooms', roomId), {
      currentQueueItemId: nextSong.id,
      playbackState: 'ready',
      status: 'active',
      updatedAt: serverTimestamp(),
    })
  } else {
    batch.update(doc(db, 'rooms', roomId), {
      currentQueueItemId: null,
      playbackState: 'idle',
      updatedAt: serverTimestamp(),
    })
  }

  await batch.commit()
}

export async function startFirstSong(
  roomId: string,
  queue: QueueItem[],
): Promise<void> {
  const nextSong = getNextSong(queue)
  if (!nextSong) {
    throw new Error('Queue is empty.')
  }

  const db = getDb()
  const batch = writeBatch(db)
  batch.update(doc(db, 'rooms', roomId, 'queue', nextSong.id), {
    status: 'playing',
    startedAt: serverTimestamp(),
  })
  batch.update(doc(db, 'rooms', roomId), {
    currentQueueItemId: nextSong.id,
    playbackState: 'playing',
    status: 'active',
    updatedAt: serverTimestamp(),
  })
  await batch.commit()
}
