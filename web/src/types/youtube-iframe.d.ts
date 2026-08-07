declare namespace YT {
  class Player {
    constructor(elementId: string | HTMLElement, options: PlayerOptions)
    destroy(): void
    playVideo(): void
    pauseVideo(): void
    stopVideo(): void
    seekTo(seconds: number, allowSeekAhead: boolean): void
    loadVideoById(videoId: string): void
    cueVideoById(videoId: string): void
    getPlayerState(): number
  }

  interface PlayerOptions {
    width?: string | number
    height?: string | number
    videoId?: string
    playerVars?: Record<string, string | number | boolean>
    events?: {
      onReady?: (event: PlayerEvent) => void
      onStateChange?: (event: OnStateChangeEvent) => void
      onError?: (event: OnErrorEvent) => void
    }
  }

  interface PlayerEvent {
    target: Player
  }

  interface OnStateChangeEvent {
    data: number
    target: Player
  }

  interface OnErrorEvent {
    data: number
    target: Player
  }

  const PlayerState: {
    ENDED: number
    PLAYING: number
    PAUSED: number
    BUFFERING: number
    CUED: number
  }
}
