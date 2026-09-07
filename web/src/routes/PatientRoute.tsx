import { useQuery } from '@tanstack/react-query'
import { Navigate, Outlet, useParams } from 'react-router-dom'

import { useAuth } from '@/auth/useAuth.ts'
import { AppShell } from '@/components/layout/AppShell.tsx'
import { EmptyState, ErrorState } from '@/components/ui/feedback.tsx'
import { Button } from '@/components/ui/button.tsx'
import { usePatientRealtime } from '@/hooks/usePatientRealtime.ts'
import * as db from '@/lib/db.ts'
import { qk } from '@/lib/queryKeys.ts'
import { PatientProvider } from '@/patients/PatientContext.tsx'
import { FullPageLoading } from './FullPageLoading.tsx'

/** A cheap shape check before any query runs, so a typo'd URL fails clearly. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Wraps every `/p/:patientId/*` route (frontend.md §2).
 *
 * On mount it verifies the caller really is a member of this patient and loads
 * their role into context. RLS already refuses the underlying rows, so this
 * check adds no security — what it adds is an *answer*. Without it, an
 * unauthorised URL produces a screen of empty lists and zeroed figures, which
 * reads as "your mother did nothing today" rather than "this isn't your
 * mother". In a medication app those two are not close enough to leave to
 * chance.
 *
 * The role it provides is what every screen reads to decide what is editable:
 * a `family_viewer` sees the same information and none of the write
 * affordances (§15 rule 8).
 */
export function PatientRoute() {
  const { patientId } = useParams<{ patientId: string }>()
  const { userId } = useAuth()

  const valid = Boolean(patientId && UUID.test(patientId))

  const roleQuery = useQuery({
    queryKey: qk.role(patientId ?? ''),
    queryFn: () => db.unwrap(db.myRoleFor(patientId as string, userId as string)),
    enabled: valid && Boolean(userId),
    retry: 0,
  })

  const patientQuery = useQuery({
    queryKey: qk.patient(patientId ?? ''),
    queryFn: () => db.unwrap(db.patientRow(patientId as string)),
    enabled: valid && Boolean(roleQuery.data),
  })

  // Mounted here rather than per-screen: one channel for the whole patient
  // section, but only after membership is confirmed. It is torn down when the
  // caregiver changes patients or leaves the patient route.
  usePatientRealtime(
    patientId,
    valid && roleQuery.isSuccess && !roleQuery.isFetching && Boolean(roleQuery.data),
  )

  if (!valid) return <Navigate to="/" replace />
  if (roleQuery.isPending) return <FullPageLoading label="Checking your access" />

  if (roleQuery.error) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg items-center px-6">
        <ErrorState error={roleQuery.error} className="w-full" />
      </div>
    )
  }

  if (!roleQuery.data) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-xl items-center px-6">
        <EmptyState
          className="w-full"
          title="You don't have access to this profile"
          description="Whoever set it up needs to invite you from Manage → Access, using the phone number you signed in with. If you have more than one number, check you used the right one."
          action={
            <Button asChild variant="outline">
              <a href="/">Back to your patients</a>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <PatientProvider
      patientId={patientId as string}
      patient={patientQuery.data ?? null}
      role={roleQuery.data}
    >
      <AppShell>
        <Outlet />
      </AppShell>
    </PatientProvider>
  )
}
