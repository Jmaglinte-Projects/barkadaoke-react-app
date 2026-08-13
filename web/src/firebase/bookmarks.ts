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
import {
  getCallableErrorMessage,
  upsertCatalogSong,
} from '@/firebase/catalog'
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
    source: 'youtube',
    resultSource: 'catalog',
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

  // Refresh metadata + catalog before bookmarking so deleted videos are caught.
  let title = song.title.trim() || 'Untitled'
  let thumbnailUrl = song.thumbnailUrl || ''
  let channelTitle = song.channelTitle?.trim() || ''

  try {
    const catalog = await upsertCatalogSong({
      videoId,
      title,
      thumbnailUrl,
      channelTitle,
    })
    title = catalog.title
    thumbnailUrl = catalog.thumbnailUrl
    channelTitle = catalog.channelTitle
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
    // Undeployed callable / missing API key: bookmark with provided metadata.
  }

  await setDoc(doc(savedSongsCollection(userId), videoId), {
    videoId,
    title,
    thumbnailUrl,
    channelTitle,
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
