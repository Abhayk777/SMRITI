import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Siniar } from '@/components/ner/Siniar.tsx'
import { TwinStar } from '@/components/ner/TwinStar.tsx'
import { Eyebrow } from '@/components/ui/card.tsx'
import { cn } from '@/lib/utils.ts'
import { Reveal } from './Reveal.tsx'
import { useTranslation } from '@/i18n/index.ts'

type Slide = {
  index: string
  kicker: string
  title: string
  body: string
  /** Each slide owns an accent, so the rail is not four cards of one colour. */
  accent: 'gold' | 'sage' | 'coral' | 'bark'
  art: 'morning' | 'pills' | 'siblings' | 'photograph'
}

const SLIDE_STYLES: Array<Pick<Slide, 'index' | 'accent' | 'art'>> = [
  {
    index: '01',
    accent: 'gold',
    art: 'morning',
  },
  {
    index: '02',
    accent: 'sage',
    art: 'pills',
  },
  {
    index: '03',
    accent: 'coral',
    art: 'siblings',
  },
  {
    index: '04',
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

const PHOTO_BY_ART: Record<Slide['art'], { src: string; objectPosition: string }> = {
  morning: {
    src: '/media/pexels-sagargnawali-10713776%20(1).jpg',
    objectPosition: '50% 36%',
  },
  pills: {
    src: '/media/pexels-towfiqu-barbhuiya-3440682-8395812.jpg',
    objectPosition: '78% center',
  },
  siblings: {
    src: '/media/pexels-subhash-purohit-61823966-10088405.jpg',
    objectPosition: '50% center',
  },
  photograph: {
    src: '/media/pexels-sayan-bikram-1267966-39194411.jpg',
    objectPosition: '52% 34%',
  },
}

/** Real photography, framed consistently across the four feature cards. */
function SlideArt({ art, accent }: { art: Slide['art']; accent: Slide['accent'] }) {
  const a = ACCENT[accent]
  const photo = PHOTO_BY_ART[art]

  return (
    <div
      className={cn(
        'relative aspect-[4/5] overflow-hidden rounded-panel bg-gradient-to-br',
        a.ground,
      )}
    >
      <img
        src={photo.src}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="absolute inset-0 size-full object-cover saturate-[.82]"
        style={{ objectPosition: photo.objectPosition }}
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-ink/25 via-transparent to-ivory/[0.06]"
      />
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
  const { t } = useTranslation()
  const slideKeys = [
    ['marketing.slide1Kicker', 'marketing.slide1Title', 'marketing.slide1Body'],
    ['marketing.slide2Kicker', 'marketing.slide2Title', 'marketing.slide2Body'],
    ['marketing.slide3Kicker', 'marketing.slide3Title', 'marketing.slide3Body'],
    ['marketing.slide4Kicker', 'marketing.slide4Title', 'marketing.slide4Body'],
  ] as const
  const SLIDES: Slide[] = SLIDE_STYLES.map((slide, i) => ({ ...slide, kicker: t(slideKeys[i][0]), title: t(slideKeys[i][1]), body: t(slideKeys[i][2]) }))
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
            {t('marketing.featureEyebrow')}
          </Eyebrow>
          <h2 className="max-w-[24ch] text-[clamp(26px,3.4vw,40px)]">
            {t('marketing.featureTitle')}
          </h2>
        </Reveal>
        <Reveal delay={0.1} className="flex gap-2.5">
          <button
            type="button"
            onClick={() => scrollToSlide(Math.max(0, active - 1))}
            aria-label={t('marketing.previous')}
            className="grid size-11 place-items-center rounded-pill border border-ink/20 text-ink transition-colors hover:bg-ink/[0.05] disabled:opacity-35"
            disabled={active === 0}
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollToSlide(Math.min(SLIDES.length - 1, active + 1))}
            aria-label={t('marketing.next')}
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
            aria-label={t('common.selectName', { name: slide.kicker })}
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
