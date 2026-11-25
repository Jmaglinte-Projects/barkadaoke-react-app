export type SongSearchResult = {
  videoId: string
  title: string
  thumbnailUrl: string
  channelTitle: string
  source: 'youtube'
  resultSource: 'catalog' | 'youtube'
}

export type SearchSource = 'auto' | 'catalog' | 'youtube'

export type SearchFallbackReason =
  | 'quota-exceeded'
  | 'youtube-unavailable'
  | 'not-configured'

export type SearchMode =
  | 'catalog'
  | 'catalog+youtube'
  | 'catalog-fallback'
  | 'youtube'

export type PlaybackState =
  | 'idle'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'ended'
  | 'error'
  | 'autoplay_blocked'
