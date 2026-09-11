import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils.ts'

/**
 * The button.
 *
 * shadcn/ui's structure, repainted in brand tokens rather than sitting beside
 * them as a second visual language. Every variant here is a real job in the
 * product, which is why there is no generic "primary/secondary/tertiary":
 *
 *   accent    the one gold→coral gradient. Reserved for the single most
 *             important action on a screen — start setup, generate the code.
 *   solid     terracotta. The ordinary confirming action.
 *   sage      the calm secondary. "Nothing needed", "mark as read".
 *   outline   equal-weight alternative next to a solid.
 *   ghost     in-place actions inside a list row or card header.
 *   danger    only where something is removed or a person loses access.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-pill font-body font-semibold ' +
    'whitespace-nowrap transition-[background,color,filter,box-shadow,border-color,transform] duration-200 ' +
    'active:scale-[0.97] motion-reduce:active:scale-100 ' +
    'disabled:pointer-events-none disabled:opacity-50 ' +
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        accent:
          'bg-accent-gradient text-[#4A2413] shadow-lift hover:brightness-[1.06] active:brightness-95',
        solid: 'bg-terracotta text-ivory hover:bg-terracotta-deep',
        sage: 'bg-sage text-ivory hover:bg-sage/90',
        outline:
          'border border-ink/20 bg-transparent text-ink hover:border-ink/40 hover:bg-ink/[0.04]',
        subtle: 'bg-sand text-ink hover:bg-sand/70',
        ghost: 'bg-transparent text-body hover:bg-ink/[0.06] hover:text-ink',
        danger: 'bg-alert text-ivory hover:brightness-110',
        link: 'text-bark underline-offset-4 hover:text-bark-deep hover:underline',
      },
      size: {
        sm: 'h-9 px-4 text-[13.5px]',
        md: 'h-11 px-5 text-[15px]',
        lg: 'h-[52px] px-7 text-base',
        icon: 'size-11 px-0',
        'icon-sm': 'size-9 px-0',
      },
    },
    defaultVariants: { variant: 'solid', size: 'md' },
  },
)

export type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    /** Render as the child element instead of a `<button>` — e.g. a router Link. */
    asChild?: boolean
  }

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

export { buttonVariants }
