import { motion } from 'framer-motion'

import { cn } from '@/lib/utils.ts'

/**
 * Japi rosette - Assam.
 *
 * The japi is the wide bamboo-and-palm-leaf hat of Assam, and its crown is a
 * radial weave: rings of cane around a star. The same form is woven into
 * mekhela sador as the "japi" motif. This is that crown as line art - an outer
 * woven ring, sixteen points, an inner ring of lozenges and a star at the
 * centre - drawn in `currentColor` so it takes the colour of wherever it sits.
 *
 * `draw` animates the rings in as strokes, which is what the full-page
 * loading state uses: the hat being woven while the app finds its feet.
 *
 * Source: Muga silk and Mekhela sador (Wikipedia); IIAD, "Threads of culture:
 * Assam's heritage in cotton and silk weaving".
 */
const POINTS = Array.from({ length: 16 }, (_, i) => (i * 360) / 16)
const LOZENGES = Array.from({ length: 8 }, (_, i) => (i * 360) / 8 + 22.5)

export function JapiRosette({
  size = 120,
  draw = false,
  strokeWidth = 1.6,
  className,
}: {
  size?: number
  /** Stroke the rings in on mount, then hold. */
  draw?: boolean
  strokeWidth?: number
  className?: string
}) {
  const ring = (delay: number) =>
    draw
      ? {
          initial: { pathLength: 0, opacity: 0.2 },
          animate: { pathLength: 1, opacity: 1 },
          transition: { duration: 1.4, delay, ease: [0.5, 0.05, 0.3, 1] as const },
        }
      : {}

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={cn('flex-none overflow-visible', className)}
    >
      <g fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round">
        <motion.circle cx="50" cy="50" r="47" {...ring(0)} />
        <motion.circle cx="50" cy="50" r="43" strokeDasharray="3 2.2" {...ring(0.1)} />
        {POINTS.map((deg) => (
          <motion.path
            key={deg}
            d="M50 5.5 L53.4 17 L46.6 17 Z"
            transform={`rotate(${deg} 50 50)`}
            {...ring(0.25 + deg / 1600)}
          />
        ))}
        <motion.circle cx="50" cy="50" r="31" {...ring(0.35)} />
        {LOZENGES.map((deg) => (
          <motion.path
            key={deg}
            d="M50 22 L53.4 27 L50 32 L46.6 27 Z"
            transform={`rotate(${deg} 50 50)`}
            {...ring(0.5 + deg / 2000)}
          />
        ))}
        <motion.circle cx="50" cy="50" r="17" strokeDasharray="2 1.6" {...ring(0.6)} />
        <motion.path
          d="M50 38 L53 47 L62 50 L53 53 L50 62 L47 53 L38 50 L47 47 Z"
          {...ring(0.75)}
        />
      </g>
    </svg>
  )
}

export default JapiRosette
