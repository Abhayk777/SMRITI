import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import { Link } from 'react-router-dom'

import { LogoReveal } from '@/components/brand/LogoReveal.tsx'
import { GamosaBand } from '@/components/ner/GamosaBand.tsx'
import { TempleHem } from '@/components/ner/TempleHem.tsx'
import { TwinStar } from '@/components/ner/TwinStar.tsx'
import { Button } from '@/components/ui/button.tsx'
import { color, gradient } from '@/styles/tokens.ts'
import { IntroFilm, type FilmPhase } from './IntroFilm.tsx'

/** Set once the intro has played, so a return visit in the same session skips it. */
const INTRO_SEEN_KEY = 'smriti:intro-seen'

/** How far into the film the copy arrives — over the paddy walk, not the last frame. */
const COPY_AT_SECONDS = 1.8

/** The curtain lifts this long after the logo's last beat lands. */
const CURTAIN_HOLD_MS = 260

function initialPhase(): FilmPhase {
  if (typeof window === 'undefined') return 'ambient'
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'still'
  try {
    if (sessionStorage.getItem(INTRO_SEEN_KEY) === '1') return 'ambient'
  } catch {
    // Storage blocked: play the intro, it is still skippable.
  }
  return 'reveal'
}

/**
 * The hero.
 *
 * On a first visit it is a short title sequence:
 *
 *   1. `<LogoReveal />` plays on a terracotta curtain, exactly as it always has.
 *   2. The curtain lifts like a cloth being raised — its lower edge is a
 *      gamosa border with a temple-tooth fringe — and carries the logo up with
 *      it towards the nav, which fades in as the curtain passes.
 *   3. Behind it the Northeast film is already rolling (`IntroFilm`), and the
 *      headline and buttons rise in over it a couple of seconds later.
 *   4. When the film ends the hero settles onto a quiet cloud loop.
 *
 * Every later visit in the session, and anyone who scrolls or presses "Skip
 * intro", goes straight to step 4. Under reduced motion there is no video at
 * all — a still frame, and the copy immediately.
 *
 * The film sits under a terracotta multiply layer, so the footage takes on the
 * brand's own warmth instead of the page switching to a dark, cinematic look.
 */
export function Hero({ onCurtainLift }: { onCurtainLift?: () => void }) {
  const [phase, setPhase] = useState<FilmPhase>(initialPhase)
  const [copyShown, setCopyShown] = useState(phase === 'ambient' || phase === 'still')

  const markSeen = () => {
    try {
      sessionStorage.setItem(INTRO_SEEN_KEY, '1')
    } catch {
      // Not remembered; the intro will simply play again next time.
    }
  }

  const liftCurtain = useCallback(() => {
    markSeen()
    setPhase((current) => (current === 'reveal' ? 'film' : current))
  }, [])

  const skip = useCallback(() => {
    markSeen()
    setPhase('ambient')
    setCopyShown(true)
  }, [])

  const endFilm = useCallback(() => {
    setPhase('ambient')
    setCopyShown(true)
  }, [])

  // Tell the page the nav can come in once the curtain is on its way up.
  useEffect(() => {
    if (phase !== 'reveal') onCurtainLift?.()
  }, [phase, onCurtainLift])

  // A fallback in case the video stalls: the copy never waits on the network.
  useEffect(() => {
    if (phase !== 'film') return
    const timer = window.setTimeout(() => setCopyShown(true), 2600)
    return () => window.clearTimeout(timer)
  }, [phase])

  // Scrolling during the intro means "I'm here for the page" — skip it.
  useEffect(() => {
    if (phase !== 'reveal' && phase !== 'film') return
    const onScroll = () => {
      if (window.scrollY > 24) skip()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [phase, skip])

  const copy = (delay: number) => ({
    initial: { opacity: 0, y: 22 },
    animate: copyShown ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 },
    transition: { duration: 0.9, delay: copyShown ? 0.2 + delay : 0, ease: [0.2, 0.8, 0.2, 1] as const },
  })

  const intro = phase === 'reveal' || phase === 'film'

  return (
    <header
      id="top"
      className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-terracotta px-5 pb-24 pt-28 sm:px-12"
    >
      <IntroFilm
        phase={phase}
        onProgress={(t) => {
          if (t >= COPY_AT_SECONDS) setCopyShown(true)
        }}
        onEnded={endFilm}
      />

      {/* Warmth over the footage: a terracotta multiply, stronger once the
          hero is at rest so the cloud loop reads as texture, not a film. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-terracotta mix-blend-multiply"
        initial={false}
        animate={{ opacity: phase === 'film' ? 0.46 : 0.62 }}
        transition={{ duration: 1.4, ease: 'easeInOut' }}
      />
      {/* Keeps the transparent nav legible over bright footage (the paddy
          fields are the brightest shot in the film). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-40"
        style={{ background: 'linear-gradient(to bottom, rgba(140,73,26,0.55), rgba(140,73,26,0))' }}
      />
      {/* A soft terracotta pool behind the copy, only while the copy is up. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(66% 54% at 50% 52%, rgba(174,79,52,0.72) 0%, rgba(174,79,52,0.36) 55%, rgba(174,79,52,0) 80%)',
        }}
        initial={false}
        animate={{ opacity: copyShown ? 1 : 0 }}
        transition={{ duration: 1 }}
      />

      <TwinStar
        size="clamp(10px,1.3vw,16px)"
        className="pointer-events-none absolute text-cream animate-twinkle"
        style={{ right: '8vw', bottom: '16vh' }}
      />
      <TwinStar
        size="clamp(7px,0.9vw,11px)"
        className="pointer-events-none absolute text-cream animate-twinkle"
        style={{ left: '9vw', top: '24vh', animationDelay: '1.4s' }}
      />

      <div className="relative z-10 flex w-full max-w-[880px] flex-col items-center">
        <motion.h1
          {...copy(0)}
          className="max-w-[19ch] text-center text-[clamp(32px,5.4vw,62px)] leading-[1.06] text-ivory"
        >
          Be close to their day, from wherever you are.
        </motion.h1>

        <motion.p
          {...copy(0.15)}
          className="mt-4 max-w-[52ch] text-center text-[clamp(15.5px,1.5vw,19px)] leading-relaxed text-ivory/92"
        >
          Smriti quietly keeps track of your parent&rsquo;s routines, medicine and mood at
          home — and tells the family what actually matters. Nothing to wear. Nothing to
          charge.
        </motion.p>

        <motion.div {...copy(0.3)} className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild variant="accent" size="lg">
            <Link to="/auth">Start free for 30 days</Link>
          </Button>
          <Button
            asChild
            size="lg"
            className="border border-ivory/55 bg-terracotta-deep/40 text-ivory hover:bg-terracotta-deep/70"
          >
            <a href="#how">See how it works</a>
          </Button>
        </motion.div>

        <motion.p {...copy(0.45)} className="mt-6 text-center text-[13.5px] text-ivory/80">
          Set up in one evening &middot; Your parent stays in control &middot; Cancel any time
        </motion.p>
      </div>

      {/* The curtain: the logo reveal, on a cloth that lifts away. */}
      <AnimatePresence>
        {phase === 'reveal' && (
          <motion.div
            key="curtain"
            className="absolute inset-0 z-30 flex items-center justify-center"
            style={{ background: gradient.hero }}
            exit={{ y: '-100%', transition: { duration: 1.15, ease: [0.7, 0, 0.18, 1] } }}
          >
            <TwinStar
              size="clamp(10px,1.3vw,16px)"
              className="pointer-events-none absolute text-cream opacity-30 animate-twinkle"
              style={{ right: '7vw', bottom: '12vh' }}
            />
            <motion.div
              exit={{
                scale: 0.42,
                y: '-12vh',
                opacity: 0,
                transition: { duration: 0.85, ease: [0.6, 0, 0.3, 1] },
              }}
            >
              <LogoReveal
                size={112}
                speed={1}
                onComplete={() => window.setTimeout(liftCurtain, CURTAIN_HOLD_MS)}
              />
            </motion.div>

            {/* The cloth's lower edge: a gamosa border and a temple-tooth
                fringe, hanging just below the fold until the curtain lifts. */}
            <div className="absolute inset-x-0 top-full">
              <GamosaBand size={22} />
              <TempleHem size={12} fill={color.eri} accent="transparent" flip />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {intro && (
          <motion.button
            key="skip"
            type="button"
            onClick={skip}
            className="absolute bottom-10 right-5 z-40 rounded-pill border border-ivory/40 bg-terracotta-deep/60 px-4 py-2 text-[13px] font-semibold text-ivory transition-colors hover:bg-terracotta-deep sm:right-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.8 } }}
            exit={{ opacity: 0 }}
          >
            Skip intro
          </motion.button>
        )}
      </AnimatePresence>

      <a
        href="#how"
        aria-label="Scroll to how it works"
        className="absolute inset-x-0 bottom-9 z-10 mx-auto w-fit text-ivory/70 animate-bob"
      >
        <ArrowDown className="size-5" strokeWidth={2.75} />
      </a>

      {/* Hemmed into the cream section below rather than cut off. */}
      <TempleHem size={18} fill={color.cream} className="absolute inset-x-0 bottom-0 z-20" />
    </header>
  )
}
