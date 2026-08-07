export type SongSearchResult = {
  videoId: string
  title: string
  thumbnailUrl: string
  channelTitle: string
}

export type PlaybackState =
  | 'idle'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'ended'
  | 'error'
  | 'autoplay_blocked'
