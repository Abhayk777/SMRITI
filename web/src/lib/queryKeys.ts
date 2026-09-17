/**
 * Query keys.
 *
 * frontend.md §12 rule 1: **every patient-scoped key includes the patient id.**
 * A bare `['medications']` key would let one patient's medicine list be served
 * from cache on another patient's screen — in a medication app that is a
 * safety failure, not a cosmetic bug. Building the keys here rather than
 * inline at each `useQuery` makes the rule mechanical instead of a thing to
 * remember, and gives `switchPatient` one place to look up what to evict.
 */
export const qk = {
  /** Not patient-scoped: the caller's own list of patients. */
  overview: () => ['overview'] as const,

  patient: (pid: string) => ['patient', pid] as const,
  role: (pid: string) => ['role', pid] as const,
  people: (pid: string) => ['people', pid] as const,
  medications: (pid: string) => ['medications', pid] as const,
  routineItems: (pid: string) => ['routine_items', pid] as const,
  escalationConfig: (pid: string) => ['escalation_config', pid] as const,
  flags: (pid: string) => ['flags', pid] as const,
  memos: (pid: string) => ['memos', pid] as const,
  members: (pid: string) => ['members', pid] as const,
  deviceStatus: (pid: string) => ['device-status', pid] as const,
  voicebotStatus: (pid: string) => ['voicebot-status', pid] as const,
  dailyReports: (pid: string) => ['daily_report', pid] as const,
  dailyReport: (pid: string, fromDate: string, toDateExclusive: string) =>
    ['daily_report', pid, fromDate, toDateExclusive] as const,
  dailyDomains: (pid: string) => ['daily_domain', pid] as const,
  dailyDomain: (pid: string, fromDate: string, toDateExclusive: string) =>
    ['daily_domain', pid, fromDate, toDateExclusive] as const,
  signedUrl: (pid: string, path: string) => ['signed-url', pid, path] as const,
} as const

/**
 * Content tables share their key prefix with the table name, so
 * `useContentMutation` can invalidate `[table, patientId]` without a lookup.
 */
export type ContentQueryKeyPrefix =
  | 'people'
  | 'medications'
  | 'routine_items'
  | 'escalation_config'
