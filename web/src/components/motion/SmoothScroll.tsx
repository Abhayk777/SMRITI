import { useEffect, useRef, type ReactNode } from 'react'
import { cancelFrame, frame, useReducedMotion } from 'framer-motion'
import { ReactLenis, type LenisRef } from 'lenis/react'

/**
 * Smooth scrolling for the whole app, via Lenis.
 *
 * Lenis does not run its own requestAnimationFrame loop here (`autoRaf:
 * false`); it is stepped from Framer Motion's frame loop instead. Two
 * independent rAF loops - one moving the page, one reading scroll position for
 * `useScroll` - drift by a frame against each other and scroll-linked motion
 * visibly shimmers. One loop, one clock.
 *
 * Deliberate limits:
 *   - Not mounted at all under reduced motion: native scrolling is the
 *     accessible default and Lenis adds nothing for someone who asked for less.
 *   - `syncTouch` stays off, so phones and tablets keep the platform's own
 *     touch scrolling. Many of the people on the other end of this app are
 *     older, and a touch scroll that feels "wrong" is worse than a plain one.
 *   - `allowNestedScroll` lets dialogs, dropdowns and inner lists scroll
 *     themselves without every one of them needing `data-lenis-prevent`.
 *   - When Radix locks the page for a modal (it sets `data-scroll-locked` on
 *     `<body>`), Lenis is stopped too, so the wheel cannot move the page
 *     underneath an open dialog.
 */
/** The slice of a data router this needs: something to tell it the path changed. */
type RouterLike = {
  subscribe: (listener: (state: { location: { pathname: string } }) => void) => () => void
}

export function SmoothScroll({ children, router }: { children: ReactNode; router?: RouterLike }) {
  const reduceMotion = useReducedMotion()
  const lenisRef = useRef<LenisRef>(null)

  // A new page starts at its top. Without this, following "Get started" from
  // the bottom of the marketing page would land halfway down the sign-in
  // screen. Hash links on the same page keep their position.
  useEffect(() => {
    if (!router) return
    let last = window.location.pathname
    return router.subscribe(({ location }) => {
      if (location.pathname === last) return
      last = location.pathname
      const lenis = lenisRef.current?.lenis
      if (lenis) lenis.scrollTo(0, { immediate: true, force: true })
      else window.scrollTo(0, 0)
    })
  }, [router])

  useEffect(() => {
    if (reduceMotion) return

    const update = ({ timestamp }: { timestamp: number }) => {
      lenisRef.current?.lenis?.raf(timestamp)
    }
    frame.update(update, true)

    const body = document.body
    const syncLock = () => {
      const lenis = lenisRef.current?.lenis
      if (!lenis) return
      if (body.hasAttribute('data-scroll-locked')) lenis.stop()
      else lenis.start()
    }
    const observer = new MutationObserver(syncLock)
    observer.observe(body, { attributes: true, attributeFilter: ['data-scroll-locked'] })

    return () => {
      cancelFrame(update)
      observer.disconnect()
    }
  }, [reduceMotion])

  if (reduceMotion) return <>{children}</>

  return (
    <ReactLenis
      root
      ref={lenisRef}
      options={{
        autoRaf: false,
        lerp: 0.1,
        wheelMultiplier: 1,
        syncTouch: false,
        allowNestedScroll: true,
        // Anchor links (`#how`, `#features`) glide, and stop short of the
        // fixed marketing nav instead of tucking the heading under it.
        anchors: { offset: -72 },
      }}
    >
      {children}
    </ReactLenis>
  )
}

export default SmoothScroll
