import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Navigate } from 'react-router-dom'

import { LogoReveal } from '@/components/brand/LogoReveal.tsx'
import { GamosaBand } from '@/components/ner/GamosaBand.tsx'
import { ErrorState } from '@/components/ui/feedback.tsx'
import * as db from '@/lib/db.ts'
import { qk } from '@/lib/queryKeys.ts'
import { FullPageLoading } from './FullPageLoading.tsx'
import { useTranslation } from '@/i18n/index.ts'

/**
 * A one-shot flag set by the sign-in screen. The splash plays after a fresh
 * sign-in and not on every page load, so it stays a welcome rather than a toll.
 */
export const FRESH_SIGNIN_KEY = 'smriti:fresh-signin'

/**
 * The adaptive landing (frontend.md §4).
 *
 *   0 patients   → /patients/new
 *   1 patient    → /p/{id}/dashboard, skipping the overview entirely
 *   2+ patients  → /patients
 *
 * This is real logic, not a design preference: most caregivers look after one
 * parent, and this is why they never encounter multi-patient UI at all. It
 * exists **once**, here, at the root route. Any second copy of this decision
 * elsewhere in the app is a bug waiting to disagree with this one.
 */
export function RootRedirect() {
  const { t } = useTranslation()
  const [splashDone, setSplashDone] = useState(
    () => sessionStorage.getItem(FRESH_SIGNIN_KEY) !== '1',
  )
  const [lifting, setLifting] = useState(false)

  useEffect(() => {
    if (splashDone) sessionStorage.removeItem(FRESH_SIGNIN_KEY)
  }, [splashDone])

  const { data, isPending, error, refetch } = useQuery({
    queryKey: qk.overview(),
    queryFn: () => db.unwrap(db.patientsOverview()),
  })

  // The splash covers the overview round-trip rather than adding to it, so the
  // welcome costs nothing on a fast connection. It leaves the way the
  // marketing intro does — the terracotta lifts like a cloth, its gamosa hem
  // passing up the screen — so the two read as the same brand moment.
  if (!splashDone) {
    return (
      <div className="relative min-h-dvh overflow-hidden bg-ivory">
        <AnimatePresence onExitComplete={() => setSplashDone(true)}>
          {!lifting && (
            <motion.div
              key="splash"
              className="absolute inset-0 flex items-center justify-center bg-terracotta"
              exit={{ y: '-100%', transition: { duration: 0.5, ease: [0.7, 0, 0.18, 1] } }}
            >
              <LogoReveal size={104} speed={3.4} onComplete={() => setLifting(true)} />
              <div className="absolute inset-x-0 top-full">
                <GamosaBand size={16} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  if (isPending) return <FullPageLoading label={t('common.findingFamily')} />

  if (error) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg items-center px-6">
        <ErrorState error={error} onRetry={() => void refetch()} className="w-full" />
      </div>
    )
  }

  const patients = data ?? []
  if (patients.length === 0) return <Navigate to="/patients/new" replace />
  if (patients.length === 1) {
    return <Navigate to={`/p/${patients[0].patient_id}/dashboard`} replace />
  }
  return <Navigate to="/patients" replace />
}
