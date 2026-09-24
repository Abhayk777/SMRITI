import { useEffect, useState } from 'react'

/**
 * True once the page has scrolled past `threshold`.
 *
 * The reference landing page polled `window.scrollY` on a `requestAnimationFrame`
 * loop that never stopped - a workaround for its preview host, where scroll
 * events did not fire. In a real app that is a frame of work every frame,
 * forever, to answer a question that changes twice per visit. A passive scroll
 * listener does the same job and costs nothing when nobody is scrolling.
 */
export function useScrollSolid(threshold = 70): boolean {
  const [solid, setSolid] = useState(
    () => typeof window !== 'undefined' && window.scrollY > threshold,
  )

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > threshold)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])

  return solid
}
