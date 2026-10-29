import { RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { usePwaUpdate } from '@/hooks/usePwaUpdate'

export function PwaUpdatePrompt() {
  const { needRefresh, dismissUpdate, applyUpdate } = usePwaUpdate()

  return (
    <Dialog
      open={needRefresh}
      onOpenChange={(open) => !open && dismissUpdate()}
    >
      <DialogContent
        showCloseButton={false}
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>New update available</DialogTitle>
          <DialogDescription>
            A newer version of Barkadaoke is ready. Reload to get the latest
            features and fixes.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={dismissUpdate}>
            Later
          </Button>
          <Button type="button" onClick={applyUpdate}>
            <RefreshCw />
            Update now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
