import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Siniar } from '@/components/ner/Siniar.tsx'
import { TwinStar } from '@/components/ner/TwinStar.tsx'
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

const ACCENT: Record<Slide['accent'], { text: string; ground: string }> = {
  gold: { text: 'text-[#8A6210]', ground: 'from-gold/35 to-cream' },
  sage: { text: 'text-sage', ground: 'from-sage/25 to-sage-soft' },
  coral: { text: 'text-[#B4503E]', ground: 'from-coral/30 to-clay' },
  bark: { text: 'text-bark', ground: 'from-terracotta/25 to-sand' },
}

/**
 * Stand-in artwork for the photography that will replace it.
 *
 * Each slide is a small drawn scene from a Northeast home, in its own accent:
 *
 *   morning     a bamboo stilt house (chang ghar) with the sun over the hills
 *   pills       the week's pill box on a woven cane tray, beside a cup of tea
 *   siblings    two figures wrapped in striped shawls, one with the tablet
 *   photograph  an old print of a tea-garden slope, shade trees and all
 *
 * The top edge of every card is a band of Mizo siniar. Swapping in real
 * photographs later is still one `<img>` per slide.
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
          <g fill="none" stroke="currentColor" className="text-ink/25" strokeWidth="3" strokeLinejoin="round">
            <circle cx="290" cy="128" r="44" className="fill-gold/45" strokeWidth="0" />
            <path d="M0 250 C 80 200 140 232 210 206 S 330 180 400 216 V500 H0 Z" className="fill-paddy/15" strokeWidth="0" />
            <path d="M0 304 C 100 272 180 302 262 282 S 360 264 400 282 V500 H0 Z" className="fill-paddy/22" strokeWidth="0" />
            {/* The house on its stilts. */}
            <path d="M104 262 L200 198 L296 262 Z" className="fill-bark/20" />
            <path d="M136 244 L200 212 M160 252 L200 228 M264 244 L200 212 M240 252 L200 228" strokeWidth="2" />
            <rect x="124" y="262" width="152" height="58" className="fill-ivory/80" />
            <path d="M144 262 v58 M256 262 v58" strokeWidth="2" />
            <rect x="186" y="276" width="28" height="44" className="fill-bark/15" />
            <path d="M104 320 H296" strokeWidth="4" />
            <path d="M128 320 V420 M172 320 V420 M228 320 V420 M272 320 V420" />
            <path d="M84 420 L104 320 M100 420 L118 332 M86 404 H102 M90 384 H106 M94 364 H110 M98 344 H114" strokeWidth="2" />
            <path d="M28 420 H372" />
            {/* Bamboo at the edge of the clearing. */}
            <path d="M338 420 C 334 360 346 300 330 240 M352 420 C 352 350 362 300 356 250" strokeWidth="2.5" />
            <path d="M330 262 l-18 -8 M332 290 l18 -10 M356 276 l16 -8" strokeWidth="2" />
          </g>
        )}
        {art === 'pills' && (
          <g fill="none" stroke="currentColor" className="text-ink/25" strokeWidth="3">
            <defs>
              <clipPath id="slide-cane-tray">
                <ellipse cx="200" cy="332" rx="166" ry="58" />
              </clipPath>
            </defs>
            {/* A round cane tray, its weave hatched in. */}
            <ellipse cx="200" cy="332" rx="166" ry="58" className="fill-muga/25" />
            <g clipPath="url(#slide-cane-tray)" strokeWidth="1.5" className="text-bark/30">
              {Array.from({ length: 22 }, (_, i) => (
                <path key={`a${i}`} d={`M${i * 18 + 10} 270 l-60 130`} />
              ))}
              {Array.from({ length: 22 }, (_, i) => (
                <path key={`b${i}`} d={`M${i * 18 - 50} 270 l60 130`} />
              ))}
            </g>
            <ellipse cx="200" cy="332" rx="166" ry="58" />
            <rect x="72" y="262" width="210" height="64" rx="16" className="fill-ivory/85" />
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <circle key={i} cx={98 + i * 26.5} cy={294} r="10" className="fill-sage/40" />
            ))}
            {/* A cup of tea, still steaming. */}
            <path d="M296 262 h54 v34 a27 27 0 0 1 -54 0 z" className="fill-ivory/85" />
            <path d="M350 272 c16 0 16 22 0 22" />
            <path d="M312 244 c-8 -12 8 -18 0 -30 M334 244 c-8 -12 8 -18 0 -30" strokeWidth="2" />
          </g>
        )}
        {art === 'siblings' && (
          <g fill="none" stroke="currentColor" className="text-ink/25" strokeWidth="3">
            <defs>
              <clipPath id="slide-shawl-a">
                <path d="M92 332 c0-44 26-70 58-70 s58 26 58 70z" />
              </clipPath>
              <clipPath id="slide-shawl-b">
                <path d="M198 342 c0-40 24-64 54-64 s54 24 54 64z" />
              </clipPath>
            </defs>
            <circle cx="150" cy="180" r="38" className="fill-ivory/70" />
            <circle cx="252" cy="196" r="34" className="fill-ivory/60" />
            <path d="M92 332 c0-44 26-70 58-70 s58 26 58 70z" className="fill-coral/25" />
            <g clipPath="url(#slide-shawl-a)" strokeWidth="0">
              <rect x="80" y="298" width="140" height="6" className="fill-lac/45" />
              <rect x="80" y="310" width="140" height="2.5" className="fill-lac/45" />
              <rect x="80" y="318" width="140" height="6" className="fill-lac/45" />
            </g>
            <path d="M198 342 c0-40 24-64 54-64 s54 24 54 64z" className="fill-coral/18" />
            <g clipPath="url(#slide-shawl-b)" strokeWidth="0">
              {Array.from({ length: 9 }, (_, i) => (
                <path key={i} d={`M${192 + i * 14} 318 l7 -7 l7 7 l-7 7 z`} className="fill-osak/30" />
              ))}
            </g>
            <rect x="146" y="370" width="108" height="72" rx="12" className="fill-ivory/80" />
            <path d="M166 392 h48 M166 408 h68 M166 424 h36" strokeWidth="2" />
          </g>
        )}
        {art === 'photograph' && (
          <g fill="none" stroke="currentColor" className="text-ink/25" strokeWidth="3">
            <defs>
              <clipPath id="slide-print">
                <rect x="104" y="164" width="192" height="152" rx="4" transform="rotate(-4 200 240)" />
              </clipPath>
            </defs>
            <rect
              x="90"
              y="150"
              width="220"
              height="180"
              rx="10"
              className="fill-ivory/80"
              transform="rotate(-4 200 240)"
            />
            <g clipPath="url(#slide-print)">
              <rect x="80" y="150" width="240" height="180" className="fill-mist/60" strokeWidth="0" />
              <circle cx="262" cy="196" r="14" className="fill-gold/35" strokeWidth="0" />
              {/* Tea hedgerows following the slope, under tall shade trees. */}
              <path d="M96 238 C 150 222 220 214 312 204 V340 H96 Z" className="fill-paddy/25" strokeWidth="0" />
              {[0, 1, 2, 3, 4].map((i) => (
                <path
                  key={i}
                  d={`M96 ${254 + i * 16} C 150 ${240 + i * 16} 220 ${232 + i * 16} 312 ${222 + i * 16}`}
                  className="text-paddy/55"
                  strokeWidth="7"
                  strokeLinecap="round"
                />
              ))}
              <path d="M150 238 V196 M232 226 V180" strokeWidth="2" />
              <ellipse cx="150" cy="192" rx="22" ry="8" className="fill-paddy/30" strokeWidth="0" />
              <ellipse cx="232" cy="176" rx="24" ry="8" className="fill-paddy/30" strokeWidth="0" />
            </g>
            <path d="M120 400 c30-24 60-24 90 0 M190 412 c30-24 60-24 90 0" />
          </g>
        )}
      </svg>
      <Siniar size={12} className="absolute inset-x-0 top-0" />
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
          <Eyebrow className="mb-3 flex items-center gap-2">
            <TwinStar size={7} className="text-lac" />
            Inside Smriti
          </Eyebrow>
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
              i === active ? 'w-10 bg-risa' : 'w-4 bg-ink/15 hover:bg-ink/25',
            )}
          />
        ))}
      </div>
    </section>
  )
}
