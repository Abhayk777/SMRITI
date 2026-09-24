import { useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

import { cn } from '@/lib/utils.ts'
import { color } from '@/styles/tokens.ts'

/**
 * An entrance that reads as weaving rather than fading.
 *
 * A single weft thread crosses the top edge first, left to right; the block
 * follows it, uncovered by a left-to-right clip as if the cloth were being
 * built pass by pass. The thread then drops away. Once settled the clip is
 * removed entirely, so shadows and focus rings are never cut off afterwards.
 *
 * Use it for the few blocks that should feel like arrivals - section step
 * cards, story cards. Small rows keep the quieter `Reveal`.
 */
export function WeaveIn({
  children,
  delay = 0,
  thread = color.lac,
  className,
}: {
  children: ReactNode
  delay?: number
  thread?: string
  className?: string
}) {
  const reduceMotion = useReducedMotion()
  const [settled, setSettled] = useState(false)

  if (reduceMotion) return <div className={className}>{children}</div>

  return (
    <motion.div
      className={cn('relative', className)}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
    >
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-3 -top-1 z-10 h-[2px] origin-left rounded-full"
        style={{ backgroundColor: thread }}
        variants={{
          hidden: { scaleX: 0, opacity: 1 },
          shown: {
            scaleX: [0, 1, 1],
            opacity: [1, 1, 0],
            transition: { duration: 1.1, delay, times: [0, 0.45, 1], ease: 'easeInOut' },
          },
        }}
      />
      <motion.div
        className="h-full"
        style={settled ? { clipPath: 'none' } : undefined}
        variants={{
          hidden: { clipPath: 'inset(0% 100% 0% 0%)', opacity: 0.4 },
          shown: {
            clipPath: 'inset(0% 0% 0% 0%)',
            opacity: 1,
            transition: { duration: 0.8, delay: delay + 0.18, ease: [0.22, 0.8, 0.18, 1] },
          },
        }}
        onAnimationComplete={(definition) => {
          if (definition === 'shown') setSettled(true)
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

export default WeaveIn
