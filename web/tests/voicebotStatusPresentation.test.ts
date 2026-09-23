import assert from 'node:assert/strict'
import test from 'node:test'

import {
  voicebotStatusKeys,
  voicebotStatusPollInterval,
} from '../src/features/voicebot/voicebotStatusPresentation.ts'
import { en } from '../src/i18n/locales/en.ts'

test('Voice Assistant copy remains honest when sync is unavailable or fails', () => {
  assert.equal(voicebotStatusKeys('ready').title, 'voicebot.status.ready.title')
  assert.match(en.voicebot.status.error.body, /still saved normally/i)
  assert.match(en.voicebot.status.unavailable.body, /reminders.*continue/i)
  assert.match(en.voicebot.status.off.body, /Turn this on/i)
})

test('Voice Assistant polling stops at terminal states', () => {
  assert.equal(voicebotStatusPollInterval('pending'), 10_000)
  assert.equal(voicebotStatusPollInterval('syncing'), 10_000)
  assert.equal(voicebotStatusPollInterval('ready'), false)
  assert.equal(voicebotStatusPollInterval('error'), false)
  assert.equal(voicebotStatusPollInterval('disabled'), false)
})
