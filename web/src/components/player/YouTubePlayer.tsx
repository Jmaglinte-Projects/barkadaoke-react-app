import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import {
  Maximize2,
  Minimize2,
  PanelBottomClose,
  PanelBottomOpen,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { loadYouTubeIframeApi, YTPlayerState } from '@/lib/youtube-iframe'
import { cn } from '@/lib/utils'
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
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
  /** Use a taller fill layout on short landscape viewports. */
  fillViewport?: boolean
  showControlsToggle?: boolean
  controlsVisible?: boolean
  onToggleControls?: () => void
  className?: string
}

export const YouTubePlayer = forwardRef<
  YouTubePlayerHandle,
  YouTubePlayerProps
>(function YouTubePlayer(
  {
    song,
    playbackState,
    onPlaybackStateChange,
    onEnded,
    isFullscreen = false,
    onToggleFullscreen,
    fillViewport = false,
    showControlsToggle = false,
    controlsVisible = true,
    onToggleControls,
    className,
  },
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
            // HostControls own playback — native UI steals focus/clicks.
            controls: 0,
            disablekb: 1,
            fs: 0,
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

  const shellClass = cn(
    'relative isolate w-full max-w-full overflow-hidden border border-border',
    isFullscreen || fillViewport
      ? 'h-full min-h-0 flex-1 rounded-none border-0 bg-black'
      : 'aspect-video rounded-md',
    song ? 'bg-black' : 'bg-canvas-soft',
    className,
  )

  const overlayButtons =
    onToggleFullscreen != null || showControlsToggle ? (
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
        {showControlsToggle && onToggleControls ? (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="size-10 bg-background/90 shadow-sm backdrop-blur-sm"
            aria-label={controlsVisible ? 'Hide controls' : 'Show controls'}
            title={controlsVisible ? 'Hide controls' : 'Show controls'}
            onClick={onToggleControls}
          >
            {controlsVisible ? <PanelBottomClose /> : <PanelBottomOpen />}
          </Button>
        ) : null}
        {onToggleFullscreen != null ? (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="size-10 bg-background/90 shadow-sm backdrop-blur-sm"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
            onClick={onToggleFullscreen}
          >
            {isFullscreen ? <Minimize2 /> : <Maximize2 />}
          </Button>
        ) : null}
      </div>
    ) : null

  if (!song) {
    return (
      <div className={shellClass}>
        <div className="flex size-full flex-col items-center justify-center gap-2 p-6 text-center">
          <p className="eyebrow-mono text-mute">Ready when you are</p>
          <p className="text-body">
            Press Play or Start when a song is in the queue.
          </p>
        </div>
        {overlayButtons}
      </div>
    )
  }

  return (
    // Absolute fill keeps the YouTube iframe inside the 16:9 box on mobile;
    // otherwise the API iframe can overflow and cover content below.
    <div className={shellClass}>
      <div className="absolute inset-0 [&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:h-full [&>iframe]:w-full [&>iframe]:border-0">
        <div id={containerId} className="h-full w-full" />
      </div>

      {/* Keep clicks/focus on the page so Space / N / S / R keep working. */}
      {isReady && !apiError ? (
        <div
          className="absolute inset-0 z-1"
          aria-hidden="true"
          onMouseDown={(event) => {
            event.preventDefault()
          }}
          onClick={() => {
            if (showControlsToggle && controlsVisible) {
              onToggleControls?.()
            }
          }}
          onDoubleClick={() => {
            onToggleFullscreen?.()
          }}
        />
      ) : null}

      {overlayButtons}

      {!isReady && !apiError ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-canvas-soft/80">
          <p className="text-sm text-body">Loading player…</p>
        </div>
      ) : null}

      {apiError ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-canvas-soft p-6 text-center">
          <p className="text-sm text-destructive">{apiError}</p>
          <p className="text-xs text-mute">{song.title}</p>
        </div>
      ) : null}

      {playbackState === 'autoplay_blocked' ? (
        <div className="absolute inset-x-0 bottom-0 z-10 bg-background/90 px-4 py-2 text-center text-xs text-body">
          Autoplay blocked — press Play to start.
        </div>
      ) : null}

      {playbackState === 'ended' ? (
        <div className="absolute inset-x-0 bottom-0 z-10 bg-background/90 px-4 py-2 text-center text-xs text-body">
          Song ended — queue is empty. Add another song or press Start.
        </div>
      ) : null}
    </div>
  )
})
