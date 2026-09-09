import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import { Link } from 'react-router-dom'

import { LOGO_REVEAL_DURATION, LogoReveal } from '@/components/brand/LogoReveal.tsx'
import { Button } from '@/components/ui/button.tsx'
import { gradient } from '@/styles/tokens.ts'

/** Copy arrives after the mark has finished drawing itself, never over it. */
const COPY_BASE_DELAY = LOGO_REVEAL_DURATION - 0.3

function Sparkle({ style, size }: { style: React.CSSProperties; size: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className="pointer-events-none absolute fill-cream animate-twinkle"
      style={{ width: size, ...style }}
    >
      <path d="M50 0 C52 40 60 48 100 50 C60 52 52 60 50 100 C48 60 40 52 0 50 C40 48 48 40 50 0 Z" />
    </svg>
  )
}

/**
 * The hero.
 *
 * The reveal is `<LogoReveal />` — the same component the app plays after a
 * fresh sign-in — rather than a set of CSS keyframes written for this page
 * alone. That is the whole point of it being a component: the logo animates
 * identically wherever it appears, and changing its choreography is one edit.
 *
 * Everything after the mark is timed off `LOGO_REVEAL_DURATION`, so if the
 * reveal is ever re-cut the copy still follows it instead of colliding.
 */
export function Hero() {
  const reduceMotion = useReducedMotion()
  const [, setRevealed] = useState(false)

  const copy = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: {
            duration: 0.85,
            delay: COPY_BASE_DELAY + delay,
            ease: [0.2, 0.8, 0.2, 1] as const,
          },
        }

  return (
    <header
      id="top"
      className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-5 pb-20 pt-28 sm:px-12"
      style={{ background: gradient.hero }}
    >
      <Sparkle style={{ right: '7vw', bottom: '12vh', opacity: 0.18 }} size="clamp(22px,3vw,40px)" />
      <Sparkle
        style={{ left: '9vw', top: '22vh', opacity: 0.14, animationDelay: '1.4s' }}
        size="clamp(12px,1.6vw,20px)"
      />

      <div className="flex w-full max-w-[880px] flex-col items-center">
        <LogoReveal
          size={112}
          wordmarkSize={undefined}
          speed={1}
          onComplete={() => setRevealed(true)}
        />

        <motion.h1
          {...copy(0)}
          className="mt-8 max-w-[19ch] text-center text-[clamp(32px,5.4vw,62px)] leading-[1.06] text-ivory"
        >
          Be close to their day, from wherever you are.
        </motion.h1>

        <motion.p
          {...copy(0.2)}
          className="mt-4 max-w-[52ch] text-center text-[clamp(15.5px,1.5vw,19px)] leading-relaxed text-ivory/90"
        >
          Smriti quietly keeps track of your parent&rsquo;s routines, medicine and mood at
          home — and tells the family what actually matters. Nothing to wear. Nothing to
          charge.
        </motion.p>

        <motion.div
          {...copy(0.4)}
          className="mt-8 flex flex-wrap justify-center gap-3"
        >
          <Button asChild variant="accent" size="lg">
            <Link to="/auth">Start free for 30 days</Link>
          </Button>
          <Button
            asChild
            size="lg"
            className="border border-ivory/45 bg-transparent text-ivory hover:bg-ivory/12"
          >
            <a href="#how">See how it works</a>
          </Button>
        </motion.div>

        <motion.p {...copy(0.6)} className="mt-6 text-center text-[13.5px] text-ivory/66">
          Set up in one evening &middot; Your parent stays in control &middot; Cancel any time
        </motion.p>
      </div>

      <a
        href="#how"
        aria-label="Scroll to how it works"
        className="absolute inset-x-0 bottom-5 mx-auto w-fit text-ivory/50 animate-bob"
      >
        <ArrowDown className="size-5" strokeWidth={2.75} />
      </a>
    </header>
  )
}
