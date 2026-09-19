import { useCallback, useContext } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { PatientContext, type PatientContextValue } from './PatientContext.tsx'

/**
 * The patient currently in scope, and what the caller may do with them.
 *
 * Only usable inside a `/p/:patientId/*` route, because that is the only place
 * a patient is unambiguously in scope. If you find yourself wanting this
 * outside one, the screen you are building is not patient-scoped and should
 * not be reading patient data.
 */
export function usePatientAccess(): PatientContextValue {
  const value = useContext(PatientContext)
  if (!value) throw new Error('usePatientAccess must be used inside a patient route')
  return value
}

/**
 * The dev-mode mismatch assertion from frontend.md §12 rule 4.
 *
 * Every screen that reads a row carrying its own `patient_id` runs this against
 * the id in the URL. In production it does nothing; in development it throws
 * loudly, because a row from the wrong patient rendering on a medication screen
 * is a safety failure and the only acceptable way to find out about it is a
 * hard stop during development, never a caregiver noticing.
 */
export function assertPatientMatch(
  expected: string,
  data: { patient_id?: string | null } | null | undefined,
  where: string,
): void {
  if (!import.meta.env.DEV) return
  if (!data?.patient_id) return
  if (data.patient_id !== expected) {
    throw new Error(
      `Patient mismatch in ${where}: got ${data.patient_id}, expected ${expected}`,
    )
  }
}

/** The array flavour, for list queries. */
export function assertPatientMatchAll(
  expected: string,
  rows: Array<{ patient_id?: string | null }> | null | undefined,
  where: string,
): void {
  if (!import.meta.env.DEV || !rows) return
  const stray = rows.find((row) => row.patient_id && row.patient_id !== expected)
  if (stray) {
    throw new Error(
      `Patient mismatch in ${where}: got ${stray.patient_id}, expected ${expected}`,
    )
  }
}

/**
 * Switching the patient in scope (frontend.md §12 rule 2).
 *
 * Navigating alone is not enough. The cross-patient caches are removed
 * explicitly first, so a slow network cannot leave the previous patient's
 * dashboard figures on screen under the new patient's name for the second or
 * two before the new query resolves. That second is exactly when a caregiver
 * reads a number and acts on it.
 */
export function useSwitchPatient() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useCallback(
    (nextId: string) => {
      for (const prefix of [
        'patient',
        'people',
        'medications',
        'routine_items',
        'escalation_config',
        'flags',
        'memos',
        'members',
        'device-status',
        'voicebot-status',
        'daily_report',
        'daily_domain',
        'signed-url',
        'role',
      ]) {
        queryClient.removeQueries({ queryKey: [prefix] })
      }
      navigate(`/p/${nextId}/dashboard`)
    },
    [queryClient, navigate],
  )
}
