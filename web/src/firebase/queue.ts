import {
  collection,
  doc,
  onSnapshot,
  where,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'

import { httpsCallable } from 'firebase/functions'

import { getDb, getFirebaseFunctions } from '@/firebase/config'
import { getCallableErrorMessage, upsertCatalogSong } from '@/firebase/catalog'
import { mapQueueItem } from '@/firebase/mappers'
import { getNextSong } from '@/lib/queue'
import type { QueueItem } from '@/types/queue'
import type { SongSearchResult } from '@/types/youtube'

export function subscribeToQueue(
  roomId: string,
  onChange: (items: QueueItem[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(
      collection(getDb(), 'rooms', roomId, 'queue'),
      // Keep session history out of the live queue and initial download.
      where('status', 'in', ['queued', 'playing']),
    ),
    (snapshot) => {
      onChange(
        snapshot.docs
          .map((docSnap) => mapQueueItem(docSnap.id, docSnap.data()))
          .sort((a, b) => a.order - b.order),
      )
    },
    (error) => onError?.(error),
  )
}

export async function addSongToQueue(
  roomId: string,
  song: SongSearchResult,
): Promise<void> {
  // Select-time catalog upsert refreshes metadata and rejects deleted videos.
  let title = song.title
  try {
    const catalog = await upsertCatalogSong({
      videoId: song.videoId,
      title: song.title,
      thumbnailUrl: song.thumbnailUrl,
      channelTitle: song.channelTitle,
    })
    title = catalog.title
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

  try {
    await httpsCallable(
      getFirebaseFunctions(),
      'addSongToQueue',
    )({
      roomId,
      videoId: song.videoId,
      title,
    })
  } catch (error) {
    throw new Error(
      getCallableErrorMessage(error, 'Could not add song to queue.'),
    )
  }
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
