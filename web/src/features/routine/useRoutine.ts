import { useQuery } from '@tanstack/react-query'

import { useContentMutation } from '@/hooks/useContentMutation.ts'
import * as db from '@/lib/db.ts'
import { qk } from '@/lib/queryKeys.ts'
import { assertPatientMatchAll } from '@/patients/usePatientAccess.ts'
import type { RoutineItem } from '@smriti/shared'

export function useRoutine(patientId: string) {
  return useQuery({
    queryKey: qk.routineItems(patientId),
    queryFn: async () => {
      const rows = await db.unwrap(db.routineFor(patientId))
      assertPatientMatchAll(patientId, rows, 'useRoutine')
      return rows
    },
  })
}

/** Parameterised for the same reason as `usePeopleMutation` - forms submit drafts. */
export function useRoutineMutation<T extends object = RoutineItem>(patientId: string) {
  return useContentMutation<T>('routine_items', patientId)
}

/**
 * The icons the tablet knows how to draw.
 *
 * `icon_asset` is a free-text column server-side, but the tablet only ships a
 * fixed set of illustrations - anything else renders as a blank card in the
 * patient's home. So the caregiver picks from a list rather than typing, and
 * this is that list. It has to stay in step with the Flutter app's asset
 * bundle; `app-spec.md` is its owner, and this array is the web-side mirror.
 */
export const ROUTINE_ICONS = [
  { value: 'tea', key: 'routine.icons.tea' }, { value: 'meal', key: 'routine.icons.meal' },
  { value: 'walk', key: 'routine.icons.walk' }, { value: 'phone', key: 'routine.icons.phone' },
  { value: 'bath', key: 'routine.icons.bath' }, { value: 'prayer', key: 'routine.icons.prayer' },
  { value: 'rest', key: 'routine.icons.rest' }, { value: 'exercise', key: 'routine.icons.exercise' },
  { value: 'visitor', key: 'routine.icons.visitor' }, { value: 'sleep', key: 'routine.icons.sleep' },
] as const
