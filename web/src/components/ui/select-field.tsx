import { Check, ChevronDown } from 'lucide-react'
import { Select as SelectPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

type SelectOption = {
  value: string
  label: string
}

type SelectFieldProps = {
  id?: string
  'aria-label'?: string
  value: string
  onValueChange: (value: string) => void
  options: readonly SelectOption[]
  disabled?: boolean
  className?: string
}

/** A shared, keyboard-accessible menu with consistent trigger and icon sizing. */
export function SelectField({
  id,
  'aria-label': ariaLabel,
  value,
  onValueChange,
  options,
  disabled,
  className,
}: SelectFieldProps) {
  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          'flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-canvas-soft px-3 text-left text-sm text-foreground transition-colors outline-none hover:border-primary/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=open]:border-ring',
          className,
        )}
      >
        <span className="min-w-0 truncate">
          <SelectPrimitive.Value />
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 text-mute"
          />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className="z-[70] max-h-(--radix-select-content-available-height) w-(--radix-select-trigger-width) min-w-32 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl outline-none"
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="relative flex min-h-9 cursor-pointer items-center rounded-md py-2 pr-8 pl-3 text-sm outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-primary/12 data-highlighted:text-primary-soft"
              >
                <SelectPrimitive.ItemText>
                  {option.label}
                </SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-2.5 flex items-center text-primary">
                  <Check aria-hidden="true" className="size-4" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
