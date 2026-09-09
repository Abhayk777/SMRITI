import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { Check, Image as ImageIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Logomark } from '@/components/brand/Logomark.tsx'
import { Wordmark } from '@/components/brand/Wordmark.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Eyebrow } from '@/components/ui/card.tsx'
import { cn } from '@/lib/utils.ts'
import { Reveal } from './Reveal.tsx'

/* ══════════════════════════════════════════════════════════════════════════
   How it works — cream.
   Each step carries a different accent chip, so "three steps" reads as three
   distinct things rather than one thing repeated.
   ══════════════════════════════════════════════════════════════════════════ */

const STEPS = [
  {
    n: 1,
    title: 'They answer a gentle check-in',
    body: 'One card, one tap. “Did you sleep well?” — never a form, never an alarm.',
    chip: 'bg-clay text-bark',
    card: 'bg-sand',
  },
  {
    n: 2,
    title: 'Smriti notices the pattern',
    body: 'Routines kept, medicine taken, the days that felt heavier than usual.',
    chip: 'bg-sage-soft text-sage',
    card: 'bg-sage-soft/60',
  },
  {
    n: 3,
    title: 'You get the short version',
    body: 'A calm daily line, a weekly report the whole family can see, and one memory they chose to share.',
    chip: 'bg-gold/25 text-[#8A6210]',
    card: 'bg-gold/[0.09]',
  },
]

export function HowItWorks() {
  return (
    <section id="how" className="bg-cream px-5 py-[clamp(64px,9vw,132px)] sm:px-12">
      <div className="mx-auto grid max-w-[1180px] items-start gap-[clamp(32px,5vw,72px)] md:grid-cols-2">
        <Reveal>
          <Eyebrow className="mb-3.5">How it works</Eyebrow>
          <h2 className="max-w-[22ch] text-[clamp(28px,3.6vw,44px)] leading-[1.1]">
            Three small things a day. One quiet answer for you.
          </h2>
          <p className="mt-4.5 max-w-[44ch] text-[16.5px] leading-relaxed text-body">
            Smriti sits in the background of your parent&rsquo;s home — a tablet or their own
            phone — and asks for very little. What it gathers, it turns into something you
            can read in half a minute.
          </p>
        </Reveal>

        <div className="flex flex-col gap-3.5">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={0.08 * i} y={16}>
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
            </Reveal>
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
   between two light ones gives the page a spine.
   ══════════════════════════════════════════════════════════════════════════ */

const STATS = [
  { value: 42000, display: '42,000', label: 'families keeping watch together, in 14 countries' },
  { value: 3.1, display: '3.1M', suffix: 'M', label: 'check-ins answered — 91% without a reminder' },
  { value: 94, display: '94%', suffix: '%', label: 'of families are still using Smriti after a year' },
  { value: 1, display: '1 evening', label: 'average setup, with a real person on the call if you want one' },
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
  return (
    <section className="bg-sage px-5 py-[clamp(48px,6vw,80px)] sm:px-12">
      <div className="mx-auto grid max-w-[1180px] gap-[clamp(24px,4vw,40px)] sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat, i) => (
          <Reveal key={stat.label} delay={i * 0.08} y={14}>
            <CountUp stat={stat} />
            <p className="mt-2.5 text-[14.5px] leading-snug text-cream/75">{stat.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   The product preview — sand.
   ══════════════════════════════════════════════════════════════════════════ */

const PROMISES = [
  'Ma decides what is shared, and can see everything you see.',
  'Invite siblings, a carer or a neighbour with their own view.',
  'Quiet hours by default. We only push when it matters.',
]

function PhonePreview() {
  return (
    <div className="relative flex justify-center">
      <div className="absolute top-[6%] aspect-square w-[min(420px,90%)] rounded-full bg-cream" />
      <div className="relative w-[min(310px,82vw)] rounded-[44px] bg-ink p-2.5 shadow-panel">
        <div className="overflow-hidden rounded-[36px] bg-ivory">
          <div className="flex justify-center pb-1 pt-2.5">
            <span className="h-1.5 w-16 rounded-pill bg-ink/18" />
          </div>
          <div className="px-4.5 pb-4.5 pt-3">
            <div className="flex items-baseline justify-between">
              <p className="font-heading text-[19px] font-bold">Tuesday, 12 May</p>
              <Badge tone="sage" size="sm">
                All well
              </Badge>
            </div>
            <p className="mb-3.5 mt-0.5 text-[12.5px] text-muted">Amma · Pune · 3 things today</p>

            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3 rounded-[20px] bg-sage-soft px-3.5 py-3">
                <span className="grid size-6.5 flex-none place-items-center rounded-full bg-sage-bright">
                  <Check className="size-3.5 text-ivory" strokeWidth={3.2} />
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold leading-tight">Morning check-in</p>
                  <p className="text-[12px] leading-tight text-sage">
                    8:12 · “Slept well, knee is better”
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-[20px] bg-clay px-3.5 py-3">
                <span className="grid size-6.5 flex-none place-items-center rounded-full bg-[#D67F48]">
                  <Check className="size-3.5 text-ivory" strokeWidth={3.2} />
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold leading-tight">Blood pressure tablet</p>
                  <p className="text-[12px] leading-tight text-bark">
                    9:00 · taken, no reminder needed
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-[20px] bg-[#EEE7DB] px-3.5 py-3">
                <span className="size-6.5 flex-none rounded-full border-2 border-dashed border-[#C0B6A5]" />
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold leading-tight">Walk with Anita</p>
                  <p className="text-[12px] leading-tight text-muted">5:30 pm · not yet</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-[20px] bg-sand px-3 py-2.5">
                <span className="grid size-11 flex-none place-items-center rounded-[14px] bg-[#DCD3C4] text-[#82796A]">
                  <ImageIcon className="size-4.5" strokeWidth={2.2} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-bark">Memory shared</p>
                  <p className="text-[13px] leading-snug">
                    “Your grandfather&rsquo;s Ambassador, 1974.”
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ProductPreview() {
  return (
    <section className="overflow-hidden bg-sand px-5 py-[clamp(64px,9vw,130px)] sm:px-12">
      <div className="mx-auto grid max-w-[1180px] items-center gap-[clamp(40px,6vw,80px)] md:grid-cols-2">
        <Reveal>
          <Eyebrow className="mb-3 text-sage">Your side of it</Eyebrow>
          <h2 className="max-w-[20ch] text-[clamp(28px,3.8vw,46px)] leading-[1.08]">
            Their whole day, in one calm view.
          </h2>
          <p className="mb-6 mt-4.5 max-w-[42ch] text-[16.5px] leading-relaxed text-body">
            Open Smriti at lunch and you know where the day stands. No dashboards, no charts
            to interpret — just today, in plain words.
          </p>
          <ul className="flex max-w-[44ch] flex-col gap-3.5">
            {PROMISES.map((promise) => (
              <li key={promise} className="flex gap-3 text-[15.5px] leading-snug">
                <span className="flex-none text-terracotta">—</span>
                {promise}
              </li>
            ))}
          </ul>
          <Button asChild className="mt-8" size="lg">
            <Link to="/auth">Take a tour of the app</Link>
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

const STORIES = [
  {
    quote:
      'I used to call three times a day and still worry. Now I see at lunch that Amma had their tablets, and I can get on with my afternoon.',
    name: 'Divya R.',
    where: 'Seattle · their mother is in Pune',
    tone: 'bg-cream',
    ring: 'bg-terracotta/15 text-terracotta',
  },
  {
    quote:
      'The weekly report ended a lot of arguments between my brother and me. We finally read the same week.',
    name: 'Marcus T.',
    where: 'Atlanta · his dad is in Macon',
    tone: 'bg-sage-soft',
    ring: 'bg-sage/15 text-sage',
  },
  {
    quote:
      'Papa sends a memory every evening. Some days it is his old scooter. It has become the best message of my day.',
    name: 'Leila H.',
    where: 'Lyon · their father lives two streets away',
    tone: 'bg-gold/12',
    ring: 'bg-gold/25 text-[#8A6210]',
  },
]

export function Stories() {
  return (
    <section id="stories" className="bg-ivory px-5 py-[clamp(64px,9vw,130px)] sm:px-12">
      <div className="mx-auto max-w-[1180px]">
        <Reveal>
          <Eyebrow className="mb-3">Stories</Eyebrow>
          <h2 className="mb-[clamp(32px,4vw,56px)] max-w-[24ch] text-[clamp(26px,3.4vw,42px)]">
            From sons and daughters, mostly at a distance
          </h2>
        </Reveal>

        <div className="grid gap-[clamp(18px,2.5vw,28px)] md:grid-cols-3">
          {STORIES.map((story, i) => (
            <Reveal key={story.name} delay={i * 0.1} y={20}>
              <figure
                className={cn(
                  'flex h-full flex-col gap-5 rounded-panel p-[clamp(24px,3vw,32px)]',
                  story.tone,
                )}
              >
                <blockquote className="font-heading text-[clamp(18px,1.9vw,21px)] font-medium leading-snug">
                  “{story.quote}”
                </blockquote>
                <figcaption className="mt-auto flex items-center gap-3.5 text-[13.5px] leading-snug text-muted">
                  <span
                    className={cn(
                      'grid size-14 flex-none place-items-center rounded-full font-heading text-lg font-bold',
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
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Closing call to action — terracotta.
   ══════════════════════════════════════════════════════════════════════════ */

export function FinalCta() {
  const reduceMotion = useReducedMotion()

  return (
    <section
      id="start"
      className="relative overflow-hidden bg-terracotta px-5 py-[clamp(72px,10vw,140px)] sm:px-12"
    >
      <motion.div
        className="pointer-events-none absolute -right-[6vw] -top-[4vw] w-[min(46vw,420px)] opacity-[0.09]"
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
      >
        <Logomark size={420} color="var(--color-cream)" strokeWidth={8.6} decorative />
      </motion.div>

      <Reveal className="relative mx-auto max-w-[760px] text-center">
        <h2 className="text-[clamp(28px,4.2vw,52px)] leading-[1.08] text-ivory">
          Tonight, this takes about as long as making tea.
        </h2>
        <p className="mx-auto mb-7.5 mt-4.5 max-w-[46ch] text-[17px] leading-relaxed text-ivory/86">
          Set Smriti up on your parent&rsquo;s phone or tablet, invite your siblings, and see
          the first check-in tomorrow morning.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild variant="accent" size="lg">
            <Link to="/auth">Start free for 30 days</Link>
          </Button>
          <Button
            asChild
            size="lg"
            className="border border-ivory/45 bg-transparent text-ivory hover:bg-ivory/12"
          >
            <a href="#how">Talk to a real person</a>
          </Button>
        </div>
        <p className="mt-5.5 text-[13.5px] text-ivory/62">
          No card needed &middot; Works on iPhone, Android and iPad
        </p>
      </Reveal>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Footer — cream.
   ══════════════════════════════════════════════════════════════════════════ */

const FOOTER_COLUMNS = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How it works', href: '#how' },
      { label: 'Pricing', href: '#start' },
      { label: 'Download', href: '#start' },
    ],
  },
  {
    heading: 'Care',
    links: [
      { label: 'Set up with us', href: '#start' },
      { label: 'Help centre', href: '#start' },
      { label: 'Our privacy promise', href: '#start' },
      { label: 'Family stories', href: '#stories' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About Smriti', href: '#top' },
      { label: 'Careers', href: '#top' },
      { label: 'Contact', href: '#top' },
    ],
  },
]

export function MarketingFooter() {
  return (
    <footer className="bg-cream px-5 pb-8 pt-[clamp(48px,7vw,88px)] text-body sm:px-12">
      <div className="mx-auto grid max-w-[1180px] gap-[clamp(28px,4vw,56px)] sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5 text-terracotta">
            <Logomark size={24} decorative />
            <Wordmark size={18} color="var(--color-ink)" />
          </div>
          <p className="mt-3.5 max-w-[26ch] text-[13.5px] leading-relaxed">
            Smriti (स्मृति) is Sanskrit for memory — what is kept, and what is passed on.
          </p>
        </div>

        {FOOTER_COLUMNS.map((column) => (
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

      <p className="mx-auto mt-[clamp(36px,5vw,64px)] max-w-[1180px] border-t border-ink/10 pt-5 text-[12.5px] text-muted">
        © {new Date().getFullYear()} Smriti Care · Made for the ones who worry.
      </p>
    </footer>
  )
}
