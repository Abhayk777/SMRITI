import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

import { cn } from '@/lib/utils.ts'

/**
 * The scroll-triggered entrance used by every section below the hero.
 *
 * The reference landing page animated the hero and then nothing else, which is
 * why it went flat the moment you scrolled - the page had already spent its
 * only trick. Giving each section its own arrival keeps the page alive all the
 * way down without any single moment being loud.
 *
 * `once: true` matters: a card that re-animates every time it scrolls back into
 * view is a page that will not settle, and on a long page that is genuinely
 * unpleasant to read.
 */
export function Reveal({
  children,
  delay = 0,
  y = 22,
  className,
  as = 'div',
}: {
  children: ReactNode
  delay?: number
  /** Distance travelled on entry. Larger for hero-scale blocks, smaller for rows. */
  y?: number
  className?: string
  as?: 'div' | 'section' | 'li' | 'article'
}) {
  const reduceMotion = useReducedMotion()
  const MotionTag = motion[as]

  if (reduceMotion) {
    const Tag = as
    return <Tag className={className}>{children}</Tag>
  }

  return (
    <MotionTag
      className={cn(className)}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 0.72, delay, ease: [0.22, 0.8, 0.18, 1] }}
    >
      {children}
    </MotionTag>
  )
}

/** Staggers a list of children by a fixed step. */
export function RevealGroup({
  children,
  step = 0.09,
  className,
}: {
  children: ReactNode[]
  step?: number
  className?: string
}) {
  return (
    <div className={className}>
      {children.map((child, i) => (
        <Reveal key={i} delay={i * step}>
          {child}
        </Reveal>
      ))}
    </div>
  )
}
