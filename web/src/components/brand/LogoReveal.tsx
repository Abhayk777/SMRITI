
import { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

import { LOGOMARK_PATH, LOGOMARK_ROTATIONS } from './Logomark.tsx'
import { Wordmark, WORDMARK_LETTERS } from './Wordmark.tsx'
import { color as brandColor, gradient } from '@/styles/tokens.ts'
import { cn } from '@/lib/utils.ts'

/**
 * The Smriti logo reveal.
 *
 * Choreography and easing are taken from the approved brand film
 * (`/brand/logo-reveal-reference.mp4`), which runs:
 *
 *   1. four strands draw themselves into the knot, one after another;
 *   2. two small sparks catch on the outer curves;
 *   3. the closed knot settles with a slight overshoot;
 *   4. the mark eases up and the wordmark rises in, one letter at a time;
 *   5. the gold→coral sweep crosses the "S" as the last beat.
 *
 * The film plays this over roughly eight seconds as a title sequence. The
 * timings below are the same beats at product pace - the ratios between them,
 * the stroke order and the easing curves are unchanged, and `speed` scales the
 * whole sequence uniformly so the hero and the post-sign-in splash stay the
 * same animation rather than two different ones.
 *
 * Used in exactly two places: the marketing hero, and the first app load after
 * a fresh sign-in. Not on every page load - a logo animation you have to sit
 * through repeatedly stops being brand and becomes an obstacle.
 */

const STRAND_DELAYS = [0.18, 0.4, 0.62, 0.84] as const
const STRAND_DURATION = 1.15
const STRAND_EASE = [0.5, 0.05, 0.3, 1] as const

const SPARK_DELAYS = [1.55, 1.68] as const

const SETTLE_AT = 1.8
const SETTLE_DURATION = 0.6

const LETTER_START = 1.86
const LETTER_STAGGER = 0.08
const LETTER_DURATION = 0.62
const LETTER_EASE = [0.2, 0.85, 0.2, 1] as const

const SWEEP_AT = 2.55
const SWEEP_DURATION = 0.8

/** When the last beat lands. Callers use this to time what comes next. */
export const LOGO_REVEAL_DURATION = SWEEP_AT + SWEEP_DURATION

export type LogoRevealProps = {
  /** Width of the mark in px. The wordmark is sized from this by default. */
  size?: number
  /** Wordmark font size in px. Defaults to a proportion of `size`. */
  wordmarkSize?: number
  /** Stroke and letter colour. Cream on terracotta is the canonical pairing. */
  color?: string
  /**
   * Multiplier on the whole sequence. `1` is the film's pace, used in the
   * marketing hero. The sign-in splash runs at ~3.4 to land inside a second.
   */
  speed?: number
  /** Fires once the sweep has finished, or immediately under reduced motion. */
  onComplete?: () => void
  className?: string
}

export function LogoReveal({
  size = 120,
  wordmarkSize,
  color = brandColor.cream,
  speed = 1,
  onComplete,
  className,
}: LogoRevealProps) {
  const reduceMotion = useReducedMotion()
  const letterSize = wordmarkSize ?? Math.round(size * 1.18)

  useEffect(() => {
    if (!onComplete) return
    if (reduceMotion) {
      onComplete()
      return
    }
    const ms = (LOGO_REVEAL_DURATION / speed) * 1000
    const timer = window.setTimeout(onComplete, ms)
    return () => window.clearTimeout(timer)
  }, [onComplete, reduceMotion, speed])

  // Reduced motion skips straight to the settled lockup. Not a frozen frame of
  // the animation - the finished thing, which is what the animation was for.
  if (reduceMotion) {
    return (
      <div className={cn('flex flex-col items-center', className)}>
        <svg viewBox="0 0 100 100" width={size} height={size} className="overflow-visible" role="presentation" aria-hidden="true">
          <g fill="none" stroke={color} strokeWidth={8.6} strokeLinecap="butt">
            {LOGOMARK_ROTATIONS.map((deg) => (
              <path key={deg} d={LOGOMARK_PATH} transform={deg === 0 ? undefined : `rotate(${deg} 50 50)`} />
            ))}
          </g>
        </svg>
        <Wordmark size={letterSize} color={color} withSweep className="mt-3" />
      </div>
    )
  }

  const t = (seconds: number) => seconds / speed

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <motion.svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="overflow-visible"
        role="presentation"
        aria-hidden="true"
        // The settle: a small overshoot as the knot closes, then rest.
        animate={{ scale: [1, 1.05, 1] }}
        transition={{
          duration: t(SETTLE_DURATION),
          delay: t(SETTLE_AT),
          times: [0, 0.4, 1],
          ease: 'easeOut',
        }}
      >
        <g fill="none" stroke={color} strokeWidth={8.6} strokeLinecap="butt">
          {LOGOMARK_ROTATIONS.map((deg, i) => (
            <motion.path
              key={deg}
              d={LOGOMARK_PATH}
              transform={deg === 0 ? undefined : `rotate(${deg} 50 50)`}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: t(STRAND_DURATION),
                delay: t(STRAND_DELAYS[i]),
                ease: STRAND_EASE,
              }}
            />
          ))}
        </g>

        {/* Two sparks catching on the outer curves as the knot closes. */}
        <g fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
          {[
            { d: 'M 66.6 22 L 74.2 25.2', delay: SPARK_DELAYS[0] },
            { d: 'M 25.2 72.6 L 33.4 77', delay: SPARK_DELAYS[1] },
          ].map((spark) => (
            <motion.path
              key={spark.d}
              d={spark.d}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 0.85, scale: 1 }}
              style={{ transformOrigin: '50% 50%' }}
              transition={{ duration: t(0.5), delay: t(spark.delay), ease: 'easeOut' }}
            />
          ))}
        </g>
      </motion.svg>

      <div
        className="relative mt-[0.12em] flex items-baseline justify-center font-heading font-extrabold"
        style={{ fontSize: letterSize, lineHeight: 1, letterSpacing: '-0.012em', color }}
        role="img"
        aria-label="Smriti"
      >
        {WORDMARK_LETTERS.map((letter, i) => {
          const rise = (
            <motion.span
              className="inline-block"
              initial={{ opacity: 0, y: '18%', scale: 0.93 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: t(LETTER_DURATION),
                delay: t(LETTER_START + i * LETTER_STAGGER),
                ease: LETTER_EASE,
              }}
            >
              {letter}
            </motion.span>
          )

          // The "S" carries the sweep, so it needs a positioned wrapper for the
          // clipped gradient copy to sit exactly over the glyph.
          if (i === 0) {
            return (
              <span key="S" className="relative inline-block" aria-hidden="true">
                {rise}
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-0 bg-clip-text text-transparent"
                  style={{ backgroundImage: gradient.wordmark }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: t(SWEEP_DURATION), delay: t(SWEEP_AT), ease: 'easeOut' }}
                >
                  {letter}
                </motion.span>
              </span>
            )
          }

          return (
            <span key={`${letter}-${i}`} aria-hidden="true">
              {rise}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export default LogoReveal
