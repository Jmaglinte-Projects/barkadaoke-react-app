export type SongSearchResult = {
  videoId: string
  title: string
  thumbnailUrl: string
  channelTitle: string
  source: 'youtube'
  resultSource: 'catalog' | 'youtube'
}

export type SearchMode = 'catalog' | 'catalog+youtube' | 'catalog-fallback'

export type PlaybackState =
  | 'idle'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'ended'
  | 'error'
  | 'autoplay_blocked'
