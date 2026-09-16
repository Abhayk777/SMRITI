import { useState } from 'react'
import { motion } from 'framer-motion'

import { TwinStar } from '@/components/ner/TwinStar.tsx'
import { color } from '@/styles/tokens.ts'
import { arcProgress, scrubToMinutes, skyPhase, type SkyPhase } from './sky.ts'
import { SkyScrubber } from './SkyScrubber.tsx'

/**
 * The room the app is drawn in.
 *
 * A fixed layer behind every signed-in screen, following the time of day where
 * the patient is:
 *
 *   sky    a wash at the top of the window — gold at dawn, pale mist through
 *          the day, coral in the evening, a cool indigo mist at night. Always
 *          light; the app never turns into a dark theme after sunset.
 *   sun    a flat disc inside a slowly turning stitched ring, crossing the sky
 *          on the patient's clock (the moon by night). It moves a few pixels
 *          an hour, so it is felt rather than watched.
 *   hills  three Khasi-hill ridgelines along the bottom of the window, the far
 *          one swaying slowly, with mist drifting through the valleys.
 *   loom   faint vertical warp threads over everything, and a handful of
 *          Apatani twin stars that twinkle — stronger at night.
 *
 * Cards are opaque, so all of this lives in the gutters between them and never
 * behind anything that has to be read. Every movement is a compositor-only
 * transform or opacity animation, and the layer stills under reduced motion.
 *
 * A scrubber sits at the foot of the window (`SkyScrubber`) for pushing the
 * sun and moon along the arc by hand. While it is held away from the real
 * time the sky follows it instead of the clock, and its reset button hands the
 * sky back. Nothing outside this layer reads that override.
 */

const SKY: Record<SkyPhase, string> = {
  dawn: 'linear-gradient(180deg, rgba(232,168,63,0.2) 0%, rgba(239,139,124,0.1) 36%, rgba(249,244,237,0) 62%)',
  day: 'linear-gradient(180deg, rgba(214,222,214,0.55) 0%, rgba(228,230,224,0.3) 40%, rgba(249,244,237,0) 72%)',
  dusk: 'linear-gradient(180deg, rgba(239,139,124,0.18) 0%, rgba(199,101,71,0.07) 36%, rgba(249,244,237,0) 62%)',
  night:
    'linear-gradient(180deg, rgba(36,48,59,0.16) 0%, rgba(86,99,63,0.07) 42%, rgba(249,244,237,0) 74%)',
}

const STARS = [
  { left: '12%', top: '18%', size: 9, delay: '0s' },
  { left: '31%', top: '9%', size: 7, delay: '1.2s' },
  { left: '58%', top: '15%', size: 8, delay: '2.6s' },
  { left: '82%', top: '26%', size: 10, delay: '0.7s' },
  { left: '71%', top: '44%', size: 6, delay: '3.4s' },
  { left: '6%', top: '52%', size: 7, delay: '1.9s' },
]

const RIDGES = [
  'M0 90 C 120 50 210 78 330 58 S 540 22 680 52 S 900 86 1030 48 S 1250 18 1390 44 S 1560 70 1680 50 S 1860 30 2000 56 S 2200 76 2400 50 V200 H0 Z',
  'M0 120 C 140 92 260 118 400 100 S 640 72 780 102 S 1010 130 1150 98 S 1400 74 1540 104 S 1800 124 1960 96 S 2200 84 2400 108 V200 H0 Z',
  'M0 152 C 170 134 300 158 460 142 S 740 122 890 148 S 1150 168 1320 142 S 1620 128 1800 150 S 2120 160 2400 144 V200 H0 Z',
]

const MIST =
  'radial-gradient(closest-side, rgba(249,244,237,0.9), rgba(249,244,237,0))'

export function AppBackdrop({ minutes }: { minutes: number }) {
  // `null` while the sky follows the patient's clock; a scrubber position once
  // it has been moved by hand.
  const [scrub, setScrub] = useState<number | null>(null)
  const shown = scrub === null ? minutes : scrubToMinutes(scrub)

  const phase = skyPhase(shown)
  const { body, t } = arcProgress(shown)
  const night = phase === 'night'

  // The arc: rises on the left of the content area (clear of the sidebar),
  // peaks below the header, sets to the right.
  const x = 24 + t * 70
  const y = 36 - Math.sin(Math.PI * t) * 20

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ivory"
      >
        {/* One layer per phase, cross-fading, because gradients cannot tween. */}
        {(Object.keys(SKY) as SkyPhase[]).map((p) => (
          <motion.div
            key={p}
            className="absolute inset-0"
            style={{ background: SKY[p] }}
            initial={false}
            animate={{ opacity: p === phase ? 1 : 0 }}
            transition={{ duration: 2.4, ease: 'easeInOut' }}
          />
        ))}

        <div className="absolute inset-0 bg-loom" />

        {/* Sun or moon: a flat disc with a crisp edge inside a slowly turning
            stitched ring — drawn, not glowing. */}
        <motion.div
          className="absolute size-[clamp(56px,6vw,88px)] -translate-x-1/2 -translate-y-1/2"
          initial={false}
          animate={{ left: `${x}%`, top: `${y}%` }}
          transition={{ duration: scrub === null ? 3 : 0.12, ease: [0.22, 0.8, 0.18, 1] }}
        >
          <div
            className="absolute -inset-3 rounded-full border-[1.5px] border-dashed animate-spin-slow"
            style={{
              borderColor: body === 'sun' ? 'rgba(201,154,62,0.45)' : 'rgba(36,48,59,0.16)',
            }}
          />
          <div
            className="absolute inset-0 rounded-full"
            style={
              body === 'sun'
                ? { backgroundColor: 'rgba(232,168,63,0.3)' }
                : {
                    backgroundColor: 'rgba(245,234,216,0.95)',
                    boxShadow: 'inset -9px -5px 0 0 rgba(36,48,59,0.08)',
                  }
            }
          />
        </motion.div>

        {STARS.map((star) => (
          <TwinStar
            key={star.left + star.top}
            size={star.size}
            className="absolute animate-twinkle"
            style={{
              left: star.left,
              top: star.top,
              color: night ? color.osak : color.muga,
              opacity: night ? 0.5 : 0.28,
              animationDelay: star.delay,
            }}
          />
        ))}

        {/* The hills, and the mist lying between them. */}
        <div className="absolute inset-x-0 bottom-0 h-[26vh] min-h-[160px]">
          <svg
            viewBox="0 0 2400 200"
            preserveAspectRatio="none"
            className="absolute bottom-0 left-0 h-full w-[112%] animate-ridge-sway"
          >
            <path d={RIDGES[0]} fill={color.paddy} fillOpacity={0.07} />
          </svg>
          <div
            className="absolute bottom-[34%] left-[8%] h-[38%] w-[46%] animate-mist-drift rounded-[50%]"
            style={{ background: MIST }}
          />
          <svg
            viewBox="0 0 2400 200"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full"
          >
            <path d={RIDGES[1]} fill={color.sage} fillOpacity={0.08} />
          </svg>
          <div
            className="absolute bottom-[14%] right-[4%] h-[34%] w-[40%] animate-mist-drift rounded-[50%]"
            style={{
              animationDelay: '-30s',
              animationDirection: 'alternate-reverse',
              background: MIST,
            }}
          />
          <svg
            viewBox="0 0 2400 200"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full"
          >
            <path d={RIDGES[2]} fill={color.bark} fillOpacity={0.07} />
          </svg>
        </div>
      </div>

      <SkyScrubber
        value={scrub}
        realMinutes={minutes}
        onChange={setScrub}
        onReset={() => setScrub(null)}
      />
    </>
  )
}

export default AppBackdrop
