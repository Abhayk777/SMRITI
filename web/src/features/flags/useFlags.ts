import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as db from '@/lib/db.ts'
import { qk } from '@/lib/queryKeys.ts'
import { assertPatientMatchAll } from '@/patients/usePatientAccess.ts'
import type { Flag, FlagSeverity, FlagType } from '@smriti/shared'

export function useFlags(patientId: string) {
  return useQuery({
    queryKey: qk.flags(patientId),
    queryFn: async () => {
      const rows = await db.unwrap(db.activeFlags(patientId))
      assertPatientMatchAll(patientId, rows, 'useFlags')
      return rows
    },
  })
}

export function useAcknowledgeFlag(patientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (flagId: string) => db.unwrap(db.acknowledgeFlag(flagId)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.flags(patientId) })
      void queryClient.invalidateQueries({ queryKey: qk.patient(patientId) })
      void queryClient.invalidateQueries({ queryKey: qk.overview() })
    },
  })
}

/**
 * How a flag is described to a caregiver.
 *
 * The database calls these `engagement_drop` and `adherence_drop`. A worried
 * adult child needs a sentence, not a column value — and, crucially, a sentence
 * that does not diagnose. Smriti detects a *change in a pattern*; it does not
 * know why, and saying otherwise to someone frightened about their parent would
 * be both wrong and cruel. Every line below describes what changed and points
 * at the evidence.
 */
export const FLAG_COPY: Record<FlagType, { title: string; body: string }> = {
  decline: {
    title: 'Scores have moved down over several weeks',
    body: 'The games have been getting harder for them than they were. This is worth mentioning at their next appointment — it is not a diagnosis, and lots of ordinary things cause it.',
  },
  engagement_drop: {
    title: 'They are playing less than they were',
    body: 'Fewer sessions, or shorter ones, compared with their own usual pattern. Sometimes that is a bad week; sometimes it is worth a phone call.',
  },
  adherence_drop: {
    title: 'More doses are being missed',
    body: 'Medicines are being confirmed less often than they were. Check whether the reminder time still suits their day.',
  },
  device_offline: {
    title: 'The tablet has stopped reporting in',
    body: 'Nothing has synced for a while. Usually it is the charger or the wifi. Until it reconnects, this screen cannot tell you anything new.',
  },
  pattern_mismatch: {
    title: 'Their days are running differently',
    body: 'The timing of their routine has shifted away from its usual shape.',
  },
}

export const SEVERITY_COPY: Record<
  FlagSeverity,
  { label: string; tone: 'neutral' | 'gold' | 'alert' }
> = {
  info: { label: 'Worth knowing', tone: 'neutral' },
  moderate: { label: 'Worth a look', tone: 'gold' },
  high: { label: 'Worth acting on', tone: 'alert' },
}

/** Attention first: a caregiver wants to know who needs them, not an ordered list. */
export function sortByUrgency(flags: Flag[]): Flag[] {
  const rank: Record<FlagSeverity, number> = { high: 0, moderate: 1, info: 2 }
  return [...flags].sort(
    (a, b) =>
      rank[a.severity] - rank[b.severity] ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}

/** `z_scores` is JSONB; render it only when it is the shape we expect. */
export function readZScores(value: Flag['z_scores']): Array<[string, number]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  return Object.entries(value).filter(
    (entry): entry is [string, number] => typeof entry[1] === 'number',
  )
}
