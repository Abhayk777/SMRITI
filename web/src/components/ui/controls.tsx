import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as SeparatorPrimitive from '@radix-ui/react-separator'
import * as SliderPrimitive from '@radix-ui/react-slider'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { Check } from 'lucide-react'

import { cn } from '@/lib/utils.ts'

/* ── Checkbox ────────────────────────────────────────────────────────── */

export function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'peer size-5 shrink-0 rounded-md border border-ink/25 bg-ivory shadow-xs transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/40',
        'hover:border-terracotta/70',
        'data-[state=checked]:border-terracotta data-[state=checked]:bg-terracotta data-[state=checked]:text-ivory',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <Check className="size-3.5 stroke-[2.5]" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

/* ── Switch ──────────────────────────────────────────────────────────── */

export function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 items-center rounded-pill border-2 border-transparent',
        'transition-colors data-[state=checked]:bg-sage data-[state=unchecked]:bg-ink/15',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block size-5 rounded-full bg-ivory shadow-sm transition-transform',
          'data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0',
        )}
      />
    </SwitchPrimitive.Root>
  )
}

/* ── Slider ──────────────────────────────────────────────────────────── */

export function Slider({
  className,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const thumbCount = Array.isArray(props.value ?? props.defaultValue)
    ? (props.value ?? props.defaultValue)!.length
    : 1

  return (
    <SliderPrimitive.Root
      className={cn(
        'relative flex w-full touch-none select-none items-center py-3',
        'data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow rounded-pill bg-sand">
        <SliderPrimitive.Range className="absolute h-full rounded-pill bg-terracotta" />
      </SliderPrimitive.Track>
      {Array.from({ length: thumbCount }, (_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          className={cn(
            'block size-6 rounded-full border-[3px] border-terracotta bg-ivory shadow-sm',
            'transition-transform hover:scale-110 focus-visible:outline-none',
            'focus-visible:ring-2 focus-visible:ring-terracotta/30 focus-visible:ring-offset-2',
          )}
        />
      ))}
    </SliderPrimitive.Root>
  )
}

/* ── Tabs ────────────────────────────────────────────────────────────── */

export const Tabs = TabsPrimitive.Root

export function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'inline-flex items-center gap-1 rounded-pill bg-sand/70 p-1 text-body',
        className,
      )}
      {...props}
    />
  )
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'rounded-pill px-4 py-2 text-sm font-semibold transition-colors',
        'data-[state=active]:bg-ivory data-[state=active]:text-ink data-[state=active]:shadow-sm',
        'data-[state=inactive]:hover:text-ink',
        className,
      )}
      {...props}
    />
  )
}

export const TabsContent = TabsPrimitive.Content

/* ── Avatar ──────────────────────────────────────────────────────────── */

export function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        'relative flex size-11 shrink-0 overflow-hidden rounded-full bg-sand',
        className,
      )}
      {...props}
    />
  )
}

export function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image className={cn('size-full object-cover', className)} {...props} />
  )
}

export function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      className={cn(
        'flex size-full items-center justify-center bg-terracotta/12 font-heading font-bold text-terracotta',
        className,
      )}
      {...props}
    />
  )
}

/* ── Separator ───────────────────────────────────────────────────────── */

export function Separator({
  className,
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      orientation={orientation}
      className={cn(
        'bg-ink/[0.08]',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  )
}
