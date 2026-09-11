import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils.ts'

/**
 * Cards.
 *
 * `tone` is not decoration — it is how a caregiver reads a screen at a glance.
 * `sage` means on track, `warm` means attention, `alert` means act now, and
 * `plain` means neutral information. Picking a tone for its colour rather than
 * its meaning is how a dashboard stops being scannable.
 *
 * Every card is `stitched`: a warm 1.5px border with a running stitch just
 * inside it, in the tone's own colour, so the tone reads from the edge as well
 * as the fill. `--knot-ground` is the card's fill, which the corner knot uses
 * to sit cleanly on the stitch line. All fills are solid, so the animated app
 * backdrop never shows through anything that has to be read.
 */
const cardVariants = cva('stitched rounded-card', {
  variants: {
    tone: {
      plain:
        'bg-ivory border-[#E7D9C2] [--stitch:var(--color-terracotta)] [--knot-ground:var(--color-ivory)]',
      sand: 'bg-sand border-[#DCCBAE] [--stitch:var(--color-bark)] [--knot-ground:var(--color-sand)]',
      sage: 'bg-sage-soft border-sage/25 [--stitch:var(--color-sage)] [--knot-ground:var(--color-sage-soft)]',
      warm: 'bg-clay border-terracotta/25 [--stitch:var(--color-terracotta)] [--knot-ground:var(--color-clay)]',
      // alert/7% on ivory, as a solid colour.
      alert:
        'bg-[#F5E8E0] border-alert/35 [--stitch:var(--color-alert)] [--knot-ground:#F5E8E0]',
      dark: 'bg-terracotta text-ivory border-terracotta-deep [--stitch:var(--color-cream)] [--knot-ground:var(--color-terracotta)]',
    },
    padding: {
      none: '',
      sm: 'p-4',
      md: 'p-5 sm:p-6',
      lg: 'p-6 sm:p-8',
    },
  },
  defaultVariants: { tone: 'plain', padding: 'md' },
})

export type CardProps = React.ComponentProps<'div'> & VariantProps<typeof cardVariants>

export function Card({ className, tone, padding, ...props }: CardProps) {
  return <div className={cn(cardVariants({ tone, padding }), className)} {...props} />
}

export function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex items-start justify-between gap-3', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return <h3 className={cn('font-heading text-lg font-bold', className)} {...props} />
}

export function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-sm leading-relaxed text-body', className)} {...props} />
}

export function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mt-4', className)} {...props} />
}

/** The small uppercase kicker above a section heading. */
export function Eyebrow({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn(
        'text-[12px] font-medium uppercase tracking-[0.14em] text-bark',
        className,
      )}
      {...props}
    />
  )
}
