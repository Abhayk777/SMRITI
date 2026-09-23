import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

import { SkylineArtwork, SKYLINE_VIEWBOX } from './SkylineArtwork.tsx'
import { cn } from '@/lib/utils.ts'
import { useTranslation } from '@/i18n/index.ts'

/**
 * The full-screen transition shown once the Create Patient wizard is finished,
 * while the new profile's content syncs, before the caregiver lands on the
 * dashboard (frontend.md §16 step 3).
 *
 * ── How it reproduces the reference film ──────────────────────────────────
 * `/brand/setup-loading-reference.mp4` runs one mechanic from start to finish:
 * a line drawing of the scene appears left to right, a warm gold light band
 * follows a beat behind it, and everything the band has passed is left in full
 * colour. Underneath, a hairline progress bar fills in the same gold, and the
 * letters of LOADING darken as the fill passes them.
 *
 * All four of those are driven here by a **single** normalised value, exactly
 * as the film does — which is what keeps the drawing head, the colour wash,
 * the bar and the label locked together instead of four animations that happen
 * to be the same length. That single value is also what lets real progress
 * drive the whole sequence: pass `progress` and the scene draws at the speed
 * the upload actually goes.
 *
 * It is SVG rather than the video itself so it stays crisp at any size, costs
 * a few kB instead of 1.3 MB, and can be driven by real async progress.
 *
 * The scene's geometry lives in `SkylineArtwork.tsx`; see the note at the top
 * of that file about the artwork being a redraw rather than a trace.
 */

/** How long the simulated fallback takes when there is no real signal yet. */
const DEFAULT_DURATION_MS = 3200

/** How far the colour wash trails the drawing head, in viewBox units. */
const WASH_TRAIL = 320

/** The band overshoots both edges so it never pops in at the frame boundary. */
const OVERSCAN = 180

const LOADING_LETTERS = ['L', 'O', 'A', 'D', 'I', 'N', 'G'] as const

export type SetupCompleteLoaderProps = {
  /**
   * Real progress, 0–1, when the caller has one. Leave undefined to run the
   * timed simulation. The value only ever moves forwards on screen — a server
   * that reports 0.6 then 0.4 still reads as progress to the caregiver.
   */
  progress?: number
  /** Fires after the scene completes and the screen has faded. */
  onDone?: () => void
  /** Simulation length when `progress` is not supplied. */
  durationMs?: number
  /**
   * An optional line under the label. The film shows only "LOADING", but a
   * caregiver who has just spent twenty minutes on a setup wizard deserves to
   * be told what is being waited on.
   */
  caption?: string
  className?: string
}

export function SetupCompleteLoader({
  progress,
  onDone,
  durationMs = DEFAULT_DURATION_MS,
  caption,
  className,
}: SetupCompleteLoaderProps) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const [value, setValue] = useState(reduceMotion ? 1 : 0)
  const [visible, setVisible] = useState(true)

  // The rAF loop below reads the latest `progress` without restarting on every
  // change, so it goes through a ref — written in an effect rather than during
  // render, because a render can be discarded and a ref write cannot be undone.
  const targetRef = useRef(progress)
  useEffect(() => {
    targetRef.current = progress
  }, [progress])

  // One rAF loop feeds the single value everything else is derived from.
  useEffect(() => {
    if (reduceMotion) return

    let frame = 0
    const startedAt = performance.now()
    let current = 0

    const tick = (now: number) => {
      const target = targetRef.current

      if (target === undefined) {
        // No real signal: ease across `durationMs`, slowing towards the end so
        // the last stupa does not snap into place.
        const t = Math.min(1, (now - startedAt) / durationMs)
        current = 1 - Math.pow(1 - t, 2.2)
      } else {
        // Real signal: chase it, and never move backwards.
        current = Math.max(current, current + (Math.min(1, Math.max(0, target)) - current) * 0.08)
      }

      setValue(current)
      if (current < 0.999) frame = requestAnimationFrame(tick)
      else setValue(1)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [durationMs, reduceMotion])

  // Hold on the finished scene for a beat, then fade out and hand over.
  useEffect(() => {
    if (value < 1) return
    const hold = window.setTimeout(() => setVisible(false), reduceMotion ? 400 : 620)
    return () => window.clearTimeout(hold)
  }, [value, reduceMotion])

  const { width: W, height: H } = SKYLINE_VIEWBOX

  // The drawing head sweeps from just off the left edge to just off the right.
  const drawEdge = -OVERSCAN + value * (W + OVERSCAN * 2)
  const washEdge = drawEdge - WASH_TRAIL

  return (
    <AnimatePresence onExitComplete={onDone}>
      {visible && (
        <motion.div
          className={cn(
            'fixed inset-0 z-100 flex flex-col items-center justify-center bg-ivory px-6',
            className,
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.01 : 0.45, ease: 'easeInOut' }}
          role="status"
          aria-live="polite"
          aria-label={caption ?? t('common.loadingLabel')}
        >
          <div className="w-full max-w-[1180px]">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="w-full"
              role="presentation"
              aria-hidden="true"
            >
              <defs>
                {/* Everything the drawing head has reached. */}
                <clipPath id="smriti-loader-draw">
                  <rect x={-OVERSCAN} y={0} width={Math.max(0, drawEdge + OVERSCAN)} height={H} />
                </clipPath>
                {/* Everything the colour wash has reached — always a little less. */}
                <clipPath id="smriti-loader-wash">
                  <rect x={-OVERSCAN} y={0} width={Math.max(0, washEdge + OVERSCAN)} height={H} />
                </clipPath>
                <linearGradient id="smriti-loader-band" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#E8A83F" stopOpacity="0" />
                  <stop offset="45%" stopColor="#E8A83F" stopOpacity="0.55" />
                  <stop offset="72%" stopColor="#F2C75A" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#EF9068" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Colour first, so the outlines on top of it stay crisp. */}
              <g clipPath="url(#smriti-loader-wash)">
                <SkylineArtwork mode="color" />
              </g>
              <g clipPath="url(#smriti-loader-draw)">
                <SkylineArtwork mode="line" />
              </g>

              {/* The light band riding the reveal edge — the film's signature
                  beat, and the reason the wash reads as light falling across
                  the scene rather than a wipe transition. */}
              {value > 0.01 && value < 0.995 && (
                <g clipPath="url(#smriti-loader-draw)" style={{ mixBlendMode: 'multiply' }}>
                  {[0, 108, 210].map((offset, i) => (
                    <path
                      key={offset}
                      d={`M ${washEdge + offset} ${H} L ${washEdge + offset + 180} 0 L ${washEdge + offset + 262} 0 L ${washEdge + offset + 82} ${H} Z`}
                      fill="url(#smriti-loader-band)"
                      opacity={0.9 - i * 0.22}
                    />
                  ))}
                </g>
              )}
            </svg>

            {/* The bar. Track, gold fill, and a chevron marker at the head. */}
            <div className="relative mx-auto mt-2 h-[6px] w-[94%] rounded-pill bg-sand/70">
              <div
                className="absolute inset-y-0 left-0 rounded-pill bg-accent-gradient"
                style={{ width: `${Math.round(value * 100)}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2"
                style={{ left: `calc(${Math.round(value * 100)}% - 6px)` }}
              >
                <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
                  <path d="M3 2 L13 8 L3 14 Z" fill="#C98C1C" />
                </svg>
              </div>
            </div>

            <p
              className="mt-6 text-center font-heading text-[clamp(20px,2.6vw,30px)] font-bold"
              style={{ letterSpacing: '0.36em' }}
              aria-hidden="true"
            >
              {LOADING_LETTERS.map((letter, i) => (
                <span
                  key={`${letter}-${i}`}
                  className="transition-colors duration-300"
                  style={{
                    color: value * LOADING_LETTERS.length > i ? '#201E1D' : '#9A948A',
                  }}
                >
                  {letter}
                </span>
              ))}
            </p>

            {caption && (
              <p className="mt-3 text-center text-sm text-muted">{caption}</p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default SetupCompleteLoader
