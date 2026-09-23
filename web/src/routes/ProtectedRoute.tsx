import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '@/auth/useAuth.ts'
import { FullPageLoading } from './FullPageLoading.tsx'
import { useTranslation } from '@/i18n/index.ts'

/**
 * No session → `/auth` (frontend.md §2).
 *
 * The attempted location is carried through in router state so a caregiver who
 * followed a link to a specific patient's medicines lands back there after
 * signing in, rather than on a generic dashboard having lost what they came
 * to do.
 */
export function ProtectedRoute() {
  const { t } = useTranslation()
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageLoading label={t('common.signingIn')} />
  if (!session) return <Navigate to="/auth" replace state={{ from: location }} />

  return <Outlet />
}
