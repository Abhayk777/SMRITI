import { useQuery } from '@tanstack/react-query'

import { useContentMutation } from '@/hooks/useContentMutation.ts'
import * as db from '@/lib/db.ts'
import { qk } from '@/lib/queryKeys.ts'
import { assertPatientMatchAll } from '@/patients/usePatientAccess.ts'
import type { Person } from '@smriti/shared'

/**
 * The people on the tablet's home screen - the faces, voices and one-line
 * prompts the recognition games are built from.
 */
export function usePeople(patientId: string) {
  return useQuery({
    queryKey: qk.people(patientId),
    queryFn: async () => {
      const rows = await db.unwrap(db.peopleFor(patientId))
      assertPatientMatchAll(patientId, rows, 'usePeople')
      return rows
    },
  })
}

/**
 * The payload type is a parameter because forms submit *drafts*, not rows: a
 * draft carries `photo_path: string | null` while it is being filled in, and
 * omits server-owned columns like `created_at` entirely. Defaulting to `Person`
 * keeps the common case honest.
 */
export function usePeopleMutation<T extends object = Person>(patientId: string) {
  return useContentMutation<T>('people', patientId)
}
