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
export const FLAG_COPY: Record<FlagType, { title: 'flags.decline.title' | 'flags.engagementDrop.title' | 'flags.adherenceDrop.title' | 'flags.deviceOffline.title' | 'flags.patternMismatch.title'; body: 'flags.decline.body' | 'flags.engagementDrop.body' | 'flags.adherenceDrop.body' | 'flags.deviceOffline.body' | 'flags.patternMismatch.body' }> = {
  decline: { title: 'flags.decline.title', body: 'flags.decline.body' },
  engagement_drop: { title: 'flags.engagementDrop.title', body: 'flags.engagementDrop.body' },
  adherence_drop: { title: 'flags.adherenceDrop.title', body: 'flags.adherenceDrop.body' },
  device_offline: { title: 'flags.deviceOffline.title', body: 'flags.deviceOffline.body' },
  pattern_mismatch: { title: 'flags.patternMismatch.title', body: 'flags.patternMismatch.body' },
}

export const SEVERITY_COPY: Record<FlagSeverity, { label: 'flags.info' | 'flags.moderate' | 'flags.high'; tone: 'neutral' | 'gold' | 'alert' }> = {
  info: { label: 'flags.info', tone: 'neutral' }, moderate: { label: 'flags.moderate', tone: 'gold' }, high: { label: 'flags.high', tone: 'alert' },
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
