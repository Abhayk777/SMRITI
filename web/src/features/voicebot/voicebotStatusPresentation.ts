import type { VoicebotIntegrationStatus } from '@smriti/shared'
import type { TranslationKey } from '@/i18n/keys.ts'

export function voicebotStatusKeys(status: VoicebotIntegrationStatus): {
  title: TranslationKey
  body: TranslationKey
} {
  const key = status === 'disabled' ? 'off' : status
  return {
    title: `voicebot.status.${key}.title` as TranslationKey,
    body: `voicebot.status.${key}.body` as TranslationKey,
  }
}

/** Poll only while the asynchronous sync worker can change visible status. */
export function voicebotStatusPollInterval(status: VoicebotIntegrationStatus | undefined) {
  return status === 'pending' || status === 'syncing' ? 10_000 : false
}
