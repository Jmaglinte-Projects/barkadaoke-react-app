import {
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  collection,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'

import { getDb } from '@/firebase/config'
import { mapSavedSong } from '@/firebase/mappers'
import type { BookmarkableSong, SavedSong } from '@/types/saved-song'
import type { QueueItem } from '@/types/queue'
import type { SongSearchResult } from '@/types/youtube'

function savedSongsCollection(userId: string) {
  return collection(getDb(), 'users', userId, 'savedSongs')
}

export function queueItemToBookmarkable(item: QueueItem): BookmarkableSong {
  return {
    videoId: item.youtubeVideoId,
    title: item.title,
    thumbnailUrl: item.thumbnailUrl,
  }
}

export function savedSongToSearchResult(song: SavedSong): SongSearchResult {
  return {
    videoId: song.videoId,
    title: song.title,
    thumbnailUrl: song.thumbnailUrl,
    channelTitle: song.channelTitle || 'Saved',
  }
}

export async function saveSong(
  userId: string,
  song: BookmarkableSong,
): Promise<void> {
  const videoId = song.videoId.trim()
  if (!videoId) {
    throw new Error('Missing video id.')
  }

  await setDoc(doc(savedSongsCollection(userId), videoId), {
    videoId,
    title: song.title.trim() || 'Untitled',
    thumbnailUrl: song.thumbnailUrl || '',
    channelTitle: song.channelTitle?.trim() || '',
    savedAt: serverTimestamp(),
  })
}

export async function unsaveSong(
  userId: string,
  videoId: string,
): Promise<void> {
  await deleteDoc(doc(savedSongsCollection(userId), videoId))
}

export async function toggleSavedSong(
  userId: string,
  song: BookmarkableSong,
  isSaved: boolean,
): Promise<boolean> {
  if (isSaved) {
    await unsaveSong(userId, song.videoId)
    return false
  }
  await saveSong(userId, song)
  return true
}

export function subscribeToSavedSongs(
  userId: string,
  onChange: (songs: SavedSong[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(savedSongsCollection(userId), orderBy('savedAt', 'desc')),
    (snapshot) => {
      onChange(
        snapshot.docs.map((docSnap) =>
          mapSavedSong(docSnap.id, docSnap.data()),
        ),
      )
    },
    (error) => onError?.(error),
  )
}
