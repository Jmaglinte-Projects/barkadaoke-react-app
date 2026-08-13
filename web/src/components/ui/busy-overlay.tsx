import { Loader2 } from 'lucide-react'

type BusyOverlayProps = {
  label?: string
}

export function BusyOverlay({ label = 'Adding…' }: BusyOverlayProps) {
  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-[1px]"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm">
        <Loader2 className="size-4 animate-spin text-primary" />
        <span>{label}</span>
      </div>
    </div>
  )
}
