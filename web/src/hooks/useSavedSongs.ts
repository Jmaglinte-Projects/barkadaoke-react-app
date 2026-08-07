import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  queueItemToBookmarkable,
  subscribeToSavedSongs,
  toggleSavedSong,
} from '@/firebase/bookmarks'
import { useAuth } from '@/hooks/useAuth'
import type { BookmarkableSong, SavedSong } from '@/types/saved-song'
import type { QueueItem } from '@/types/queue'

export function useSavedSongs() {
  const { user } = useAuth()
  const [songs, setSongs] = useState<SavedSong[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingVideoId, setPendingVideoId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setSongs([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const unsubscribe = subscribeToSavedSongs(
      user.uid,
      (items) => {
        setSongs(items)
        setIsLoading(false)
        setError(null)
      },
      (err) => {
        setError(err.message)
        setIsLoading(false)
      },
    )

    return unsubscribe
  }, [user])

  const savedVideoIds = useMemo(
    () => new Set(songs.map((song) => song.videoId)),
    [songs],
  )

  const isSaved = useCallback(
    (videoId: string | undefined | null) =>
      Boolean(videoId && savedVideoIds.has(videoId)),
    [savedVideoIds],
  )

  const toggleBookmark = useCallback(
    async (song: BookmarkableSong) => {
      if (!user) return
      const wasSaved = savedVideoIds.has(song.videoId)
      setPendingVideoId(song.videoId)
      try {
        const nowSaved = await toggleSavedSong(user.uid, song, wasSaved)
        toast.message(nowSaved ? 'Song saved' : 'Removed from saved')
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Could not update saved songs',
        )
      } finally {
        setPendingVideoId(null)
      }
    },
    [user, savedVideoIds],
  )

  const toggleQueueItemBookmark = useCallback(
    async (item: QueueItem) => {
      await toggleBookmark(queueItemToBookmarkable(item))
    },
    [toggleBookmark],
  )

  return {
    songs,
    isLoading,
    error,
    isSaved,
    pendingVideoId,
    toggleBookmark,
    toggleQueueItemBookmark,
  }
}
