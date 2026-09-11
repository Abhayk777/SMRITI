import { useCallback, useState } from 'react'

import { FeatureSlider } from './FeatureSlider.tsx'
import { Hero } from './Hero.tsx'
import { MarketingNav } from './MarketingNav.tsx'
import {
  FinalCta,
  HowItWorks,
  MarketingFooter,
  ProductPreview,
  StatBand,
  Stories,
} from './Sections.tsx'

/**
 * The public marketing site.
 *
 * Section order follows the reference; the colour does not. The reference ran
 * terracotta → cream → cream → sand → cream → ivory → terracotta, which is one
 * hue doing almost all the work and is why the page read as monotonous below
 * the fold. Here each section takes a distinct ground — terracotta, cream,
 * ivory, **sage**, sand, ivory, terracotta, cream — and the gold/coral gradient
 * stays reserved for the two moments that actually matter, the primary buttons.
 *
 * The joins between sections are textile edges drawn from the eight Northeast
 * states (see `components/ner/`), and scrolling is smoothed by Lenis, mounted
 * once for the whole app in `main.tsx` — which is also what makes the `#how`
 * and `#features` anchor links glide.
 */
export default function MarketingPage() {
  // The nav waits for the intro's curtain to lift, so the logo is never on
  // screen twice. On a return visit the hero skips the intro and this flips
  // on its first effect.
  const [navShown, setNavShown] = useState(false)
  const showNav = useCallback(() => setNavShown(true), [])

  return (
    <div className="overflow-x-clip bg-terracotta">
      <MarketingNav shown={navShown} />
      <Hero onCurtainLift={showNav} />
      <HowItWorks />
      <FeatureSlider />
      <StatBand />
      <ProductPreview />
      <Stories />
      <FinalCta />
      <MarketingFooter />
    </div>
  )
}
