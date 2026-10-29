import { httpsCallable } from 'firebase/functions'

import { getFirebaseFunctions } from '@/firebase/config'

export type UpsertCatalogSongInput = {
  videoId: string
  title: string
  thumbnailUrl: string
  channelTitle?: string
}

export type UpsertCatalogSongResult = {
  videoId: string
  title: string
  thumbnailUrl: string
  channelTitle: string
  source: 'youtube'
  available: boolean
  refreshed: boolean
}

/**
 * Select-time catalog upsert: refreshes YouTube metadata server-side and
 * writes/updates songs/youtube_{videoId}. Throws if the video is unavailable.
 */
export async function upsertCatalogSong(
  song: UpsertCatalogSongInput,
): Promise<UpsertCatalogSongResult> {
  const callable = httpsCallable<
    UpsertCatalogSongInput,
    UpsertCatalogSongResult
  >(getFirebaseFunctions(), 'upsertCatalogSongCallable')

  const result = await callable({
    videoId: song.videoId,
    title: song.title,
    thumbnailUrl: song.thumbnailUrl,
    channelTitle: song.channelTitle,
  })

  return result.data
}

export function getCallableErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: string }).message ?? '')
    if (message) {
      // Firebase callable errors often look like "FirebaseError: This video..."
      return message.replace(/^Firebase:?\s*/i, '').replace(/^Error:\s*/i, '')
    }
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}
