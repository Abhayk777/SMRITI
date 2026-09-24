import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'

import { FullPageLoading } from './FullPageLoading.tsx'
import { PatientRoute } from './PatientRoute.tsx'
import { ProtectedRoute } from './ProtectedRoute.tsx'
import { RootEntry } from './RootEntry.tsx'

/**
 * Every route in the app (frontend.md §2).
 *
 * The patient id lives in the URL on every patient-scoped route, without
 * exception (§15 rule 10). That is what gives a working back button,
 * bookmarkable pages, correct behaviour on refresh, and - because the id is
 * read from one place - it is the foundation the cross-patient guards in §12
 * are built on.
 *
 * The marketing site is a separate top-level route rather than a separate app:
 * one build, one design system, one deploy, and a "Get started" link that goes
 * straight into the real sign-in flow instead of a second copy of it.
 *
 * The marketing page and the setup wizard are code-split. Both are large and
 * neither is on the path a returning caregiver takes to the dashboard.
 */

const Marketing = lazy(() => import('@/marketing/MarketingPage.tsx'))
const SignIn = lazy(() => import('@/pages/auth/SignIn.tsx'))
const CreatePatient = lazy(() => import('@/pages/patients/CreatePatient.tsx'))
const Overview = lazy(() => import('@/pages/patients/Overview.tsx'))
const Dashboard = lazy(() => import('@/pages/dashboard/Dashboard.tsx'))
const Trends = lazy(() => import('@/pages/trends/Trends.tsx'))
const Report = lazy(() => import('@/pages/report/Report.tsx'))
const Engagement = lazy(() => import('@/pages/engagement/Engagement.tsx'))
const Messages = lazy(() => import('@/pages/messages/Messages.tsx'))
const People = lazy(() => import('@/pages/manage/People.tsx'))
const Medicines = lazy(() => import('@/pages/manage/Medicines.tsx'))
const Routine = lazy(() => import('@/pages/manage/Routine.tsx'))
const Alerts = lazy(() => import('@/pages/manage/Alerts.tsx'))
const Access = lazy(() => import('@/pages/manage/Access.tsx'))
const Device = lazy(() => import('@/pages/manage/Device.tsx'))
const CareGuide = lazy(() => import('@/pages/care-guide/CareGuide.tsx'))

function Deferred() {
  return (
    <Suspense fallback={<FullPageLoading />}>
      <Outlet />
    </Suspense>
  )
}

export const router = createBrowserRouter([
  {
    element: <Deferred />,
    children: [
      // ── Public ────────────────────────────────────────────────────────
      // `/` is the marketing site when signed out and the §4 patient-count
      // redirect when signed in. See `RootEntry`.
      { path: '/', element: <RootEntry /> },
      { path: '/welcome', element: <Marketing /> },
      { path: '/auth', element: <SignIn /> },

      // ── Authenticated ─────────────────────────────────────────────────
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/patients', element: <Overview /> },
          { path: '/patients/new', element: <CreatePatient /> },
          {
            path: '/p/:patientId',
            element: <PatientRoute />,
            children: [
              { index: true, element: <Navigate to="dashboard" replace /> },
              { path: 'dashboard', element: <Dashboard /> },
              { path: 'trends', element: <Trends /> },
              { path: 'report', element: <Report /> },
              { path: 'engagement', element: <Engagement /> },
              { path: 'messages', element: <Messages /> },
              { path: 'manage/people', element: <People /> },
              { path: 'manage/medicines', element: <Medicines /> },
              { path: 'manage/routine', element: <Routine /> },
              { path: 'manage/alerts', element: <Alerts /> },
              { path: 'manage/access', element: <Access /> },
              { path: 'manage/device', element: <Device /> },
              { path: 'care-guide', element: <CareGuide /> },
            ],
          },
        ],
      },

      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
