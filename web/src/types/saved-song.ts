export type SavedSong = {
  videoId: string
  title: string
  thumbnailUrl: string
  channelTitle: string
  savedAt: string
}

export type BookmarkableSong = {
  videoId: string
  title: string
  thumbnailUrl: string
  channelTitle?: string
}
