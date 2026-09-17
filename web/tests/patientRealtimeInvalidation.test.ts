import assert from 'node:assert/strict'
import test from 'node:test'

import {
  canSubscribeToPatient,
  flagInvalidationKeys,
  memoInvalidationKeys,
  patientUpdateInvalidationKeys,
} from '../src/hooks/patientRealtimeInvalidation.ts'

const patientId = 'aaaaaaaa-0000-0000-0000-000000000001'

test('subscriptions require both a valid patient ID and confirmed access', () => {
  assert.equal(canSubscribeToPatient(patientId, true), true)
  assert.equal(canSubscribeToPatient(patientId, false), false)
  assert.equal(canSubscribeToPatient(undefined, true), false)
  assert.equal(canSubscribeToPatient('not-a-patient-id', true), false)
})

test('patient updates invalidate overview, device, aggregate, and changed content data', () => {
  assert.deepEqual(patientUpdateInvalidationKeys(patientId, 3, 4), [
    ['overview'],
    ['patient', patientId],
    ['device-status', patientId],
    ['voicebot-status', patientId],
    ['daily_report', patientId],
    ['daily_domain', patientId],
    ['people', patientId],
    ['medications', patientId],
    ['routine_items', patientId],
    ['escalation_config', patientId],
  ])
})

test('patient heartbeats do not refetch unchanged content tables', () => {
  assert.deepEqual(patientUpdateInvalidationKeys(patientId, 4, 4), [
    ['overview'],
    ['patient', patientId],
    ['device-status', patientId],
    ['voicebot-status', patientId],
    ['daily_report', patientId],
    ['daily_domain', patientId],
  ])
})

test('missing cached version is treated as content possibly changed', () => {
  assert.equal(patientUpdateInvalidationKeys(patientId, undefined, 4).length, 10)
})

test('flag changes refresh alert caches and all affected counts', () => {
  assert.deepEqual(flagInvalidationKeys(patientId), [
    ['flags', patientId],
    ['patient', patientId],
    ['overview'],
  ])
})

test('memo changes refresh the inbox, dashboard badge, and overview counts', () => {
  assert.deepEqual(memoInvalidationKeys(patientId), [
    ['memos', patientId],
    ['overview'],
  ])
})
