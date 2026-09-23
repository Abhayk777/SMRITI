import { createContext } from 'react'
import type { SupportedLocale } from './config.ts'
import type { TranslationKey } from './keys.ts'

export interface LocaleContextValue {
  locale: SupportedLocale
  dir: 'ltr' | 'rtl'
  setLocale: (locale: SupportedLocale) => void
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string
  formatPatientDate: (
    date: Date | string | number,
    timezone: string,
    options?: Intl.DateTimeFormatOptions,
  ) => string
  formatTimeMinutes: (minutes: number) => string
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
  formatList: (items: string[], options?: Intl.ListFormatOptions) => string
  formatDaysOfWeek: (value: string | null | undefined) => string
  formatDuration: (milliseconds: number) => string
  formatRelativeTime: (date: Date | string | number | null | undefined) => string
}

export const LocaleContext = createContext<LocaleContextValue | null>(null)
