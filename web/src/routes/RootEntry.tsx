import { lazy, Suspense } from 'react'

import { useAuth } from '@/auth/useAuth.ts'
import { FullPageLoading } from './FullPageLoading.tsx'
import { RootRedirect } from './RootRedirect.tsx'

const Marketing = lazy(() => import('@/marketing/MarketingPage.tsx'))

/**
 * What `/` is.
 *
 * frontend.md §2 defines `/` as the adaptive patient-count redirect; the
 * marketing site also has to live at the root, because that is the URL people
 * are given. Both are true at once and the session decides which: signed out
 * you get the pitch, signed in you get taken to your patient. A signed-in
 * caregiver never has to walk past a marketing page to reach their mother's
 * medicines, and a visitor never sees a redirect loop.
 *
 * The §4 redirect logic itself is not duplicated here - it stays in exactly one
 * place, `RootRedirect`, which this delegates to.
 */
export function RootEntry() {
  const { session, loading } = useAuth()

  if (loading) return <FullPageLoading />
  if (!session) {
    return (
      <Suspense fallback={<FullPageLoading />}>
        <Marketing />
      </Suspense>
    )
  }
  return <RootRedirect />
}
