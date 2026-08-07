import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { SongSearchResult as SongSearchResultType } from '@/types/youtube'

type SongSearchResultProps = {
  result: SongSearchResultType
  onAdd: (result: SongSearchResultType) => void
  disabled?: boolean
}

export function SongSearchResultRow({
  result,
  onAdd,
  disabled = false,
}: SongSearchResultProps) {
  return (
    <li className="flex items-center gap-3 border-b border-border py-3 last:border-b-0">
      <img
        src={result.thumbnailUrl}
        alt=""
        className="size-14 shrink-0 rounded-sm object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {result.title}
        </p>
        <p className="truncate text-xs text-mute">{result.channelTitle}</p>
      </div>
      <Button
        size="sm"
        disabled={disabled}
        onClick={() => onAdd(result)}
        aria-label={`Add ${result.title}`}
      >
        <Plus data-icon="inline-start" />
        Add
      </Button>
    </li>
  )
}
