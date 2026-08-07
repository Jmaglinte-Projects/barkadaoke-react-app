import { Bookmark, BookmarkCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type BookmarkButtonProps = {
  saved: boolean
  disabled?: boolean
  onClick: () => void
  className?: string
  size?: 'icon-sm' | 'icon'
}

export function BookmarkButton({
  saved,
  disabled = false,
  onClick,
  className,
  size = 'icon-sm',
}: BookmarkButtonProps) {
  const Icon = saved ? BookmarkCheck : Bookmark

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      disabled={disabled}
      aria-label={saved ? 'Remove saved song' : 'Save song'}
      aria-pressed={saved}
      className={cn(className)}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
    >
      <Icon
        className={cn('size-4', saved ? 'text-primary' : 'text-mute')}
        fill={saved ? 'currentColor' : 'none'}
      />
    </Button>
  )
}
