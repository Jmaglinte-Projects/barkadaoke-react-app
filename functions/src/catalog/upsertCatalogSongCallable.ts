import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'

import { upsertCatalogSong } from './upsertCatalogSong'
import type { CatalogSongInput, UpsertCatalogSongResult } from './types'

const youtubeApiKey = defineSecret('YOUTUBE_API_KEY')

/**
 * Client entry point for select-time catalog writes (queue add / bookmark).
 * Clients cannot write trusted catalog fields directly — see firestore.rules.
 */
export const upsertCatalogSongCallable = onCall(
  {
    secrets: [youtubeApiKey],
    cors: true,
  },
  async (request): Promise<UpsertCatalogSongResult> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in to save songs.')
    }

    const data = (request.data ?? {}) as CatalogSongInput
    const apiKey = youtubeApiKey.value()
    if (!apiKey) {
      throw new HttpsError(
        'failed-precondition',
        'YouTube API key is not configured on the server.',
      )
    }

    return upsertCatalogSong(data, apiKey)
  },
)
