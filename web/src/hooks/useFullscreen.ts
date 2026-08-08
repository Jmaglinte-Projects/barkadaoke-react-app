import { useCallback, useEffect, useState, type RefObject } from 'react'

function getFullscreenElement() {
  return document.fullscreenElement
}

export function useFullscreen(targetRef: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    function sync() {
      const el = targetRef.current
      setIsFullscreen(Boolean(el && getFullscreenElement() === el))
    }

    sync()
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [targetRef])

  const toggleFullscreen = useCallback(async () => {
    const el = targetRef.current
    if (!el) return

    try {
      if (getFullscreenElement() === el) {
        await document.exitFullscreen()
        return
      }

      if (getFullscreenElement()) {
        await document.exitFullscreen()
      }

      await el.requestFullscreen()
    } catch {
      // Browser may deny without a user gesture, or fullscreen may be unsupported.
    }
  }, [targetRef])

  return { isFullscreen, toggleFullscreen }
}
