import { useMutation, useQueryClient } from '@tanstack/react-query'

import * as db from '@/lib/db.ts'
import type { ContentTable } from '@/lib/db.ts'
import { qk } from '@/lib/queryKeys.ts'
import { normaliseDaysOfWeek } from '@/lib/utils.ts'

/**
 * The choke point for every write to a content table (frontend.md §5, §15
 * rule 3). No screen writes to `people`, `medications`, `routine_items` or
 * `escalation_config` any other way.
 *
 * Two reasons it has to be one function rather than a convention:
 *
 *   1. A server-side trigger bumps `patients.content_version` on any write to
 *      these tables, which is what tells the tablet to pull fresh content. The
 *      client has to invalidate the device-status query alongside the table's
 *      own, or the Device page will keep reporting a version the tablet has
 *      already moved past. Getting that pair right in fifteen call sites is
 *      how it ends up wrong in one.
 *   2. When a write fails — and against RLS it will, the first time a
 *      `family_viewer` finds an editable-looking control — there is one place
 *      to make that failure comprehensible.
 */
export function useContentMutation<T extends object>(
  table: ContentTable,
  patientId: string,
) {
  const queryClient = useQueryClient()

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: [table, patientId] })
    // content_version changed, so what the tablet is running just changed too.
    void queryClient.invalidateQueries({ queryKey: qk.deviceStatus(patientId) })
    void queryClient.invalidateQueries({ queryKey: qk.patient(patientId) })
  }

  const save = useMutation({
    mutationFn: async (payload: Partial<T> & { id?: string }) => {
      const { id, ...rest } = payload as Partial<T> & { id?: string }
      if (table === 'medications' && 'days_of_week' in rest) {
        ;(rest as Record<string, unknown>).days_of_week = normaliseDaysOfWeek(
          String((rest as Record<string, unknown>).days_of_week ?? ''),
        )
      }
      // `escalation_config` is one row per patient keyed by `patient_id`, so an
      // update targets the patient; everything else targets its own `id`.
      if (table === 'escalation_config') {
        return db.unwrap(
          db.contentUpdate(table, patientId, rest as Record<string, unknown>),
        )
      }
      return id
        ? db.unwrap(db.contentUpdate(table, id, rest as Record<string, unknown>))
        : db.unwrap(db.contentInsert(table, patientId, rest as Record<string, unknown>))
    },
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: string) =>
      db.unwrap(
        db.contentDelete(table as Exclude<ContentTable, 'escalation_config'>, id),
      ),
    onSuccess: invalidate,
  })

  return { save, remove }
}
