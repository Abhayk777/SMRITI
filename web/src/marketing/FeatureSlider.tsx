import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Eyebrow } from '@/components/ui/card.tsx'
import { cn } from '@/lib/utils.ts'
import { Reveal } from './Reveal.tsx'

type Slide = {
  index: string
  kicker: string
  title: string
  body: string
  /** Each slide owns an accent, so the rail is not four cards of one colour. */
  accent: 'gold' | 'sage' | 'coral' | 'bark'
  art: 'morning' | 'pills' | 'siblings' | 'photograph'
}

const SLIDES: Slide[] = [
  {
    index: '01',
    kicker: 'Daily check-ins',
    title: 'A quiet “good morning” that tells you a lot.',
    body: 'Sleep, appetite, mood — three taps at their own pace, and a note in your day by nine.',
    accent: 'gold',
    art: 'morning',
  },
  {
    index: '02',
    kicker: 'Gentle reminders',
    title: 'Medicine, remembered — without the nagging.',
    body: 'A soft chime at their hour, in their language. If a dose is missed twice, you are the one who hears about it.',
    accent: 'sage',
    art: 'pills',
  },
  {
    index: '03',
    kicker: 'The weekly report',
    title: 'The week, gathered for everyone who cares.',
    body: 'One page every Sunday: routines kept, what changed, what to ask their doctor. Shared with the siblings, so nobody is guessing.',
    accent: 'coral',
    art: 'siblings',
  },
  {
    index: '04',
    kicker: 'A memory a day',
    title: 'One small story, shared with the family.',
    body: 'Smriti asks them about a photo, a place, a song. What they say becomes something your children will still have.',
    accent: 'bark',
    art: 'photograph',
  },
]

const ACCENT: Record<Slide['accent'], { text: string; ground: string; mark: string }> = {
  gold: { text: 'text-[#8A6210]', ground: 'from-gold/35 to-cream', mark: 'bg-gold' },
  sage: { text: 'text-sage', ground: 'from-sage/25 to-sage-soft', mark: 'bg-sage' },
  coral: { text: 'text-[#B4503E]', ground: 'from-coral/30 to-clay', mark: 'bg-coral' },
  bark: { text: 'text-bark', ground: 'from-terracotta/25 to-sand', mark: 'bg-terracotta' },
}

/**
 * Stand-in artwork for the photography that will replace it.
 *
 * The reference used `<image-slot>` placeholders that only exist in the tool
 * that generated it. Rather than leave four grey rectangles, each slide gets a
 * simple drawn scene in its own accent — so the rail reads as designed at this
 * stage, and swapping in real photographs later is one `<img>` per slide.
 */
function SlideArt({ art, accent }: { art: Slide['art']; accent: Slide['accent'] }) {
  const a = ACCENT[accent]
  return (
    <div
      className={cn(
        'relative aspect-[4/5] overflow-hidden rounded-panel bg-gradient-to-br',
        a.ground,
      )}
    >
      <svg viewBox="0 0 400 500" className="absolute inset-0 size-full" aria-hidden="true">
        {art === 'morning' && (
          <g fill="none" stroke="currentColor" className="text-ink/25" strokeWidth="3">
            <circle cx="286" cy="126" r="46" className="fill-gold/40" strokeWidth="0" />
            <path d="M70 340 h260 M70 340 v-150 h260 v150" />
            <path d="M200 190 v150 M70 265 h260" />
            <path d="M40 340 h320 v20 H40z" className="fill-ink/8" strokeWidth="0" />
            <path d="M120 440 c0-34 24-56 56-56 s56 22 56 56z" className="fill-ivory/70" />
          </g>
        )}
        {art === 'pills' && (
          <g fill="none" stroke="currentColor" className="text-ink/25" strokeWidth="3">
            <rect x="70" y="230" width="260" height="120" rx="18" className="fill-ivory/70" />
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <circle key={i} cx={100 + i * 34} cy={290} r="13" className="fill-sage/40" />
            ))}
            <path d="M120 200 c20-40 60-60 100-46" />
            <path d="M40 380 h320" />
          </g>
        )}
        {art === 'siblings' && (
          <g fill="none" stroke="currentColor" className="text-ink/25" strokeWidth="3">
            <circle cx="150" cy="180" r="38" className="fill-ivory/70" />
            <circle cx="252" cy="196" r="34" className="fill-ivory/60" />
            <path d="M92 330 c0-40 26-66 58-66 s58 26 58 66z" className="fill-coral/25" />
            <path d="M200 340 c0-36 24-60 52-60 s52 24 52 60z" className="fill-coral/18" />
            <rect x="146" y="370" width="108" height="72" rx="12" className="fill-ivory/80" />
          </g>
        )}
        {art === 'photograph' && (
          <g fill="none" stroke="currentColor" className="text-ink/25" strokeWidth="3">
            <rect
              x="90"
              y="150"
              width="220"
              height="180"
              rx="10"
              className="fill-ivory/80"
              transform="rotate(-4 200 240)"
            />
            <path d="M110 300 l60-52 44 34 34-24 52 42" transform="rotate(-4 200 240)" />
            <circle cx="160" cy="200" r="14" transform="rotate(-4 200 240)" />
            <path d="M120 400 c30-24 60-24 90 0 M190 412 c30-24 60-24 90 0" />
          </g>
        )}
      </svg>
    </div>
  )
}

/**
 * The feature rail.
 *
 * Touch swipe comes from a real scroll container with snap points, which is
 * what a phone expects and what the reference's buttons-only rail did not
 * offer. Pointer drag is added on top so the same gesture works with a mouse
 * or trackpad. The buttons remain, because a rail with no visible control is
 * a rail some people never discover.
 */
export function FeatureSlider() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const drag = useRef<{ startX: number; startScroll: number; moved: boolean } | null>(null)

  const scrollToSlide = useCallback((index: number) => {
    const track = trackRef.current
    if (!track) return
    const card = track.children[index] as HTMLElement | undefined
    if (!card) return
    track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: 'smooth' })
  }, [])

  // Which card is nearest the left edge decides the active dot.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const onScroll = () => {
      const cards = Array.from(track.children) as HTMLElement[]
      let nearest = 0
      let best = Infinity
      cards.forEach((card, i) => {
        const distance = Math.abs(card.offsetLeft - track.offsetLeft - track.scrollLeft)
        if (distance < best) {
          best = distance
          nearest = i
        }
      })
      setActive(nearest)
    }
    track.addEventListener('scroll', onScroll, { passive: true })
    return () => track.removeEventListener('scroll', onScroll)
  }, [])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Touch already scrolls natively; hijacking it would fight the snap points.
    if (e.pointerType === 'touch') return
    const track = trackRef.current
    if (!track) return
    drag.current = { startX: e.clientX, startScroll: track.scrollLeft, moved: false }
    track.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current
    if (!track || !drag.current) return
    const dx = e.clientX - drag.current.startX
    if (Math.abs(dx) > 4) drag.current.moved = true
    track.scrollLeft = drag.current.startScroll - dx
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current
    if (track?.hasPointerCapture(e.pointerId)) track.releasePointerCapture(e.pointerId)
    drag.current = null
  }

  return (
    <section id="features" className="bg-ivory pb-[clamp(56px,8vw,110px)] pt-[clamp(56px,8vw,104px)]">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-end justify-between gap-6 px-5 sm:px-12">
        <Reveal>
          <Eyebrow className="mb-3">Inside Smriti</Eyebrow>
          <h2 className="max-w-[24ch] text-[clamp(26px,3.4vw,40px)]">
            Four things you&rsquo;ll actually use
          </h2>
        </Reveal>
        <Reveal delay={0.1} className="flex gap-2.5">
          <button
            type="button"
            onClick={() => scrollToSlide(Math.max(0, active - 1))}
            aria-label="Previous"
            className="grid size-11 place-items-center rounded-pill border border-ink/20 text-ink transition-colors hover:bg-ink/[0.05] disabled:opacity-35"
            disabled={active === 0}
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollToSlide(Math.min(SLIDES.length - 1, active + 1))}
            aria-label="Next"
            className="grid size-11 place-items-center rounded-pill border border-ink/20 text-ink transition-colors hover:bg-ink/[0.05] disabled:opacity-35"
            disabled={active === SLIDES.length - 1}
          >
            <ChevronRight className="size-5" />
          </button>
        </Reveal>
      </div>

      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="no-scrollbar mt-9 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-3 sm:gap-6 sm:px-12 [scroll-padding-left:1.25rem] sm:[scroll-padding-left:3rem]"
        style={{ cursor: 'grab', touchAction: 'pan-x pan-y' }}
      >
        {SLIDES.map((slide, i) => (
          <Reveal
            as="article"
            key={slide.index}
            delay={i * 0.06}
            className="w-[min(82vw,440px)] flex-none snap-start"
          >
            <SlideArt art={slide.art} accent={slide.accent} />
            <p
              className={cn(
                'mt-5 text-[12px] font-medium uppercase tracking-[0.14em]',
                ACCENT[slide.accent].text,
              )}
            >
              {slide.index} &middot; {slide.kicker}
            </p>
            <h3 className="mt-1.5 max-w-[22ch] text-[clamp(21px,2.4vw,27px)]">{slide.title}</h3>
            <p className="mt-2.5 max-w-[34ch] text-[15.5px] leading-relaxed text-body">
              {slide.body}
            </p>
          </Reveal>
        ))}
      </div>

      <div className="mx-auto mt-4 flex max-w-[1180px] gap-2 px-5 sm:px-12">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.index}
            type="button"
            aria-label={`Go to ${slide.kicker}`}
            aria-current={i === active}
            onClick={() => scrollToSlide(i)}
            className={cn(
              'h-1.5 rounded-pill transition-all duration-300',
              i === active ? cn('w-8', ACCENT[slide.accent].mark) : 'w-4 bg-ink/15',
            )}
          />
        ))}
      </div>
    </section>
  )
}
