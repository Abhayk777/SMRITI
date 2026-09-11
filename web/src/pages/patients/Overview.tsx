import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Plus, WifiOff } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'

import { useAuth } from '@/auth/useAuth.ts'
import { Logomark } from '@/components/brand/Logomark.tsx'
import { AppBackdrop } from '@/components/layout/AppBackdrop.tsx'
import { usePatientMinutes } from '@/components/layout/sky.ts'
import { Wordmark } from '@/components/brand/Wordmark.tsx'
import { GamosaBand } from '@/components/ner/GamosaBand.tsx'
import { TwinStar } from '@/components/ner/TwinStar.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Avatar, AvatarFallback } from '@/components/ui/controls.tsx'
import { ErrorState } from '@/components/ui/feedback.tsx'
import { SkeletonRow } from '@/components/ui/skeleton.tsx'
import { useCaregiverFeedRealtime } from '@/hooks/usePatientRealtime.ts'
import * as db from '@/lib/db.ts'
import { qk } from '@/lib/queryKeys.ts'
import { DEVICE_HEALTH_COPY, initialsOf, timeAgo } from '@/lib/utils.ts'
import type { PatientOverview } from '@smriti/shared'

/**
 * The multi-patient landing (frontend.md §8).
 *
 * Only reachable with more than one patient — with exactly one, §4 sends the
 * caregiver straight past this screen to that patient's dashboard, and this
 * page redirects rather than showing a list of one.
 *
 * The ordering is the point of the page: **anything needing attention first**,
 * never alphabetical. Someone opening this screen is asking "does anyone need
 * me right now", and a list sorted by name makes them answer that themselves,
 * row by row, every time.
 */

/** Higher scores first. Mirrors what a caregiver would triage by hand. */
function urgency(row: PatientOverview): number {
  let score = 0
  if (row.active_flags > 0) score += 100 + row.active_flags * 10
  if (row.device_status === 'offline') score += 80
  if (row.device_status === 'stale') score += 40
  if (row.device_status === 'never') score += 30
  if (row.meds_scheduled > 0 && row.meds_confirmed < row.meds_scheduled) {
    score += 20 + (row.meds_scheduled - row.meds_confirmed) * 5
  }
  if (!row.played_today) score += 5
  score += row.unread_memos
  return score
}

function PatientRow({ row }: { row: PatientOverview }) {
  const missed = Math.max(0, row.meds_scheduled - row.meds_confirmed)

  return (
    <Link
      to={`/p/${row.patient_id}/dashboard`}
      className="stitched flex items-center gap-4 rounded-card border-[#E7D9C2] bg-ivory p-4 transition-[translate,border-color,box-shadow] [--knot-ground:var(--color-ivory)] hover:-translate-y-0.5 hover:border-terracotta/35 motion-reduce:hover:translate-y-0 sm:p-5"
    >
      <Avatar className="size-14">
        <AvatarFallback className="text-lg">{initialsOf(row.display_name)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-heading text-[18px] font-bold">{row.display_name}</p>
          {row.active_flags > 0 && (
            <Badge tone="alert" size="sm">
              {row.active_flags} to look at
            </Badge>
          )}
          {row.unread_memos > 0 && (
            <Badge tone="gold" size="sm">
              {row.unread_memos} new message{row.unread_memos === 1 ? '' : 's'}
            </Badge>
          )}
        </div>

        <p className="mt-1 text-[14px] leading-snug text-body">
          {row.played_today
            ? `Played today · ${Math.round(row.session_minutes)} min`
            : 'No session today'}
          {row.meds_scheduled > 0 && (
            <>
              {' · '}
              {missed === 0
                ? 'All medicines confirmed'
                : `${missed} of ${row.meds_scheduled} medicines not confirmed`}
            </>
          )}
        </p>

        <p
          className={`mt-0.5 flex items-center gap-1.5 text-[12.5px] ${
            row.device_status === 'ok' ? 'text-muted' : 'text-alert'
          }`}
        >
          {row.device_status !== 'ok' && <WifiOff className="size-3.5" />}
          {row.device_status === 'never'
            ? DEVICE_HEALTH_COPY.never.label
            : `Tablet synced ${timeAgo(row.device_last_seen_at)}`}
        </p>
      </div>

      <ChevronRight className="size-5 flex-none text-muted" />
    </Link>
  )
}

export default function Overview() {
  const { signOut } = useAuth()
  // No single patient is in scope here, so the sky follows your own clock.
  const minutes = usePatientMinutes(undefined)
  useCaregiverFeedRealtime()

  const { data, isPending, error, refetch } = useQuery({
    queryKey: qk.overview(),
    queryFn: () => db.unwrap(db.patientsOverview()),
  })

  // With one patient this page is not the right screen — §4 decides, once.
  if (!isPending && !error && (data?.length ?? 0) < 2) {
    return <Navigate to="/" replace />
  }

  const rows = [...(data ?? [])].sort((a, b) => urgency(b) - urgency(a))
  const needAttention = rows.filter((row) => urgency(row) >= 20)

  return (
    <div className="relative isolate min-h-dvh bg-ivory">
      <AppBackdrop minutes={minutes} />
      <header className="bg-ivory">
        <div className="mx-auto flex max-w-[880px] items-center gap-3 px-5 py-4 sm:px-8">
          <Logomark size={24} color="var(--color-terracotta)" decorative />
          <Wordmark size={18} />
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
        <GamosaBand variant="rule" size={4} />
      </header>

      <main className="mx-auto max-w-[880px] px-5 py-10 sm:px-8">
        <p className="mb-2 flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.14em] text-bark">
          <TwinStar size={7} className="text-lac" />
          Everyone you look after
        </p>
        <h1 className="text-[clamp(26px,3.4vw,34px)]">Your family</h1>
        <p className="mt-2 max-w-[52ch] text-[15.5px] leading-relaxed text-body">
          {isPending
            ? 'Loading…'
            : needAttention.length > 0
              ? `${needAttention.length} of ${rows.length} could use a look. They are at the top.`
              : 'Everyone is on track today. Nothing needs you right now.'}
        </p>

        <div className="stagger mt-7 space-y-3">
          {isPending && [0, 1].map((i) => <SkeletonRow key={i} />)}
          {error && <ErrorState error={error} onRetry={() => void refetch()} />}
          {rows.map((row) => (
            <PatientRow key={row.patient_id} row={row} />
          ))}
        </div>

        <Button asChild variant="outline" className="mt-6 w-full sm:w-auto">
          <Link to="/patients/new">
            <Plus className="size-4" />
            Add another patient
          </Link>
        </Button>
      </main>
    </div>
  )
}
