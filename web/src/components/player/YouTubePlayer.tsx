import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'

import { loadYouTubeIframeApi, YTPlayerState } from '@/lib/youtube-iframe'
import type { QueueItem } from '@/types/queue'
import type { PlaybackState } from '@/types/youtube'

export type YouTubePlayerHandle = {
  play: () => void
  pause: () => void
  restart: () => void
}

type YouTubePlayerProps = {
  song: QueueItem | null
  playbackState: PlaybackState
  onPlaybackStateChange?: (state: PlaybackState) => void
  onEnded?: () => void
}

export const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(
  function YouTubePlayer(
    { song, playbackState, onPlaybackStateChange, onEnded },
    ref,
  ) {
    const reactId = useId().replace(/:/g, '')
    const containerId = `yt-player-${reactId}`
    const playerRef = useRef<YT.Player | null>(null)
    const onPlaybackStateChangeRef = useRef(onPlaybackStateChange)
    const onEndedRef = useRef(onEnded)
    const [apiError, setApiError] = useState<string | null>(null)
    const [isReady, setIsReady] = useState(false)

    useEffect(() => {
      onPlaybackStateChangeRef.current = onPlaybackStateChange
    }, [onPlaybackStateChange])

    useEffect(() => {
      onEndedRef.current = onEnded
    }, [onEnded])

    useImperativeHandle(ref, () => ({
      play: () => {
        playerRef.current?.playVideo()
      },
      pause: () => {
        playerRef.current?.pauseVideo()
      },
      restart: () => {
        playerRef.current?.seekTo(0, true)
        playerRef.current?.playVideo()
      },
    }))

    useEffect(() => {
      let cancelled = false

      async function setup() {
        if (!song?.youtubeVideoId) {
          playerRef.current?.destroy()
          playerRef.current = null
          setIsReady(false)
          return
        }

        try {
          await loadYouTubeIframeApi()
          if (cancelled) return

          if (playerRef.current) {
            playerRef.current.loadVideoById(song.youtubeVideoId)
            setApiError(null)
            return
          }

          playerRef.current = new window.YT!.Player(containerId, {
            width: '100%',
            height: '100%',
            videoId: song.youtubeVideoId,
            playerVars: {
              autoplay: 1,
              controls: 1,
              rel: 0,
              modestbranding: 1,
              playsinline: 1,
              origin: window.location.origin,
            },
            events: {
              onReady: (event) => {
                setIsReady(true)
                setApiError(null)
                onPlaybackStateChangeRef.current?.('ready')
                try {
                  event.target.playVideo()
                } catch {
                  onPlaybackStateChangeRef.current?.('autoplay_blocked')
                }
              },
              onStateChange: (event) => {
                if (event.data === YTPlayerState.PLAYING) {
                  onPlaybackStateChangeRef.current?.('playing')
                } else if (event.data === YTPlayerState.PAUSED) {
                  onPlaybackStateChangeRef.current?.('paused')
                } else if (event.data === YTPlayerState.ENDED) {
                  onPlaybackStateChangeRef.current?.('ended')
                  onEndedRef.current?.()
                } else if (event.data === YTPlayerState.CUED) {
                  onPlaybackStateChangeRef.current?.('ready')
                }
              },
              onError: () => {
                setApiError('This video cannot be played here.')
                onPlaybackStateChangeRef.current?.('error')
              },
            },
          })
        } catch (error) {
          if (!cancelled) {
            setApiError(
              error instanceof Error
                ? error.message
                : 'Failed to initialize YouTube player',
            )
          }
        }
      }

      void setup()

      return () => {
        cancelled = true
      }
    }, [containerId, song?.youtubeVideoId])

    useEffect(() => {
      return () => {
        playerRef.current?.destroy()
        playerRef.current = null
      }
    }, [])

    if (!song) {
      return (
        <div className="relative aspect-video w-full overflow-hidden rounded-md border border-border bg-canvas-soft">
          <div className="flex size-full flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="eyebrow-mono text-mute">Ready when you are</p>
            <p className="text-body">
              Press Play or Start when a song is in the queue.
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-md border border-border bg-black">
        <div id={containerId} className="size-full" />

        {!isReady && !apiError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-canvas-soft/80">
            <p className="text-sm text-body">Loading player…</p>
          </div>
        ) : null}

        {apiError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-canvas-soft p-6 text-center">
            <p className="text-sm text-destructive">{apiError}</p>
            <p className="text-xs text-mute">{song.title}</p>
          </div>
        ) : null}

        {playbackState === 'autoplay_blocked' ? (
          <div className="absolute inset-x-0 bottom-0 bg-background/90 px-4 py-2 text-center text-xs text-body">
            Autoplay blocked — press Play to start.
          </div>
        ) : null}

        {playbackState === 'ended' ? (
          <div className="absolute inset-x-0 bottom-0 bg-background/90 px-4 py-2 text-center text-xs text-body">
            Song ended — queue is empty. Add another song or press Start.
          </div>
        ) : null}
      </div>
    )
  },
)
