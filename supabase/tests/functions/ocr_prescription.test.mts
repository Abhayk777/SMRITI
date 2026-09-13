import assert from 'node:assert/strict'
import test from 'node:test'

import {
  bestCatalogueMatch,
  normalizeFrequency,
  normalizeMedicineName,
} from '../../functions/ocr-prescription/catalog.ts'

test('normalizes harmless name formatting and dosage-form abbreviations', () => {
  assert.equal(normalizeMedicineName('  Augmentin® 625-Duo Tab. '), 'augmentin 625 duo tablet')
})

test('accepts a close spelling match while returning the catalogue name', () => {
  const result = bestCatalogueMatch('Augmntin 625 Duo', [
    'Augmentin 375 Duo Tablet',
    'Augmentin 625 Duo Tablet',
  ])
  assert.equal(result.recognized, true)
  assert.equal(result.name, 'Augmentin 625 Duo Tablet')
  assert.ok(result.confidence >= 0.85)
})

test('does not replace a strength with a different strength', () => {
  const result = bestCatalogueMatch('Azithral 500 Tablet', ['Azithral 250 Tablet'])
  assert.equal(result.recognized, false)
  assert.equal(result.name, 'Azithral 500 Tablet')
})

test('leaves an unrelated or weak name unrecognized', () => {
  const result = bestCatalogueMatch('Unreadable scribble', ['Augmentin 625 Duo Tablet'])
  assert.equal(result.recognized, false)
  assert.ok(result.confidence < 0.85)
})

test('normalizes prescription abbreviations deterministically', () => {
  assert.equal(normalizeFrequency('1 tab BD and SOS'), '1 tab twice daily and as needed')
  assert.equal(normalizeFrequency('HS'), 'at bedtime')
})
