import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { Check, Image as ImageIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Logomark } from '@/components/brand/Logomark.tsx'
import { Wordmark } from '@/components/brand/Wordmark.tsx'
import { ThreadLine } from '@/components/motion/ThreadLine.tsx'
import { WeaveIn } from '@/components/motion/WeaveIn.tsx'
import {
  EightLooms,
  GamosaBand,
  HillLayers,
  JapiRosette,
  NagaBands,
  TwinStar,
} from '@/components/ner/index.ts'
import { Badge } from '@/components/ui/badge.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Eyebrow } from '@/components/ui/card.tsx'
import { cn } from '@/lib/utils.ts'
import { color } from '@/styles/tokens.ts'
import { Reveal } from './Reveal.tsx'
import { useTranslation } from '@/i18n/index.ts'

/* ══════════════════════════════════════════════════════════════════════════
   How it works — cream.
   Each step carries a different accent chip, so "three steps" reads as three
   distinct things rather than one thing repeated. A single thread runs down
   beside them and draws itself as you scroll, tying the three together.
   ══════════════════════════════════════════════════════════════════════════ */

const STEPS = [
  {
    n: 1,
    chip: 'bg-clay text-bark',
    card: 'bg-sand',
  },
  {
    n: 2,
    chip: 'bg-sage-soft text-sage',
    card: 'bg-sage-soft/60',
  },
  {
    n: 3,
    chip: 'bg-gold/25 text-[#8A6210]',
    card: 'bg-gold/[0.09]',
  },
]

export function HowItWorks() {
  const { t } = useTranslation()
  const stepKeys = [['marketing.step1Title', 'marketing.step1Body'], ['marketing.step2Title', 'marketing.step2Body'], ['marketing.step3Title', 'marketing.step3Body']] as const
  const steps = STEPS.map((step, i) => ({ ...step, title: t(stepKeys[i][0]), body: t(stepKeys[i][1]) }))
  return (
    <section id="how" className="bg-cream px-5 py-[clamp(64px,9vw,132px)] sm:px-12">
      <div className="mx-auto grid max-w-[1180px] items-start gap-[clamp(32px,5vw,72px)] md:grid-cols-2">
        <Reveal className="flex gap-5">
          <GamosaBand vertical size={12} className="hidden self-stretch rounded-[2px] sm:block" />
          <div>
            <Eyebrow className="mb-3.5 flex items-center gap-2">
              <TwinStar size={7} className="text-lac" />
              {t('marketing.how')}
            </Eyebrow>
            <h2 className="max-w-[22ch] text-[clamp(28px,3.6vw,44px)] leading-[1.1]">
              {t('marketing.howTitle')}
            </h2>
            <p className="mt-4.5 max-w-[44ch] text-[16.5px] leading-relaxed text-body">
              {t('marketing.howBody')}
            </p>
          </div>
        </Reveal>

        <div className="relative flex flex-col gap-3.5">
          <ThreadLine className="absolute inset-y-6 -left-7 hidden w-5 md:block" />
          {steps.map((step, i) => (
            <WeaveIn key={step.n} delay={0.1 * i}>
              <div className={cn('flex items-start gap-4 rounded-card px-6 py-5.5', step.card)}>
                <span
                  className={cn(
                    'grid size-9 flex-none place-items-center rounded-pill font-heading text-[15px] font-bold',
                    step.chip,
                  )}
                >
                  {step.n}
                </span>
                <div>
                  <h3 className="text-[19px]">{step.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-body">{step.body}</p>
                </div>
              </div>
            </WeaveIn>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Stat band — sage.

   The reference put this on sand, which made it the fourth cream section in a
   row and the point where the page stopped registering as sections at all.
   Sage is the palette's third voice and it earns its place here: a dark band
   between two light ones gives the page a spine. It is edged top and bottom
   with Naga shawl banding, drifting in opposite directions, so the band reads
   as a length of woven cloth laid across the page.
   ══════════════════════════════════════════════════════════════════════════ */

const STATS = [
  { value: 42000, display: '42,000' },
  { value: 3.1, display: '3.1M', suffix: 'M' },
  { value: 94, display: '94%', suffix: '%' },
  { value: 1, display: '1 evening' },
]

/** Counts up once, when the band scrolls into view. */
function CountUp({ stat }: { stat: (typeof STATS)[number] }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -20% 0px' })
  const reduceMotion = useReducedMotion()
  const [counted, setCounted] = useState<string | null>(null)

  // Under reduced motion the final value is the value — derived, not animated
  // into place by an effect that would fire a second render for nothing.
  const text = reduceMotion ? stat.display : (counted ?? '0')

  useEffect(() => {
    if (!inView || reduceMotion) return
    const duration = 1100
    const started = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      if (stat.display.includes('evening')) {
        setCounted(t < 1 ? '…' : stat.display)
      } else if (stat.suffix === 'M') {
        setCounted(`${(stat.value * eased).toFixed(1)}M`)
      } else if (stat.suffix === '%') {
        setCounted(`${Math.round(stat.value * eased)}%`)
      } else {
        setCounted(Math.round(stat.value * eased).toLocaleString())
      }
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [inView, reduceMotion, stat])

  return (
    <p
      ref={ref}
      className="numeral text-[clamp(34px,4.4vw,52px)] leading-none text-cream"
      aria-label={stat.display}
    >
      {text}
    </p>
  )
}

export function StatBand() {
  const { t } = useTranslation()
  const statKeys = ['marketing.stat1', 'marketing.stat2', 'marketing.stat3', 'marketing.stat4'] as const
  const stats = STATS.map((stat, i) => ({ ...stat, label: t(statKeys[i]) }))
  return (
    <section className="relative bg-sage">
      <NagaBands size={20} drift={7} />
      <div className="px-5 py-[clamp(48px,6vw,80px)] sm:px-12">
        <div className="mx-auto grid max-w-[1180px] gap-[clamp(24px,4vw,40px)] sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 0.08} y={14}>
              <CountUp stat={stat} />
              <p className="mt-2.5 text-[14.5px] leading-snug text-cream/80">{stat.label}</p>
            </Reveal>
          ))}
        </div>
      </div>
      <NagaBands size={20} drift={7} reverse />
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   The product preview — sand.
   ══════════════════════════════════════════════════════════════════════════ */

function PhonePreview() {
  const { t } = useTranslation()
  // The phone rides a little slower than the page, so it sits "in front of"
  // the section rather than being printed on it.
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [36, -36])

  return (
    <div ref={ref} className="relative flex justify-center">
      <div className="absolute top-[6%] aspect-square w-[min(420px,90%)] overflow-hidden rounded-full bg-cream">
        <JapiRosette
          size={420}
          strokeWidth={0.9}
          className="absolute inset-0 m-auto size-[92%] text-bark/12 animate-spin-slow"
        />
      </div>
      <motion.div
        style={{ y }}
        className="relative w-[min(310px,82vw)] rounded-[44px] bg-ink p-2.5 shadow-panel"
      >
        <div className="overflow-hidden rounded-[36px] bg-ivory">
          <div className="flex justify-center pb-1 pt-2.5">
            <span className="h-1.5 w-16 rounded-pill bg-ink/18" />
          </div>
          <div className="px-4.5 pb-4.5 pt-3">
            <div className="flex items-baseline justify-between">
              <p className="font-heading text-[19px] font-bold">{t('marketingPreview.date')}</p>
              <Badge tone="sage" size="sm">
                {t('marketingPreview.status')}
              </Badge>
            </div>
            <p className="mb-3.5 mt-0.5 text-[12.5px] text-muted">{t('marketingPreview.summary')}</p>

            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3 rounded-[20px] bg-sage-soft px-3.5 py-3">
                <span className="grid size-6.5 flex-none place-items-center rounded-full bg-sage-bright">
                  <Check className="size-3.5 text-ivory" strokeWidth={3.2} />
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold leading-tight">{t('marketingPreview.checkIn')}</p>
                  <p className="text-[12px] leading-tight text-sage">
                    {t('marketingPreview.checkInDetail')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-[20px] bg-clay px-3.5 py-3">
                <span className="grid size-6.5 flex-none place-items-center rounded-full bg-[#D67F48]">
                  <Check className="size-3.5 text-ivory" strokeWidth={3.2} />
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold leading-tight">{t('marketingPreview.medicine')}</p>
                  <p className="text-[12px] leading-tight text-bark">
                    {t('marketingPreview.medicineDetail')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-[20px] bg-[#EEE7DB] px-3.5 py-3">
                <span className="size-6.5 flex-none rounded-full border-2 border-dashed border-[#C0B6A5]" />
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold leading-tight">{t('marketingPreview.walk')}</p>
                  <p className="text-[12px] leading-tight text-muted">{t('marketingPreview.walkDetail')}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-[20px] bg-sand px-3 py-2.5">
                <span className="grid size-11 flex-none place-items-center rounded-[14px] bg-[#DCD3C4] text-[#82796A]">
                  <ImageIcon className="size-4.5" strokeWidth={2.2} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-bark">{t('marketingPreview.memory')}</p>
                  <p className="text-[13px] leading-snug">{t('marketingPreview.memoryDetail')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export function ProductPreview() {
  const { t } = useTranslation()
  const promises = [t('marketing.promise1'), t('marketing.promise2'), t('marketing.promise3')]
  return (
    <section className="overflow-hidden bg-sand bg-cane-twill px-5 py-[clamp(64px,9vw,130px)] sm:px-12">
      <div className="mx-auto grid max-w-[1180px] items-center gap-[clamp(40px,6vw,80px)] md:grid-cols-2">
        <Reveal>
          <Eyebrow className="mb-3 flex items-center gap-2 text-sage">
            <TwinStar size={7} />
            {t('marketing.yourSide')}
          </Eyebrow>
          <h2 className="max-w-[20ch] text-[clamp(28px,3.8vw,46px)] leading-[1.08]">
            {t('marketing.previewTitle')}
          </h2>
          <p className="mb-6 mt-4.5 max-w-[42ch] text-[16.5px] leading-relaxed text-body">
            {t('marketing.previewBody')}
          </p>
          <ul className="flex max-w-[44ch] flex-col gap-3.5">
            {promises.map((promise) => (
              <li key={promise} className="flex items-baseline gap-3 text-[15.5px] leading-snug">
                <TwinStar size={6} className="relative -top-px flex-none text-lac" />
                {promise}
              </li>
            ))}
          </ul>
          <Button asChild className="mt-8" size="lg">
            <Link to="/auth">{t('marketing.tour')}</Link>
          </Button>
        </Reveal>

        <Reveal delay={0.12} y={30}>
          <PhonePreview />
        </Reveal>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Stories — ivory.
   ══════════════════════════════════════════════════════════════════════════ */

/*
 * The families here are the ones Smriti is for in the Northeast: children
 * who went to Bengaluru, Delhi or Pune for work, and parents who stayed in
 * Jorhat, Aizawl or Kohima. Each card is edged with a different weave.
 */
const STORIES = [
  {
    name: 'Ananya B.',
    tone: 'bg-cream',
    ring: 'bg-terracotta/15 text-terracotta',
    edge: 'bg-risa',
  },
  {
    name: 'Lalrin T.',
    tone: 'bg-sage-soft',
    ring: 'bg-sage/15 text-sage',
    edge: 'bg-ryndia',
  },
  {
    name: 'Temsu A.',
    tone: 'bg-gold/12',
    ring: 'bg-gold/25 text-[#8A6210]',
    edge: 'bg-thara',
  },
]

export function Stories() {
  const { t } = useTranslation()
  const storyKeys = [['marketing.story1', 'marketing.story1Where'], ['marketing.story2', 'marketing.story2Where'], ['marketing.story3', 'marketing.story3Where']] as const
  const stories = STORIES.map((story, i) => ({ ...story, quote: t(storyKeys[i][0]), where: t(storyKeys[i][1]) }))
  return (
    <section id="stories" className="bg-ivory px-5 py-[clamp(64px,9vw,130px)] sm:px-12">
      <div className="mx-auto max-w-[1180px]">
        <Reveal>
          <Eyebrow className="mb-3 flex items-center gap-2">
            <TwinStar size={7} className="text-lac" />
            {t('marketing.storiesTitle')}
          </Eyebrow>
          <h2 className="mb-[clamp(32px,4vw,56px)] max-w-[24ch] text-[clamp(26px,3.4vw,42px)]">
            {t('marketing.storiesHeading')}
          </h2>
        </Reveal>

        <div className="grid gap-[clamp(18px,2.5vw,28px)] md:grid-cols-3">
          {stories.map((story, i) => (
            <WeaveIn key={story.name} delay={i * 0.12} className="h-full">
              <figure
                className={cn(
                  'relative flex h-full flex-col gap-5 overflow-hidden rounded-panel p-[clamp(24px,3vw,32px)] pt-[clamp(32px,3.6vw,40px)]',
                  story.tone,
                )}
              >
                <span aria-hidden="true" className={cn('absolute inset-x-0 top-0 h-2', story.edge)} />
                <blockquote className="font-heading text-[clamp(18px,1.9vw,21px)] font-medium leading-snug">
                  “{story.quote}”
                </blockquote>
                <figcaption className="mt-auto flex items-center gap-3.5 text-[13.5px] leading-snug text-muted">
                  <span
                    className={cn(
                      'grid size-14 flex-none place-items-center rounded-full font-heading text-lg font-bold ring-2 ring-current/15 ring-offset-2 ring-offset-transparent',
                      story.ring,
                    )}
                  >
                    {story.name[0]}
                  </span>
                  <span>
                    <span className="block text-[14.5px] font-semibold text-ink">
                      {story.name}
                    </span>
                    {story.where}
                  </span>
                </figcaption>
              </figure>
            </WeaveIn>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Closing call to action — terracotta.
   The logomark turns slowly beside a japi crown, and the section ends on the
   hills: three ridgelines rising at different rates as it scrolls in, the
   nearest one in the footer's cream so the page lands on the ground.
   ══════════════════════════════════════════════════════════════════════════ */

export function FinalCta() {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()

  return (
    <section
      id="start"
      className="relative overflow-hidden bg-terracotta px-5 pb-[clamp(140px,16vw,230px)] pt-[clamp(72px,10vw,140px)] sm:px-12"
    >
      <motion.div
        className="pointer-events-none absolute -right-[6vw] -top-[4vw] w-[min(46vw,420px)] opacity-[0.09]"
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
      >
        <Logomark size={420} color="var(--color-cream)" strokeWidth={8.6} decorative />
      </motion.div>
      <motion.div
        className="pointer-events-none absolute -left-[5vw] top-[18%] hidden text-cream opacity-[0.1] md:block"
        animate={reduceMotion ? undefined : { rotate: -360 }}
        transition={{ duration: 160, repeat: Infinity, ease: 'linear' }}
      >
        <JapiRosette size={300} strokeWidth={1.1} />
      </motion.div>

      <HillLayers
        colors={[color.terracottaDeep, color.bark, color.cream]}
        className="absolute inset-x-0 bottom-0"
      />

      <Reveal className="relative mx-auto max-w-[760px] text-center">
        <h2 className="text-[clamp(28px,4.2vw,52px)] leading-[1.08] text-ivory">
          {t('marketing.ctaTitle')}
        </h2>
        <p className="mx-auto mb-7.5 mt-4.5 max-w-[46ch] text-[17px] leading-relaxed text-ivory/86">
          {t('marketing.ctaBody')}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild variant="accent" size="lg">
            <Link to="/auth">{t('marketing.startTrial')}</Link>
          </Button>
          <Button
            asChild
            size="lg"
            className="border border-ivory/45 bg-transparent text-ivory hover:bg-ivory/12"
          >
            <a href="#how">{t('marketing.talk')}</a>
          </Button>
        </div>
        <p className="mt-5.5 text-[13.5px] text-ivory/62">
          {t('marketing.noCard')}
        </p>
      </Reveal>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Footer — cream.
   ══════════════════════════════════════════════════════════════════════════ */

export function MarketingFooter() {
  const { t } = useTranslation()
  const footerColumns = [
    { heading: t('marketing.product'), links: [{ label: t('marketing.features'), href: '#features' }, { label: t('marketing.how'), href: '#how' }, { label: t('marketing.pricing'), href: '#start' }, { label: t('marketing.download'), href: '#start' }] },
    { heading: t('marketing.care'), links: [{ label: t('marketing.setupWithUs'), href: '#start' }, { label: t('marketing.help'), href: '#start' }, { label: t('marketing.privacy'), href: '#start' }, { label: t('marketing.familyStories'), href: '#stories' }] },
    { heading: t('marketing.company'), links: [{ label: t('marketing.about'), href: '#top' }, { label: t('marketing.careers'), href: '#top' }, { label: t('marketing.contact'), href: '#top' }] },
  ]
  return (
    <footer className="bg-cream pb-8 text-body">
      <GamosaBand size={16} />

      {/* Eight sisters, eight looms: the weave behind every border on this
          page, named and credited to its state. */}
      <div className="mx-auto max-w-[1180px] px-5 pt-[clamp(40px,5vw,64px)] sm:px-12">
        <p className="mb-4 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted">
          {t('marketing.looms')}
        </p>
      </div>
      <EightLooms className="mx-auto max-w-[1280px] px-5 sm:px-12" />

      <div className="mx-auto mt-[clamp(40px,5vw,64px)] grid max-w-[1180px] gap-[clamp(28px,4vw,56px)] px-5 sm:grid-cols-2 sm:px-12 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5 text-terracotta">
            <Logomark size={24} decorative />
            <Wordmark size={18} color="var(--color-ink)" />
          </div>
          <p className="mt-3.5 max-w-[26ch] text-[13.5px] leading-relaxed">
            {t('marketing.footerMeaning')}
          </p>
        </div>

        {footerColumns.map((column) => (
          <div key={column.heading}>
            <p className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted">
              {column.heading}
            </p>
            <div className="flex flex-col gap-2 text-[14px]">
              {column.links.map((link) => (
                <a key={link.label} href={link.href} className="transition-colors hover:text-bark">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-[clamp(36px,5vw,64px)] max-w-[1180px] px-5 sm:px-12">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-ink/10 pt-5 text-[12.5px] text-muted">
          <p>{t('marketingPreview.copyright', { year: new Date().getFullYear() })}</p>
          <p className="max-w-[62ch]">{t('marketingPreview.motifs')}</p>
        </div>
      </div>
    </footer>
  )
}
