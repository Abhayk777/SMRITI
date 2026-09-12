import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useContentMutation } from '@/hooks/useContentMutation.ts'
import * as db from '@/lib/db.ts'
import { qk } from '@/lib/queryKeys.ts'
import { normaliseDaysOfWeek } from '@/lib/utils.ts'
import { assertPatientMatchAll } from '@/patients/usePatientAccess.ts'
import type { Medication } from '@smriti/shared'
import type { MedicineDraft } from './MedicineForm.tsx'

export function useMedicines(patientId: string) {
  return useQuery({
    queryKey: qk.medications(patientId),
    queryFn: async () => {
      const rows = await db.unwrap(db.medicationsFor(patientId))
      assertPatientMatchAll(patientId, rows, 'useMedicines')
      return rows
    },
  })
}

/** Parameterised for the same reason as `usePeopleMutation` — forms submit drafts. */
export function useMedicineMutation<T extends object = Medication>(patientId: string) {
  return useContentMutation<T>('medications', patientId)
}

export function useMedicineBatchMutation(patientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (drafts: MedicineDraft[]) =>
      db.unwrap(
        db.medicationInsertMany(
          patientId,
          drafts.map((draft) => {
            const payload = { ...draft }
            delete payload.id
            return {
              ...payload,
              days_of_week: normaliseDaysOfWeek(draft.days_of_week),
              active: true,
            }
          }),
        ),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.medications(patientId) })
      void queryClient.invalidateQueries({ queryKey: qk.deviceStatus(patientId) })
      void queryClient.invalidateQueries({ queryKey: qk.patient(patientId) })
    },
  })
}

/**
 * The medicine window, as the database enforces it.
 *
 * `chosen_time_min` carries a DB check constraint keeping it inside
 * `[window_start_min, window_end_min]`. The UI's job is to make that constraint
 * unreachable rather than to discover it: a caregiver who submits an invalid
 * time and gets back a raw Postgres constraint message has been failed twice.
 *
 * These helpers are what the form uses to keep the chosen time inside the
 * window while the window itself is being dragged around.
 */
export function clampToWindow(chosen: number, start: number, end: number): number {
  if (end < start) return chosen // an overnight window; leave it to the caller
  return Math.min(Math.max(chosen, start), end)
}

/** True when a proposed row would satisfy the server's constraint. */
export function isWithinWindow(chosen: number, start: number, end: number): boolean {
  return chosen >= start && chosen <= end
}
