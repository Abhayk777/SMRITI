import assert from 'node:assert/strict'
import test from 'node:test'

import { CATALOGUES, interpolate, resolveKey } from '../src/i18n/catalogues.ts'
import { detectInitialLocale, isSupportedLocale, LOCALE_STORAGE_KEY, persistLocale } from '../src/i18n/config.ts'
import { minutesOfDayInZone } from '../src/lib/utils.ts'

test('caregiver locale switching persists and overrides browser preferences', () => {
  const previousWindow = globalThis.window
  const previousNavigator = globalThis.navigator
  const storage = new Map<string, string>()
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) } } })
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { languages: ['hi-IN'], language: 'hi-IN' } })
  assert.equal(detectInitialLocale(), 'hi')
  assert.equal(persistLocale('as'), true)
  assert.equal(storage.get(LOCALE_STORAGE_KEY), 'as')
  assert.equal(detectInitialLocale(), 'as')
  assert.equal(resolveKey(CATALOGUES.en, 'nav.today'), 'Today')
  assert.equal(resolveKey(CATALOGUES.hi, 'nav.today'), 'आज')
  storage.set(LOCALE_STORAGE_KEY, 'brx')
  assert.equal(isSupportedLocale('brx'), false)
  assert.equal(detectInitialLocale(), 'hi')
  Object.defineProperty(globalThis, 'window', { configurable: true, value: previousWindow })
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: previousNavigator })
})

test('patient time meaning remains in the patient timezone while presentation is locale-aware', () => {
  const instant = '2026-01-01T00:30:00.000Z'
  assert.equal(minutesOfDayInZone('America/Los_Angeles', new Date(instant)), 990)
  assert.notEqual(
    new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'America/Los_Angeles' }).format(new Date(instant)),
    new Intl.DateTimeFormat('hi', { dateStyle: 'long', timeZone: 'America/Los_Angeles' }).format(new Date(instant)),
  )
})

test('catalogues retain role states and never translate interpolated care data', () => {
  assert.notEqual(resolveKey(CATALOGUES.hi, 'access.caregiver.label'), 'Caregiver')
  assert.notEqual(resolveKey(CATALOGUES.hi, 'access.family.label'), 'Family')
  assert.notEqual(resolveKey(CATALOGUES.hi, 'access.healthWorker.label'), 'Health worker')
  const template = resolveKey(CATALOGUES.as, 'dashboard.newFrom')!
  assert.match(interpolate(template, { name: 'Sunanda' }), /Sunanda/)
  const medicine = 'Amlodipine 5 mg'
  assert.match(interpolate(resolveKey(CATALOGUES.mni, 'common.editName')!, { name: medicine }), /Amlodipine 5 mg/)
})

const flattenStrings = (
  value: unknown,
  prefix = '',
  result: Record<string, string> = {},
): Record<string, string> => {
  if (typeof value === 'string') {
    result[prefix] = value
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => flattenStrings(item, `${prefix}.${index}`, result))
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => {
      flattenStrings(item, prefix ? `${prefix}.${key}` : key, result)
    })
  }
  return result
}

const placeholders = (value: string) =>
  [...value.matchAll(/\{\w+\}/g)].map(([placeholder]) => placeholder).sort()

test('available generated catalogues are complete and preserve interpolation contracts', () => {
  const english = flattenStrings(CATALOGUES.en)
  for (const [locale, catalogue] of Object.entries(CATALOGUES)) {
    const translated = flattenStrings(catalogue)
    assert.deepEqual(Object.keys(translated), Object.keys(english), `${locale} catalogue shape`)
    for (const [key, source] of Object.entries(english)) {
      assert.notEqual(translated[key], '', `${locale}.${key} must not be empty`)
      assert.deepEqual(placeholders(translated[key]), placeholders(source), `${locale}.${key} placeholders`)
    }
  }
})

test('generated catalogues have no accidental English fallback values', () => {
  const english = flattenStrings(CATALOGUES.en)
  const allowedUnchanged: Record<string, Set<string>> = {
    hi: new Set(),
    as: new Set(),
    mni: new Set(['trends.points', 'engagement.minutes']),
    kha: new Set([
      'nav.tablet',
      'people.form.namePlaceholder',
      'alerts.minutesAfter',
      'setup.basics.namePlaceholder',
      'setup.basics.contactPlaceholder',
      'trends.points',
      'engagement.minutes',
      'marketing.download',
    ]),
  }
  for (const locale of ['hi', 'as', 'mni', 'kha'] as const) {
    const translated = flattenStrings(CATALOGUES[locale])
    const unchanged = Object.keys(english).filter((key) => translated[key] === english[key])
    assert.deepEqual(unchanged, [...allowedUnchanged[locale]], `${locale} English fallbacks`)
  }
  assert.match(resolveKey(CATALOGUES.mni, 'nav.today')!, /[\uABC0-\uABFF]/u)
})
