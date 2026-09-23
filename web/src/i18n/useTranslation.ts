import { useContext } from 'react'

import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './config.ts'
import { CATALOGUES, resolveKey, interpolate } from './catalogues.ts'
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
import { LocaleContext, type LocaleContextValue } from './context.ts'
import type { TranslationKey } from './keys.ts'

export interface UseTranslationResult extends LocaleContextValue {
  supportedLocales: typeof SUPPORTED_LOCALES
}

export function useTranslation(): UseTranslationResult {
  const context = useContext(LocaleContext)
  if (!context) {
    return {
      locale: DEFAULT_LOCALE,
      dir: 'ltr',
      setLocale: () => { },
      t: (key: TranslationKey, params?: Record<string, string | number>) => {
        const val = resolveKey(CATALOGUES[DEFAULT_LOCALE], key) ?? key
        return params ? interpolate(val, params) : val
      },
      formatDate: (date, options) => formatDate(date, options, DEFAULT_LOCALE),
      formatPatientDate: (date, timezone, options) => formatPatientDate(date, timezone, options, DEFAULT_LOCALE),
      formatTimeMinutes: (minutes) => formatTimeMinutes(minutes, DEFAULT_LOCALE),
      formatNumber: (value, options) => formatNumber(value, options, DEFAULT_LOCALE),
      formatList: (items, options) => formatList(items, options, DEFAULT_LOCALE),
      formatDaysOfWeek: (value) => formatDaysOfWeek(value, DEFAULT_LOCALE),
      formatDuration: (milliseconds) => formatDuration(milliseconds, DEFAULT_LOCALE),
      formatRelativeTime: (date) => formatRelativeTime(date, DEFAULT_LOCALE),
      supportedLocales: SUPPORTED_LOCALES,
    }
  }

  return {
    ...context,
    supportedLocales: SUPPORTED_LOCALES,
  }
}
