import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

import { cn } from '@/lib/utils.ts'
import { color } from '@/styles/tokens.ts'

/**
 * Three ridgelines, one behind the other — the Khasi and Jaintia hills as they
 * look at dawn with cloud lying in the valleys (the `ner1` reference clip),
 * drawn flat rather than photographic.
 *
 * Each ridge rises at its own rate as the section scrolls into view, the far
 * one slowest. That differential is the whole effect: it is what makes three
 * flat shapes read as distance.
 */
const RIDGES = [
  {
    d: 'M0 70 C 90 40 150 58 230 44 S 380 18 470 40 S 640 64 720 36 S 880 10 980 34 S 1140 60 1240 38 S 1380 26 1440 42 V160 H0 Z',
    rise: 18,
  },
  {
    d: 'M0 96 C 110 70 200 92 300 76 S 470 52 560 78 S 720 104 820 74 S 1000 50 1110 80 S 1300 100 1440 72 V160 H0 Z',
    rise: 34,
  },
  {
    d: 'M0 124 C 140 104 250 128 380 112 S 600 92 720 118 S 930 138 1060 112 S 1300 100 1440 118 V160 H0 Z',
    rise: 56,
  },
] as const

export function HillLayers({
  colors = [color.terracottaDeep, color.bark, color.barkDeep],
  className,
}: {
  /** Far to near. */
  colors?: readonly [string, string, string]
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] })

  const y0 = useTransform(scrollYProgress, [0, 1], [RIDGES[0].rise, 0])
  const y1 = useTransform(scrollYProgress, [0, 1], [RIDGES[1].rise, 0])
  const y2 = useTransform(scrollYProgress, [0, 1], [RIDGES[2].rise, 0])
  const ys = [y0, y1, y2]

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn('pointer-events-none relative h-[clamp(90px,12vw,160px)] w-full', className)}
    >
      {RIDGES.map((ridge, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 1440 160"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full"
          style={{ y: ys[i] }}
        >
          <path d={ridge.d} fill={colors[i]} />
        </motion.svg>
      ))}
    </div>
  )
}

export default HillLayers
