/**
 * Caregiver UI Localisation Configuration.
 *
 * Distinct from patient/tablet language (`patients.lang_code`): this configuration
 * manages the caregiver's web interface language only.
 *
 * Supported UI locales:
 * - en: English (Source / Fallback)
 * - hi: Hindi (Devanagari)
 * - as: Assamese (Assamese/Bengali script)
 * - mni: Meiteilon / Manipuri (Meitei Mayek script)
 * - kha: Khasi (Latin)
 *
 * Bodo (`brx`) remains intentionally unavailable until its generated static
 * catalogue is complete. Keeping it out of this list prevents a selectable
 * locale from silently falling back to English.
 */

export const SUPPORTED_LOCALES = [
  { code: 'en', label: 'English', nativeLabel: 'English', dir: 'ltr' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', dir: 'ltr' },
  { code: 'as', label: 'Assamese', nativeLabel: 'অসমীয়া', dir: 'ltr' },
  { code: 'mni', label: 'Meiteilon', nativeLabel: 'ꯃꯤꯇꯩꯂꯣꯟ', dir: 'ltr' },
  { code: 'kha', label: 'Khasi', nativeLabel: 'Ka Ktien Khasi', dir: 'ltr' },
] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]['code']

export const DEFAULT_LOCALE: SupportedLocale = 'en'

export const LOCALE_STORAGE_KEY = 'smriti.caregiver.locale'

export function isSupportedLocale(candidate: unknown): candidate is SupportedLocale {
  return typeof candidate === 'string' && SUPPORTED_LOCALES.some((loc) => loc.code === candidate)
}

export function persistLocale(next: SupportedLocale): boolean {
  if (typeof window === 'undefined' || !isSupportedLocale(next)) return false
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next)
    return true
  } catch {
    return false
  }
}

export function detectInitialLocale(): SupportedLocale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE

  try {
    const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    if (saved && isSupportedLocale(saved)) {
      return saved
    }
  } catch {
    // Private browsing or restricted storage fallback
  }

  const browserLangs = navigator.languages ?? [navigator.language]
  for (const lang of browserLangs) {
    if (!lang) continue
    const base = lang.split('-')[0].toLowerCase()
    if (isSupportedLocale(base)) {
      return base
    }
  }

  return DEFAULT_LOCALE
}
