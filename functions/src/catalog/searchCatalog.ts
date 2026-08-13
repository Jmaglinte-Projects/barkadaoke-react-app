import { getFirestore } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions'

import {
  buildSearchTokens,
  normalizeSearchText,
  pickPrimarySearchToken,
} from './normalize'
import type { CatalogSong, SongSearchResult } from './types'

/** Skip YouTube Search when local catalog already has this many useful hits. */
export const LOCAL_RESULT_THRESHOLD = 5

const CANDIDATE_LIMIT = 40

type CatalogDoc = Omit<CatalogSong, 'id'> & { id?: string }

/**
 * Simple Firestore-compatible catalog search.
 *
 * Strategy:
 * 1. Normalize query → tokens
 * 2. `array-contains` on the primary token (avoids composite indexes)
 * 3. Filter in memory for remaining tokens + available !== false
 * 4. Rank: token coverage / title prefix match first, then usageCount, then lastUsedAt
 *
 * Limitations (by design — no external search engine):
 * - Not fuzzy / typo-tolerant
 * - Multi-word queries require the primary token to appear in searchTokens
 * - Only finds songs previously selected into the catalog (queue/bookmark)
 */
export async function searchCatalog(
  rawQuery: string,
  limit = LOCAL_RESULT_THRESHOLD,
): Promise<SongSearchResult[]> {
  const normalized = normalizeSearchText(rawQuery)
  const queryTokens = buildSearchTokens(normalized)
  const primary = pickPrimarySearchToken(queryTokens)

  if (!primary) return []

  const db = getFirestore()
  let snapshot
  try {
    snapshot = await db
      .collection('songs')
      .where('searchTokens', 'array-contains', primary)
      .limit(CANDIDATE_LIMIT)
      .get()
  } catch (error) {
    logger.error('Catalog search query failed', error)
    return []
  }

  const scored: Array<{ score: number; result: SongSearchResult }> = []

  for (const doc of snapshot.docs) {
    const data = doc.data() as CatalogDoc
    if (data.available === false) continue

    const videoId = String(data.videoId ?? '')
    if (!videoId) continue

    const title = String(data.title ?? 'Untitled')
    const normalizedTitle =
      String(data.normalizedTitle ?? '') || normalizeSearchText(title)
    const docTokens =
      Array.isArray(data.searchTokens) && data.searchTokens.length > 0
        ? data.searchTokens.map(String)
        : buildSearchTokens(normalizedTitle)

    // All query tokens should appear in the title tokens when possible.
    const matched = queryTokens.filter((token) => docTokens.includes(token))
    if (matched.length === 0) continue
    // Require at least half the query tokens for multi-token queries.
    if (queryTokens.length >= 2 && matched.length < Math.ceil(queryTokens.length / 2)) {
      continue
    }

    const coverage = matched.length / queryTokens.length
    const prefixBonus = normalizedTitle.startsWith(normalized) ? 2 : 0
    const includesBonus = normalizedTitle.includes(normalized) ? 1 : 0
    const usage = Number(data.usageCount ?? 0)
    const lastUsedMs = timestampToMillis(data.lastUsedAt)

    // Relevance dominates; popularity is a tie-breaker only.
    const score =
      coverage * 100 +
      prefixBonus * 20 +
      includesBonus * 10 +
      Math.min(usage, 50) * 0.1 +
      lastUsedMs / 1e15

    scored.push({
      score,
      result: {
        videoId,
        title,
        thumbnailUrl: String(data.thumbnailUrl ?? ''),
        channelTitle: String(data.channelTitle ?? 'YouTube'),
        source: 'youtube',
        resultSource: 'catalog',
      },
    })
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, Math.max(limit, LOCAL_RESULT_THRESHOLD)).map((s) => s.result)
}

function timestampToMillis(value: unknown): number {
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof (value as { toMillis?: () => number }).toMillis === 'function'
  ) {
    return (value as { toMillis: () => number }).toMillis()
  }
  return 0
}
