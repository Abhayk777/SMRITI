import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Plus, Search, WifiOff } from 'lucide-react'
import { useState } from 'react'
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
import { initialsOf, timeAgo } from '@/lib/utils.ts'
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

function patientBadge(row: PatientOverview): { text: string; tone: 'alert' | 'gold' | 'warm' } | null {
  if (row.active_flags > 0) {
    return {
      text: `${row.active_flags} active flag${row.active_flags === 1 ? '' : 's'} to review`,
      tone: 'alert',
    }
  }
  if (row.device_status === 'stale') return { text: 'Not synced', tone: 'warm' }
  if (row.device_status === 'never') return { text: 'Not paired', tone: 'warm' }
  if (row.device_status === 'offline') return { text: 'Offline', tone: 'alert' }
  if (row.unread_memos > 0) {
    return {
      text: `${row.unread_memos} new message${row.unread_memos === 1 ? '' : 's'}`,
      tone: 'gold',
    }
  }
  return null
}

function deviceStatusCopy(row: PatientOverview): string {
  if (row.device_status === 'never') return 'No session today'
  if (row.device_status === 'stale' || row.device_status === 'offline') {
    return `Last seen ${timeAgo(row.device_last_seen_at)}`
  }
  return `Tablet synced ${timeAgo(row.device_last_seen_at)}`
}

function PatientRow({ row }: { row: PatientOverview }) {
  const badge = patientBadge(row)

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
          {badge && (
            <Badge tone={badge.tone} size="sm">
              {badge.text}
            </Badge>
          )}
        </div>

        <p
          className={`mt-0.5 flex items-center gap-1.5 text-[12.5px] ${
            row.device_status === 'ok' ? 'text-muted' : 'text-alert'
          }`}
        >
          {row.device_status !== 'ok' && <WifiOff className="size-3.5" />}
          {deviceStatusCopy(row)}
        </p>
      </div>

      <div className="hidden min-w-[92px] flex-none flex-col items-end gap-1 text-right sm:flex">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
          Session
        </span>
        <span className="text-[12.5px] font-semibold text-body">
          {row.played_today ? `${Math.round(row.session_minutes)} min today` : 'Not yet today'}
        </span>
      </div>

      <ChevronRight className="size-5 flex-none text-muted" />
    </Link>
  )
}

function greetingFor(minutes: number): string {
  if (minutes >= 300 && minutes < 720) return 'Good morning'
  if (minutes >= 720 && minutes < 1020) return 'Good afternoon'
  return 'Good evening'
}

function CareOverview({
  patientCount,
  needAttentionCount,
  offlineDeviceCount,
  newMessageCount,
  playedTodayCount,
}: {
  patientCount: number
  needAttentionCount: number
  offlineDeviceCount: number
  newMessageCount: number
  playedTodayCount: number
}) {
  return (
    <div className="rounded-panel border border-[#E7D9C2] bg-ivory p-6">
      <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-bark">
        Care overview
      </p>
      <h2 className="mt-2.5 font-heading text-[24px] leading-tight">A quick read</h2>
      <p className="mt-3 max-w-[25ch] text-[15px] leading-relaxed text-body">
        Everyone in your care is sorted by what needs you first.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <div className="min-h-[82px] rounded-[18px] bg-sand/75 p-3">
          <p className="text-[13px] text-body">Offline devices</p>
          <p className="numeral mt-1.5 text-[26px] leading-none text-terracotta">
            {offlineDeviceCount}
          </p>
        </div>
        <div className="min-h-[82px] rounded-[18px] bg-clay/75 p-3">
          <p className="text-[13px] text-body">New messages</p>
          <p className="numeral mt-1.5 text-[26px] leading-none text-terracotta">
            {newMessageCount}
          </p>
        </div>
        <div className="min-h-[82px] rounded-[18px] bg-ivory p-3 ring-1 ring-ink/[0.04]">
          <p className="text-[13px] text-body">Needs attention</p>
          <p className="numeral mt-1.5 text-[26px] leading-none text-terracotta">
            {needAttentionCount}
            <span className="ml-1 text-[16px] text-muted">/{patientCount}</span>
          </p>
        </div>
        <div className="min-h-[82px] rounded-[18px] bg-sage-soft p-3">
          <p className="text-[13px] text-body">Played today</p>
          <p className="numeral mt-1.5 text-[26px] leading-none text-sage">{playedTodayCount}</p>
        </div>
      </div>

      <Button asChild variant="outline" size="md" className="mt-5 w-full border-ink/20 bg-transparent">
        <Link to="/patients/new">
          <Plus className="size-4" />
          Add another patient
        </Link>
      </Button>
    </div>
  )
}

export default function Overview() {
  const { session, signOut } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  // No single patient is in scope here, so the sky follows your own clock.
  const minutes = usePatientMinutes(undefined)
  useCaregiverFeedRealtime()

  const { data, isPending, error, refetch } = useQuery({
    queryKey: qk.overview(),
    queryFn: () => db.unwrap(db.patientsOverview()),
  })

  const rows = [...(data ?? [])].sort((a, b) => urgency(b) - urgency(a))

  // With one patient this page is not the right screen — §4 decides, once.
  if (!isPending && !error && rows.length < 2) {
    return <Navigate to="/" replace />
  }

  const needAttention = rows.filter((row) => urgency(row) >= 20)
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase()
  const matchesSearch = (row: PatientOverview) =>
    !normalizedSearch || row.display_name.toLocaleLowerCase().includes(normalizedSearch)
  const filteredRows = rows.filter(matchesSearch)
  const caregiverName =
    typeof session?.user.user_metadata?.full_name === 'string'
      ? session.user.user_metadata.full_name
      : typeof session?.user.user_metadata?.name === 'string'
        ? session.user.user_metadata.name
        : ''
  const firstName = caregiverName.trim().split(/\s+/)[0] || 'Sunanda'
  const greeting = greetingFor(minutes)

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

      <main className="mx-auto grid max-w-[1180px] gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_350px] lg:items-start">
        <section aria-labelledby="family-heading" className="min-w-0">
          <p className="mb-2 flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.14em] text-bark">
            <TwinStar size={7} className="text-lac" />
            Everyone you look after
          </p>
          <h1 id="family-heading" className="text-[clamp(26px,3.4vw,34px)]">
            {greeting}{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="mt-2 max-w-[52ch] text-[15.5px] leading-relaxed text-body">
            {isPending
              ? 'Loading…'
              : needAttention.length > 0
                ? `${needAttention.length} of ${rows.length} could use a look. They are at the top.`
                : 'Everyone is on track today. Nothing needs you right now.'}
          </p>

          <label className="relative mt-6 block">
            <span className="sr-only">Search family members by name</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-terracotta"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name"
              className="h-11 w-full rounded-card border-[1.5px] border-[#E7D9C2] bg-ivory pl-11 pr-4 text-[15px] text-ink placeholder:text-muted/75 focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/15"
            />
          </label>

          <div className="stagger mt-4 space-y-3">
            {isPending && [0, 1].map((i) => <SkeletonRow key={i} />)}
            {error && <ErrorState error={error} onRetry={() => void refetch()} />}
            {!isPending &&
              !error &&
              filteredRows.length === 0 && (
              <div className="rounded-card border-[1.5px] border-[#E7D9C2] bg-ivory px-5 py-6 text-center text-sm text-body">
                No family members match “{searchQuery}”.
              </div>
            )}
            {filteredRows.map((row) => (
              <PatientRow key={row.patient_id} row={row} />
            ))}
          </div>

        </section>

        <aside className="lg:sticky lg:top-6 lg:pt-[125px]">
          <CareOverview
            patientCount={rows.length}
            needAttentionCount={needAttention.length}
            offlineDeviceCount={rows.filter((row) => row.device_status === 'offline').length}
            newMessageCount={rows.reduce((total, row) => total + row.unread_memos, 0)}
            playedTodayCount={rows.filter((row) => row.played_today).length}
          />
        </aside>
      </main>
    </div>
  )
}
