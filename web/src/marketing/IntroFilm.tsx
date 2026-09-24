import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

/**
 * The film layer behind the hero.
 *
 * Two clips, cut from the reference footage in `fontend references/` and
 * encoded once into `public/media/`:
 *
 *   intro    ~13 s - clouds over the Khasi hills, a walk across the paddy
 *            fields, a waterfall, a festival dance in Arunachal, and last an
 *            elder in her doorway pulling a red shawl round her shoulders. It
 *            ends on the person Smriti is for.
 *   ambient  ~10 s - the clouds alone, played forward then back so the loop
 *            point cannot be seen. What the hero rests on after the intro, and
 *            on every later visit.
 *
 * Phones in portrait get their own 9:16 cut of the intro rather than a
 * letterboxed or centre-cropped landscape one.
 *
 * Neither clip is precached by the service worker (workbox only takes
 * js/css/html by default), and the ambient loop pauses whenever the hero is
 * off screen.
 */

export type FilmPhase = 'reveal' | 'film' | 'ambient' | 'still'

const MEDIA = {
  landscape: '/media/ner-intro-1080.mp4',
  portrait: '/media/ner-intro-720-portrait.mp4',
  ambient: '/media/ner-ambient.mp4',
  poster: '/media/ner-poster.webp',
}

export function IntroFilm({
  phase,
  onProgress,
  onEnded,
}: {
  phase: FilmPhase
  /** Current time of the intro clip, in seconds. */
  onProgress?: (seconds: number) => void
  onEnded?: () => void
}) {
  const filmRef = useRef<HTMLVideoElement>(null)
  const ambientRef = useRef<HTMLVideoElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  // Chosen once: rotating a phone mid-film should not restart it.
  const [portrait] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-aspect-ratio: 4/5)').matches,
  )

  // The film is loaded behind the curtain during the logo reveal and starts
  // the moment the curtain begins to lift.
  useEffect(() => {
    const film = filmRef.current
    if (!film) return
    if (phase === 'film') {
      film.play().catch(() => onEnded?.())
    }
  }, [phase, onEnded])

  // Pause the ambient loop while the hero is scrolled away.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage || phase !== 'ambient') return
    const observer = new IntersectionObserver(([entry]) => {
      const video = ambientRef.current
      if (!video) return
      if (entry.isIntersecting) video.play().catch(() => {})
      else video.pause()
    })
    observer.observe(stage)
    return () => observer.disconnect()
  }, [phase])

  return (
    <div ref={stageRef} className="absolute inset-0 overflow-hidden bg-terracotta-deep">
      {phase === 'still' && (
        <img src={MEDIA.poster} alt="" className="absolute inset-0 size-full object-cover" />
      )}

      <AnimatePresence>
        {(phase === 'reveal' || phase === 'film') && (
          <motion.video
            key="film"
            ref={filmRef}
            className="absolute inset-0 size-full object-cover"
            src={portrait ? MEDIA.portrait : MEDIA.landscape}
            poster={MEDIA.poster}
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
            onTimeUpdate={(e) => onProgress?.(e.currentTarget.currentTime)}
            onEnded={onEnded}
            onError={onEnded}
            exit={{ opacity: 0, transition: { duration: 1.2, ease: 'easeInOut' } }}
          />
        )}
      </AnimatePresence>

      {phase === 'ambient' && (
        <motion.video
          key="ambient"
          ref={ambientRef}
          className="absolute inset-0 size-full object-cover"
          src={MEDIA.ambient}
          poster={MEDIA.poster}
          muted
          playsInline
          autoPlay
          loop
          preload="auto"
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        />
      )}
    </div>
  )
}

export default IntroFilm
