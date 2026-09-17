import type { VoicebotIntegrationStatus } from '@smriti/shared'

export function voicebotStatusCopy(status: VoicebotIntegrationStatus) {
  switch (status) {
    case 'ready':
      return {
        title: 'Ready on the tablet',
        body: 'The voice assistant has the latest approved people, medicines and routines.',
      }
    case 'pending':
      return {
        title: 'Getting ready',
        body: 'Smriti is preparing the approved information for the tablet.',
      }
    case 'syncing':
      return {
        title: 'Updating the assistant',
        body: 'The latest approved information is being sent safely.',
      }
    case 'error':
      return {
        title: 'Needs another try',
        body: 'The tablet assistant could not update. Your care information is still saved normally.',
      }
    case 'unavailable':
      return {
        title: 'Temporarily unavailable',
        body: 'The voice assistant is unavailable. Tablet reminders and all other care features continue.',
      }
    default:
      return {
        title: 'Not turned on',
        body: 'Turn this on only when you want the connected tablet to use the voice assistant.',
      }
  }
}

/** Poll only while the asynchronous sync worker can change visible status. */
export function voicebotStatusPollInterval(status: VoicebotIntegrationStatus | undefined) {
  return status === 'pending' || status === 'syncing' ? 10_000 : false
}
