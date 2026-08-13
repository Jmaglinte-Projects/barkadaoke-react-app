import type { Timestamp } from 'firebase-admin/firestore'

export type CatalogSong = {
  id: string
  source: 'youtube'
  videoId: string
  title: string
  thumbnailUrl: string
  channelTitle: string
  normalizedTitle: string
  searchTokens: string[]
  available: boolean
  createdAt: Timestamp
  lastUsedAt: Timestamp
  lastCheckedAt: Timestamp | null
  unavailableAt: Timestamp | null
  usageCount: number
}

export type SongSearchResult = {
  videoId: string
  title: string
  thumbnailUrl: string
  channelTitle: string
  source: 'youtube'
  resultSource: 'catalog' | 'youtube'
}

export type SearchMode = 'catalog' | 'catalog+youtube' | 'catalog-fallback'

export type SearchVideosResponse = {
  results: SongSearchResult[]
  searchMode: SearchMode
  youtubeSearchSucceeded: boolean
}

export type CatalogSongInput = {
  videoId: string
  title?: string
  thumbnailUrl?: string
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
