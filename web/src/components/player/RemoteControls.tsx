import {
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  StepForward,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PlaybackCommandType } from '@/types/room'
import type { PlaybackState } from '@/types/youtube'

type RemoteControlsProps = {
  playbackState: PlaybackState
  disabled?: boolean
  pendingCommand?: PlaybackCommandType | null
  hasCurrentSong?: boolean
  hasUpcomingSong?: boolean
  playerOnline?: boolean
  onCommand: (type: PlaybackCommandType) => void
}

export function RemoteControls({
  playbackState,
  disabled = false,
  pendingCommand = null,
  hasCurrentSong = false,
  hasUpcomingSong = false,
  playerOnline = false,
  onCommand,
}: RemoteControlsProps) {
  const isPlaying = playbackState === 'playing'
  const locked = disabled || !playerOnline
  const canStart = hasUpcomingSong
  const canPlayPause = hasCurrentSong
  // Next/Start only when something is queued after (or instead of) the current song.
  const canNext = hasUpcomingSong
  const canSkip = hasCurrentSong && hasUpcomingSong
  const canRestart = hasCurrentSong

  const controlClass =
    'h-16 w-full justify-center gap-2 text-base font-semibold active:scale-[0.98]'

  return (
    <div className="space-y-3">
      {!playerOnline ? (
        <p className="rounded-md border border-border bg-canvas-soft/60 px-3 py-2 text-center text-sm text-body">
          No player connected
        </p>
      ) : null}

      <div
        className="grid grid-cols-2 gap-3"
        role="toolbar"
        aria-label="Remote playback controls"
      >
        {isPlaying && hasCurrentSong ? (
          <Button
            type="button"
            size="lg"
            className={controlClass}
            disabled={locked || !canPlayPause}
            onClick={() => onCommand('pause')}
          >
            <Pause data-icon="inline-start" />
            {pendingCommand === 'pause' ? 'Pausing…' : 'Pause'}
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            className={controlClass}
            disabled={locked || !(canPlayPause || canStart)}
            onClick={() => onCommand('play')}
          >
            <Play data-icon="inline-start" />
            {pendingCommand === 'play' ? 'Starting…' : 'Play'}
          </Button>
        )}

        <Button
          type="button"
          size="lg"
          className={controlClass}
          disabled={locked || !canNext}
          onClick={() => onCommand('next')}
        >
          <StepForward data-icon="inline-start" />
          {pendingCommand === 'next'
            ? 'Next…'
            : hasCurrentSong
              ? 'Next'
              : 'Start'}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className={cn(controlClass, 'bg-background')}
          disabled={locked || !canRestart}
          onClick={() => onCommand('restart')}
        >
          <RotateCcw data-icon="inline-start" />
          {pendingCommand === 'restart' ? 'Restarting…' : 'Restart'}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className={cn(controlClass, 'bg-background')}
          disabled={locked || !canSkip}
          onClick={() => onCommand('skip')}
        >
          <SkipForward data-icon="inline-start" />
          {pendingCommand === 'skip' ? 'Skipping…' : 'Skip'}
        </Button>
      </div>
    </div>
  )
}
