import { useEffect, type ReactNode } from 'react'
import {
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  StepForward,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PlaybackState } from '@/types/youtube'

type HostControlsProps = {
  playbackState: PlaybackState
  onPlay: () => void
  onPause: () => void
  onRestart: () => void
  onNext: () => void
  onSkip: () => void
  onToggleFullscreen?: () => void
  isFullscreen?: boolean
  /** Dense toolbar for mobile landscape overlays. */
  compact?: boolean
  disabled?: boolean
  hasCurrentSong?: boolean
  hasUpcomingSong?: boolean
  className?: string
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

export function HostControls({
  playbackState,
  onPlay,
  onPause,
  onRestart,
  onNext,
  onSkip,
  onToggleFullscreen,
  isFullscreen = false,
  compact = false,
  disabled = false,
  hasCurrentSong = false,
  hasUpcomingSong = false,
  className,
}: HostControlsProps) {
  const isPlaying = playbackState === 'playing'
  const canStart = hasUpcomingSong
  const canPlayPause = hasCurrentSong
  // Next/Start only when something is queued after (or instead of) the current song.
  const canNext = hasUpcomingSong
  const canSkip = hasCurrentSong && hasUpcomingSong
  const canRestart = hasCurrentSong

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target)) return
      // Don't steal keys while focus is on a link/button that isn't ours.
      if (
        event.target instanceof HTMLElement &&
        event.target.closest('a[href]')
      ) {
        return
      }

      const key = event.key

      if (
        key === ' ' ||
        key === 'k' ||
        key === 'K' ||
        key === 'MediaPlayPause'
      ) {
        if (disabled) return
        if (isPlaying && canPlayPause) {
          event.preventDefault()
          onPause()
          return
        }
        if (canPlayPause || canStart) {
          event.preventDefault()
          onPlay()
        }
        return
      }

      if (
        key === 'n' ||
        key === 'N' ||
        key === 'ArrowRight' ||
        key === 'MediaTrackNext'
      ) {
        if (disabled || !canNext) return
        event.preventDefault()
        onNext()
        return
      }

      if (key === 's' || key === 'S') {
        if (disabled || !canSkip) return
        event.preventDefault()
        onSkip()
        return
      }

      if (key === 'r' || key === 'R') {
        if (disabled || !canRestart) return
        event.preventDefault()
        onRestart()
        return
      }

      if (key === 'f' || key === 'F') {
        if (!onToggleFullscreen) return
        event.preventDefault()
        onToggleFullscreen()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    canNext,
    canPlayPause,
    canRestart,
    canSkip,
    canStart,
    disabled,
    isPlaying,
    onNext,
    onPause,
    onPlay,
    onRestart,
    onSkip,
    onToggleFullscreen,
  ])

  const controlClass = compact
    ? 'h-10 min-w-0 flex-1 justify-center gap-1.5 px-2 text-sm focus-visible:ring-4'
    : 'h-10 min-w-[7.5rem] justify-between gap-2 px-3 text-sm focus-visible:ring-4 sm:min-w-[8.5rem]'

  return (
    <div
      className={cn(
        compact
          ? 'rounded-md border border-border/80 bg-background/95 px-2 py-2 shadow-lg backdrop-blur-sm'
          : null,
        className,
      )}
    >
      {compact ? null : (
        <div className="mb-2 hidden flex-wrap gap-1.5 sm:flex">
          <ShortcutBadge label="Space" detail="Play / Pause" />
          <ShortcutBadge label="N / →" detail="Next" />
          <ShortcutBadge label="R" detail="Restart" />
          {onToggleFullscreen ? (
            <ShortcutBadge label="F" detail="Fullscreen" />
          ) : null}
        </div>
      )}

      <div
        className={cn(
          compact
            ? 'flex items-center gap-1.5'
            : 'flex flex-wrap items-center gap-2',
        )}
        role="toolbar"
        aria-label="Playback controls"
      >
        {isPlaying && hasCurrentSong ? (
          <Button
            type="button"
            size={compact ? 'default' : 'sm'}
            className={controlClass}
            disabled={disabled}
            title="Pause (Space)"
            onClick={onPause}
          >
            <span className="inline-flex items-center gap-1.5">
              <Pause data-icon="inline-start" />
              Pause
            </span>
            {compact ? null : <Kbd className="hidden sm:inline">Space</Kbd>}
          </Button>
        ) : (
          <Button
            type="button"
            size={compact ? 'default' : 'sm'}
            className={controlClass}
            disabled={disabled || !(canPlayPause || canStart)}
            title="Play (Space)"
            onClick={onPlay}
          >
            <span className="inline-flex items-center gap-1.5">
              <Play data-icon="inline-start" />
              Play
            </span>
            {compact ? null : <Kbd className="hidden sm:inline">Space</Kbd>}
          </Button>
        )}

        <Button
          type="button"
          size={compact ? 'default' : 'sm'}
          className={controlClass}
          disabled={disabled || !canNext}
          title={hasCurrentSong ? 'Next (N)' : 'Start (N)'}
          onClick={onNext}
        >
          <span className="inline-flex items-center gap-1.5">
            <StepForward data-icon="inline-start" />
            {hasCurrentSong ? 'Next' : 'Start'}
          </span>
          {compact ? null : <Kbd className="hidden sm:inline">N</Kbd>}
        </Button>

        <Button
          type="button"
          variant="outline"
          size={compact ? 'default' : 'sm'}
          className={cn(controlClass, !compact && 'bg-background')}
          disabled={disabled || !canRestart}
          title="Restart (R)"
          onClick={onRestart}
        >
          <span className="inline-flex items-center gap-1.5">
            <RotateCcw data-icon="inline-start" />
            {compact ? 'Replay' : 'Restart'}
          </span>
          {compact ? null : <Kbd className="hidden sm:inline">R</Kbd>}
        </Button>

        {onToggleFullscreen && !compact ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(controlClass, 'bg-background')}
            title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
            onClick={onToggleFullscreen}
          >
            <span className="inline-flex items-center gap-1.5">
              {isFullscreen ? (
                <Minimize2 data-icon="inline-start" />
              ) : (
                <Maximize2 data-icon="inline-start" />
              )}
              {isFullscreen ? 'Exit full' : 'Fullscreen'}
            </span>
            <Kbd className="hidden sm:inline">F</Kbd>
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function ShortcutBadge({ label, detail }: { label: string; detail: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-mute">
      <Kbd>{label}</Kbd>
      <span>{detail}</span>
    </span>
  )
}

function Kbd({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <kbd
      className={cn(
        'rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide text-mute',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
