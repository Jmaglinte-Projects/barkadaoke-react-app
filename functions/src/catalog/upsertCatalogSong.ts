import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions'

import { fetchYoutubeVideoMetadata } from './fetchYoutubeVideo'
import {
  buildSearchTokens,
  catalogSongId,
  normalizeSearchText,
} from './normalize'
import type { CatalogSongInput, UpsertCatalogSongResult } from './types'

/**
 * Trusted catalog upsert with select-time YouTube metadata refresh.
 *
 * - Calls videos.list for the selected videoId
 * - Updates title/thumbnail/channel when YouTube returns fresh data
 * - Marks unavailable (and throws) when the video is deleted/private
 * - On YouTube API failure: still upserts client-provided metadata so karaoke
 *   is not blocked by a transient refresh outage
 */
export async function upsertCatalogSong(
  input: CatalogSongInput,
  apiKey: string,
): Promise<UpsertCatalogSongResult> {
  const videoId = String(input.videoId ?? '').trim()
  if (!videoId) {
    throw new HttpsError('invalid-argument', 'Missing video id.')
  }

  const fallbackTitle = String(input.title ?? '').trim() || 'Untitled'
  const fallbackThumbnail = String(input.thumbnailUrl ?? '')
  const fallbackChannel = String(input.channelTitle ?? '').trim() || 'YouTube'

  let title = fallbackTitle
  let thumbnailUrl = fallbackThumbnail
  let channelTitle = fallbackChannel
  let refreshed = false
  let available = true

  const lookup = await fetchYoutubeVideoMetadata(videoId, apiKey)

  if (lookup.status === 'found') {
    title = lookup.video.title
    thumbnailUrl = lookup.video.thumbnailUrl
    channelTitle = lookup.video.channelTitle
    refreshed = true
    available = true
  } else if (lookup.status === 'missing') {
    available = false
  } else {
    logger.warn('Catalog upsert continuing without YouTube refresh', {
      videoId,
      message: lookup.message,
    })
  }

  const normalizedTitle = normalizeSearchText(title)
  const searchTokens = buildSearchTokens(normalizedTitle)
  const docId = catalogSongId(videoId)
  const db = getFirestore()
  const ref = db.collection('songs').doc(docId)

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const now = FieldValue.serverTimestamp()

    if (!snap.exists) {
      tx.set(ref, {
        source: 'youtube',
        videoId,
        title,
        thumbnailUrl,
        channelTitle,
        normalizedTitle,
        searchTokens,
        available,
        createdAt: now,
        lastUsedAt: now,
        lastCheckedAt: lookup.status === 'error' ? null : now,
        unavailableAt: available ? null : now,
        usageCount: 1,
      })
      return
    }

    const existing = snap.data() ?? {}
    const usageCount = Number(existing.usageCount ?? 0) + 1

    tx.update(ref, {
      title,
      thumbnailUrl,
      channelTitle,
      normalizedTitle,
      searchTokens,
      available,
      lastUsedAt: now,
      lastCheckedAt: lookup.status === 'error' ? existing.lastCheckedAt ?? null : now,
      unavailableAt: available ? null : now,
      usageCount,
    })
  })

  if (!available) {
    throw new HttpsError(
      'not-found',
      'This video is no longer available on YouTube.',
    )
  }

  return {
    videoId,
    title,
    thumbnailUrl,
    channelTitle,
    source: 'youtube',
    available: true,
    refreshed,
  }
}
