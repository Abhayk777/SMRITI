import { useRef } from 'react'
import { motion, useScroll } from 'framer-motion'

import { cn } from '@/lib/utils.ts'
import { color } from '@/styles/tokens.ts'

/**
 * A single thread that draws itself down the page as you scroll past it.
 *
 * It is tied to scroll position rather than played on arrival, so scrolling
 * back up un-draws it — it behaves like a thread being pulled through the
 * section, not an animation that happened once. Lenis smooths the scroll it
 * reads from, which is what keeps the line from stepping.
 *
 * The path is drawn in a 20×100 box stretched to the container, with a
 * non-scaling stroke so the thread keeps its weight at any height.
 */
export function ThreadLine({
  thread = color.lac,
  className,
}: {
  thread?: string
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 78%', 'end 55%'] })

  const d = 'M10 0 C 16 12, 4 22, 10 33 S 16 55, 10 66 S 4 88, 10 100'

  return (
    <div ref={ref} aria-hidden="true" className={cn('pointer-events-none', className)}>
      <svg
        viewBox="0 0 20 100"
        preserveAspectRatio="none"
        focusable="false"
        className="size-full overflow-visible"
      >
        {/* The ghost of the thread, so the path is legible before it is drawn. */}
        <path
          d={d}
          fill="none"
          stroke={thread}
          strokeOpacity={0.14}
          strokeWidth={2}
          strokeDasharray="4 5"
          vectorEffect="non-scaling-stroke"
        />
        <motion.path
          d={d}
          fill="none"
          stroke={thread}
          strokeWidth={2.4}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          style={{ pathLength: scrollYProgress }}
        />
      </svg>
    </div>
  )
}

export default ThreadLine
