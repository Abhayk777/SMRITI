import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { CATALOGUES, interpolate, resolveKey } from './catalogues.ts'
import {
  DEFAULT_LOCALE,
  detectInitialLocale,
  isSupportedLocale,
  persistLocale,
  type SupportedLocale,
} from './config.ts'
import { LocaleContext, type LocaleContextValue } from './context.ts'
import {
  formatDate,
  formatDaysOfWeek,
  formatDuration,
  formatList,
  formatNumber,
  formatPatientDate,
  formatRelativeTime,
  formatTimeMinutes,
} from './format.ts'
import type { TranslationKey } from './keys.ts'

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(detectInitialLocale)

  const setLocale = (next: SupportedLocale) => {
    if (!isSupportedLocale(next)) return
    setLocaleState(next)
    persistLocale(next)
  }

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = 'ltr'
  }, [locale])

  const value = useMemo<LocaleContextValue>(() => {
    const activeCatalogue = CATALOGUES[locale] ?? CATALOGUES[DEFAULT_LOCALE]
    const fallbackCatalogue = CATALOGUES[DEFAULT_LOCALE]

    const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
      const template =
        resolveKey(activeCatalogue, key) ?? resolveKey(fallbackCatalogue, key) ?? key
      return interpolate(template, params)
    }

    return {
      locale,
      dir: 'ltr',
      setLocale,
      t,
      formatDate: (date, options) => formatDate(date, options, locale),
      formatPatientDate: (date, timezone, options) => formatPatientDate(date, timezone, options, locale),
      formatTimeMinutes: (minutes) => formatTimeMinutes(minutes, locale),
      formatNumber: (val, options) => formatNumber(val, options, locale),
      formatList: (items, options) => formatList(items, options, locale),
      formatDaysOfWeek: (value) => formatDaysOfWeek(value, locale),
      formatDuration: (milliseconds) => formatDuration(milliseconds, locale),
      formatRelativeTime: (date) => formatRelativeTime(date, locale),
    }
  }, [locale])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}
