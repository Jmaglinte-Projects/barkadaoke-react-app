import {
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  StepForward,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { PlaybackState } from '@/types/youtube'

type HostControlsProps = {
  playbackState: PlaybackState
  onPlay: () => void
  onPause: () => void
  onRestart: () => void
  onNext: () => void
  onSkip: () => void
  disabled?: boolean
  hasCurrentSong?: boolean
  hasUpcomingSong?: boolean
}

export function HostControls({
  playbackState,
  onPlay,
  onPause,
  onRestart,
  onNext,
  onSkip,
  disabled = false,
  hasCurrentSong = false,
  hasUpcomingSong = false,
}: HostControlsProps) {
  const isPlaying = playbackState === 'playing'
  const canStart = hasCurrentSong || hasUpcomingSong

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border bg-background px-4 py-4 md:px-6">
      <Button
        variant="outline"
        size="lg"
        disabled={disabled || !hasCurrentSong}
        onClick={onRestart}
      >
        <RotateCcw data-icon="inline-start" />
        Restart
      </Button>

      {isPlaying && hasCurrentSong ? (
        <Button size="lg" disabled={disabled} onClick={onPause}>
          <Pause data-icon="inline-start" />
          Pause
        </Button>
      ) : (
        <Button size="lg" disabled={disabled || !canStart} onClick={onPlay}>
          <Play data-icon="inline-start" />
          Play
        </Button>
      )}

      <Button
        variant="outline"
        size="lg"
        disabled={disabled || !hasCurrentSong}
        onClick={onSkip}
      >
        <SkipForward data-icon="inline-start" />
        Skip
      </Button>

      <Button
        size="lg"
        disabled={disabled || !canStart}
        onClick={onNext}
      >
        <StepForward data-icon="inline-start" />
        {hasCurrentSong ? 'Next' : 'Start'}
      </Button>
    </div>
  )
}
