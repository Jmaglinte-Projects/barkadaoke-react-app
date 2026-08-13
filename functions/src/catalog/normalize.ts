/** Shared search text normalization for catalog store + query. */

const PUNCTUATION_RE = /[^\p{L}\p{N}\s]+/gu

export function normalizeSearchText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(PUNCTUATION_RE, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Tokens used for Firestore `array-contains` search.
 * Keeps short tokens (e.g. "214") so numeric song titles remain findable.
 */
export function buildSearchTokens(normalized: string): string[] {
  if (!normalized) return []
  const seen = new Set<string>()
  const tokens: string[] = []
  for (const part of normalized.split(' ')) {
    if (!part || seen.has(part)) continue
    seen.add(part)
    tokens.push(part)
  }
  return tokens
}

/** Common karaoke noise — avoided when picking the primary Firestore token. */
const PRIMARY_TOKEN_STOPWORDS = new Set([
  'karaoke',
  'version',
  'official',
  'lyric',
  'lyrics',
  'instrumental',
  'hd',
  'hq',
  'mv',
  'the',
  'a',
  'an',
  'and',
  'or',
  'of',
  'to',
  'for',
  'with',
  'by',
])

/**
 * Choose the best token for a Firestore `array-contains` query.
 * Prefers longer non-stopword tokens so "214 karaoke" queries on "214".
 */
export function pickPrimarySearchToken(tokens: string[]): string | null {
  if (tokens.length === 0) return null

  const ranked = [...tokens].sort((a, b) => {
    const aStop = PRIMARY_TOKEN_STOPWORDS.has(a) ? 1 : 0
    const bStop = PRIMARY_TOKEN_STOPWORDS.has(b) ? 1 : 0
    if (aStop !== bStop) return aStop - bStop
    return b.length - a.length
  })

  return ranked[0] ?? null
}

export function catalogSongId(videoId: string): string {
  return `youtube_${videoId}`
}
