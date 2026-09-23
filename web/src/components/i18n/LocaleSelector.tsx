import { cn } from '@/lib/utils.ts'
import { isSupportedLocale } from '@/i18n/config.ts'
import { useTranslation } from '@/i18n/index.ts'

/**
 * A compact, native control for choosing the caregiver's interface locale.
 * It intentionally uses a standard select: it is keyboard and screen-reader
 * accessible, works before sign-in, and only updates local browser state.
 */
export function LocaleSelector({ className }: { className?: string }) {
  const { locale, setLocale, supportedLocales, t } = useTranslation()

  return (
    <label className={cn('inline-flex items-center', className)}>
      <span className="sr-only">{t('account.language')}</span>
      <select
        aria-label={t('account.language')}
        value={locale}
        onChange={(event) => {
          const next = event.currentTarget.value
          if (isSupportedLocale(next)) setLocale(next)
        }}
        className="h-9 max-w-36 rounded-pill border border-current/20 bg-transparent px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-terracotta/50"
      >
        {supportedLocales.map((item) => (
          <option key={item.code} value={item.code}>
            {item.nativeLabel}
          </option>
        ))}
      </select>
    </label>
  )
}
