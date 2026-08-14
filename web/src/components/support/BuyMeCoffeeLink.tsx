import instapayQr from '@/assets/QR_CODE.png'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type BuyMeCoffeeLinkProps = {
  className?: string
}

export function BuyMeCoffeeLink({ className }: BuyMeCoffeeLinkProps) {
  return (
    <Dialog>
      <DialogTrigger
        className={cn(
          'inline-flex w-full items-center justify-center gap-2.5 rounded-md bg-[#2d2e36] px-4 py-3 text-white transition-opacity hover:cursor-pointer hover:opacity-90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
          className,
        )}
      >
        <CoffeeCupIcon />
        <span className="font-cookie text-[1.7rem] leading-none">
          Buy me a coffee
        </span>
      </DialogTrigger>
      <DialogContent className="max-w-md gap-5 p-6 sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <DialogTitle className="font-cookie text-[2rem] leading-none font-normal">
            Buy me a coffee
          </DialogTitle>
          <DialogDescription className="text-pretty">
            Scan this InstaPay QR with your bank or e-wallet app.
          </DialogDescription>
        </DialogHeader>
        <div className="mx-auto w-full max-w-[280px] rounded-xl bg-white p-4 shadow-sm">
          <img
            src={instapayQr}
            alt="InstaPay QR code for buying a coffee"
            className="aspect-square w-full object-contain"
          />
        </div>
        <p className="text-center text-xs text-mute">
          Thank you for supporting Barkadaoke.
        </p>
      </DialogContent>
    </Dialog>
  )
}

function CoffeeCupIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-6 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.2 2.6c1.1.1 1.8 1 1.6 2" />
      <path d="M7.4 7.4h9.2" />
      <path d="M8.1 7.4h7.8c.5 0 .9.4.9.9v.5c0 1-.8 1.8-1.8 1.8H9c-1 0-1.8-.8-1.8-1.8V8.3c0-.5.4-.9.9-.9Z" />
      <path d="M8.6 10.6 9.4 20c.1.7.7 1.2 1.4 1.2h2.4c.7 0 1.3-.5 1.4-1.2l.8-9.4" />
    </svg>
  )
}
