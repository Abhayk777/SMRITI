import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

import { Logomark } from '@/components/brand/Logomark.tsx'
import { Wordmark } from '@/components/brand/Wordmark.tsx'
import { LocaleSelector } from '@/components/i18n/LocaleSelector.tsx'
import { GamosaBand } from '@/components/ner/GamosaBand.tsx'
import { cn } from '@/lib/utils.ts'
import { useScrollSolid } from './useScrollSolid.ts'
import { useTranslation } from '@/i18n/index.ts'

/**
 * The sticky nav.
 *
 * It starts transparent over the hero and turns into a solid cream bar once you
 * have scrolled past it, hemmed with a fine gamosa rule instead of a drop
 * shadow. Solid, not frosted: the bar is either there or it is not.
 *
 * `shown` holds it back until the intro's curtain has lifted — the logo in the
 * hero rises into this one, and the two should never be on screen together.
 */
export function MarketingNav({ shown = true }: { shown?: boolean }) {
  const { t } = useTranslation()
  const solid = useScrollSolid()
  const links = [{ href: '#how', label: t('marketing.how') }, { href: '#features', label: t('marketing.features') }, { href: '#stories', label: t('marketing.stories') }]

  return (
    <motion.nav
      initial={false}
      animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y: -12 }}
      transition={{ duration: 0.6, delay: shown ? 0.35 : 0, ease: [0.22, 0.8, 0.18, 1] }}
      style={{ pointerEvents: shown ? 'auto' : 'none' }}
      className={cn(
        'fixed inset-x-0 top-0 z-50 flex items-center gap-4 px-4 py-3.5 sm:gap-6 sm:px-8',
        'transition-[background-color,color] duration-350',
        solid ? 'bg-cream text-ink' : 'bg-transparent text-ivory',
      )}
    >
      <a href="#top" className="mr-auto flex items-center gap-2.5 text-current">
        <Logomark size={26} decorative />
        <Wordmark size={19} />
      </a>

      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className="group relative hidden text-[14.5px] font-medium opacity-85 transition-opacity hover:opacity-100 sm:inline"
        >
          {link.label}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 -bottom-1 h-[2px] origin-left scale-x-0 rounded-full bg-current transition-transform duration-300 group-hover:scale-x-100"
          />
        </a>
      ))}

      <LocaleSelector className="hidden text-current sm:inline-flex" />

      <Link
        to="/auth"
        className={cn(
          'rounded-pill px-5 py-2.5 text-[14px] font-semibold transition-colors duration-350',
          solid
            ? 'bg-terracotta text-ivory hover:bg-terracotta-deep'
            : 'border border-ivory/40 bg-terracotta-deep/45 text-ivory hover:bg-terracotta-deep/75',
        )}
      >
        {t('marketing.getStarted')}
      </Link>

      <div
        className={cn(
          'absolute inset-x-0 top-full transition-opacity duration-350',
          solid ? 'opacity-100' : 'opacity-0',
        )}
      >
        <GamosaBand variant="rule" size={4} />
      </div>
    </motion.nav>
  )
}
