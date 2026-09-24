import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as db from '@/lib/db.ts'
import { qk } from '@/lib/queryKeys.ts'
import { assertPatientMatchAll } from '@/patients/usePatientAccess.ts'

export function useMemos(patientId: string) {
  return useQuery({
    queryKey: qk.memos(patientId),
    queryFn: async () => {
      const rows = await db.unwrap(db.memosFor(patientId))
      assertPatientMatchAll(patientId, rows, 'useMemos')
      return rows
    },
  })
}

/**
 * Marks a memo read. Fired on play, not on render - a memo scrolling past in a
 * list has not been heard, and marking it read there would quietly hide the
 * one thing a parent recorded that day.
 */
export function useMarkMemoRead(patientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (memoId: string) => db.unwrap(db.markMemoRead(memoId)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.memos(patientId) })
      void queryClient.invalidateQueries({ queryKey: qk.overview() })
    },
  })
}

export const MEMO_TAG_COPY: Record<string, string> = {
  memory: 'messages.tags.memory', check_in: 'messages.tags.checkIn',
  message: 'messages.tags.message', prompt: 'messages.tags.prompt',
}
