import { type SupportedLocale } from './config.ts'
import type { TranslationCatalogue } from './keys.ts'
import { as } from './locales/as.ts'
import { en } from './locales/en.ts'
import { hi } from './locales/hi.ts'
import { kha } from './locales/kha.ts'
import { mni } from './locales/mni.ts'

export const CATALOGUES: Record<SupportedLocale, TranslationCatalogue> = {
  en,
  hi,
  as,
  mni,
  kha,
}

export function resolveKey(catalogue: TranslationCatalogue, key: string): string | undefined {
  const parts = key.split('.')
  let current: unknown = catalogue
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }
  return typeof current === 'string' ? current : undefined
}

export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, paramKey) => {
    return paramKey in params ? String(params[paramKey]) : match
  })
}
