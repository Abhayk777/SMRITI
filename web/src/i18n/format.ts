import { type SupportedLocale, DEFAULT_LOCALE } from './config.ts'
import { parseDaysOfWeek } from '@/lib/utils.ts'

/**
 * Formats a Date or ISO date string using Intl.DateTimeFormat according to the active locale.
 */
export function formatDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
  locale: SupportedLocale = DEFAULT_LOCALE,
): string {
  const instant = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  if (Number.isNaN(instant.getTime())) return ''
  try {
    return new Intl.DateTimeFormat(locale, options).format(instant)
  } catch {
    return instant.toLocaleDateString(DEFAULT_LOCALE, options)
  }
}

/**
 * Formats an instant in the patient's explicit timezone. Call this for patient
 * events and reports: a caregiver's browser timezone must never change the
 * meaning of a patient's day.
 */
export function formatPatientDate(
  date: Date | string | number,
  timezone: string,
  options?: Intl.DateTimeFormatOptions,
  locale: SupportedLocale = DEFAULT_LOCALE,
): string {
  return formatDate(date, { ...options, timeZone: timezone }, locale)
}

/**
 * Formats integer minutes since midnight (0–1439, modulo 1440) as a clock time string.
 */
export function formatTimeMinutes(
  minutes: number,
  locale: SupportedLocale = DEFAULT_LOCALE,
): string {
  const m = ((minutes % 1440) + 1440) % 1440
  const hours = Math.floor(m / 60)
  const mins = m % 60
  const sample = new Date(Date.UTC(2026, 0, 1, hours, mins))

  try {
    return new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'UTC',
    }).format(sample)
  } catch {
    const period = hours >= 12 ? 'pm' : 'am'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${String(mins).padStart(2, '0')} ${period}`
  }
}

/**
 * Formats a number with Intl.NumberFormat according to the active locale.
 */
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
  locale: SupportedLocale = DEFAULT_LOCALE,
): string {
  try {
    return new Intl.NumberFormat(locale, options).format(value)
  } catch {
    return String(value)
  }
}

/**
 * Formats a list of items using Intl.ListFormat according to the active locale.
 */
export function formatList(
  items: string[],
  options?: Intl.ListFormatOptions,
  locale: SupportedLocale = DEFAULT_LOCALE,
): string {
  try {
    return new Intl.ListFormat(locale, options).format(items)
  } catch {
    return items.join(', ')
  }
}

/**
 * Presents the canonical Monday=1 … Sunday=7 schedule as locale-aware weekday
 * names. This is display-only: callers continue to store and submit the same
 * comma-separated ISO weekday contract used by the database and tablet.
 */
export function formatDaysOfWeek(
  value: string | null | undefined,
  locale: SupportedLocale = DEFAULT_LOCALE,
): string {
  const days = parseDaysOfWeek(value)
  if (days.length === 0) return '—'

  try {
    // 2024-01-01 was a Monday, matching the product's ISO weekday convention.
    const formatter = new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      timeZone: 'UTC',
    })
    const labels = days.map((day) =>
      formatter.format(new Date(Date.UTC(2024, 0, day))),
    )
    return formatList(labels, { style: 'short', type: 'conjunction' }, locale)
  } catch {
    return days.join(', ')
  }
}

/** Formats elapsed time without baking English plural rules into components. */
export function formatDuration(
  milliseconds: number,
  locale: SupportedLocale = DEFAULT_LOCALE,
): string {
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1_000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  try {
    const minute = new Intl.NumberFormat(locale, {
      style: 'unit',
      unit: 'minute',
      unitDisplay: 'short',
    })
    const second = new Intl.NumberFormat(locale, {
      style: 'unit',
      unit: 'second',
      unitDisplay: 'short',
    })
    if (minutes === 0) return second.format(seconds)
    if (seconds === 0) return minute.format(minutes)
    return `${minute.format(minutes)} ${second.format(seconds)}`
  } catch {
    return minutes === 0 ? `${seconds} s` : seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} s`
  }
}

/** Formats a relative instant using the selected UI locale. */
export function formatRelativeTime(
  date: Date | string | number | null | undefined,
  locale: SupportedLocale = DEFAULT_LOCALE,
  now = Date.now(),
): string {
  if (date == null) return '—'
  const timestamp = date instanceof Date ? date.getTime() : new Date(date).getTime()
  if (Number.isNaN(timestamp)) return '—'

  const seconds = Math.round((timestamp - now) / 1_000)
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
    ['second', 1],
  ]
  const [unit, divisor] = units.find(([, secondsPerUnit]) => Math.abs(seconds) >= secondsPerUnit) ?? units.at(-1)!
  const value = Math.round(seconds / divisor)
  try {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(value, unit)
  } catch {
    return new Intl.RelativeTimeFormat(DEFAULT_LOCALE, { numeric: 'auto' }).format(value, unit)
  }
}
