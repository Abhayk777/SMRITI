import assert from 'node:assert/strict'
import test from 'node:test'

import {
  voicebotStatusCopy,
  voicebotStatusPollInterval,
} from '../src/features/voicebot/voicebotStatusPresentation.ts'

test('Voice Assistant copy remains honest when sync is unavailable or fails', () => {
  assert.equal(voicebotStatusCopy('ready').title, 'Ready on the tablet')
  assert.match(voicebotStatusCopy('error').body, /still saved normally/i)
  assert.match(voicebotStatusCopy('unavailable').body, /reminders.*continue/i)
  assert.match(voicebotStatusCopy('disabled').body, /Turn this on/i)
})

test('Voice Assistant polling stops at terminal states', () => {
  assert.equal(voicebotStatusPollInterval('pending'), 10_000)
  assert.equal(voicebotStatusPollInterval('syncing'), 10_000)
  assert.equal(voicebotStatusPollInterval('ready'), false)
  assert.equal(voicebotStatusPollInterval('error'), false)
  assert.equal(voicebotStatusPollInterval('disabled'), false)
})
