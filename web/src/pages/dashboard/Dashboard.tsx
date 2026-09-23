import { useEffect, useState, type CSSProperties } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  ChevronRight,
  Clock,
  MessageSquareHeart,
  Pill,
  WifiOff,
} from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Card, CardTitle } from '@/components/ui/card.tsx'
import { EmptyState, ErrorState, Notice } from '@/components/ui/feedback.tsx'
import { Skeleton, SkeletonStat } from '@/components/ui/skeleton.tsx'
import { FlagCard } from '@/features/flags/FlagCard.tsx'
import { useFlags, sortByUrgency } from '@/features/flags/useFlags.ts'
import { useMedicines } from '@/features/medicines/useMedicines.ts'
import { useMemos } from '@/features/memos/useMemos.ts'
import { rowForDay, useDailyReport } from '@/features/reports/useDailyReport.ts'
import { useRoutine } from '@/features/routine/useRoutine.ts'
import { useTranslation } from '@/i18n/index.ts'
import {
  deviceHealth,
  formatDayLong,
  isoWeekdayIndex,
  isDayOn,
  minutesOfDayInZone,
  todayInZone,
} from '@/lib/utils.ts'
import { usePatientAccess } from '@/patients/usePatientAccess.ts'

/**
 * Today (frontend.md §8).
 *
 * The one screen most caregivers will ever open. It answers three questions in
 * the order they are actually asked — is anything wrong, did today happen, and
 * what is still to come — and it does not answer any of them with a chart.
 *
 * Everything on it is honest about its own freshness: if the tablet has not
 * synced, that is said at the top, before any figure, because a page of
 * confident numbers drawn from three-day-old data is worse than no page.
 */

/**
 * Eases every number in a string up from zero — "3/4" counts to 3 and 4,
 * "12 min" to 12 — and leaves the words where they are. The final text is the
 * accessible name throughout, so a screen reader never hears the count.
 */
function CountUpText({ text }: { text: string }) {
  const reduceMotion = useReducedMotion()
  const [progress, setProgress] = useState(reduceMotion ? 1 : 0)

  useEffect(() => {
    if (reduceMotion) return
    let frame = 0
    const started = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / 700)
      setProgress(1 - Math.pow(1 - t, 3))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [text, reduceMotion])

  const shown =
    progress >= 1 ? text : text.replace(/\d+/g, (n) => String(Math.round(Number(n) * progress)))

  return (
    <span aria-label={text}>
      <span aria-hidden="true">{shown}</span>
    </span>
  )
}

/** The woven top edge takes the tile's tone, so the colour still means the same thing. */
const EDGE: Record<'plain' | 'sage' | 'warm' | 'alert', string> = {
  plain: 'var(--color-sand)',
  sage: 'var(--color-sage-bright)',
  warm: 'var(--color-terracotta)',
  alert: 'var(--color-alert)',
}

function StatTile({
  label,
  value,
  detail,
  tone = 'plain',
}: {
  label: string
  value: string
  detail?: string
  tone?: 'plain' | 'sage' | 'warm' | 'alert'
}) {
  return (
    <Card tone={tone} padding="md" className="relative overflow-hidden">
      <span
        aria-hidden="true"
        className="textile-edge absolute inset-x-0 top-0 h-1"
        style={{ '--edge': EDGE[tone] } as CSSProperties}
      />
      <p className="text-[12.5px] font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </p>
      <p className="numeral mt-2 text-[clamp(28px,3.4vw,36px)] leading-none">
        <CountUpText text={value} />
      </p>
      {detail && <p className="mt-2 text-[13.5px] leading-snug text-body">{detail}</p>}
    </Card>
  )
}

export default function Dashboard() {
  const { patientId, patient } = usePatientAccess()
  const { t, formatRelativeTime, formatTimeMinutes } = useTranslation()
  // Today where the patient is, not where the caregiver is.
  const today = todayInZone(patient?.timezone)

  const report = useDailyReport(patientId, 1, patient?.timezone)
  const flags = useFlags(patientId)
  const medicines = useMedicines(patientId)
  const routine = useRoutine(patientId)
  const memos = useMemos(patientId)

  const todayRow = rowForDay(report.data, today)
  const health = deviceHealth(patient?.device_last_seen_at)
  const activeFlags = sortByUrgency(flags.data ?? [])
  const unreadMemos = (memos.data ?? []).filter((memo) => !memo.read_at)

  // Monday-first index, to match `days_of_week` — and derived from the patient's date,
  // not the viewer's, for the same reason `today` is. A caregiver reading this
  // on Sunday evening in California is looking at the patient's Monday.
  const weekdayIndex = isoWeekdayIndex(today)
  const todaysMedicines = (medicines.data ?? []).filter((med) =>
    isDayOn(med.days_of_week, weekdayIndex),
  )

  const scheduled = todayRow?.scheduled ?? todaysMedicines.length
  const confirmed = todayRow?.confirmed ?? 0
  const patientNowMinutes = minutesOfDayInZone(patient?.timezone)

  return (
    <>
      <PageHeader
        eyebrow={formatDayLong(today)}
        title={patient ? t('dashboard.dayTitle', { name: patient.display_name.split(' ')[0] }) : t('dashboard.today')}
        description={t('dashboard.description')}
      />

      {health !== 'ok' && (
        <Notice tone="warn" className="mb-6">
          <strong>{t(`device.health.${health}.label` as const)}.</strong>{' '}
          {t(`device.health.${health}.detail` as const)}{' '}
          <Link to={`/p/${patientId}/manage/device`} className="font-semibold underline">
            {t('dashboard.checkTablet')}
          </Link>
        </Notice>
      )}

      {/* Flags come before anything else on the page. If something is wrong,
          a caregiver should not have to scroll past three tiles of statistics
          to find out. */}
      {activeFlags.length > 0 && (
        <section className="mb-8 space-y-3" aria-label={t('dashboard.notices')}>
          {activeFlags.map((flag) => (
            <FlagCard key={flag.id} flag={flag} patientId={patientId} />
          ))}
        </section>
      )}

      <section className="stagger grid gap-3 sm:grid-cols-3">
        {report.isPending ? (
          [0, 1, 2].map((i) => <SkeletonStat key={i} />)
        ) : (
          <>
            <StatTile
              label={t('report.medicines')}
              value={scheduled === 0 ? '—' : `${confirmed}/${scheduled}`}
              detail={
                scheduled === 0
                  ? t('dashboard.noMedsToday')
                  : confirmed >= scheduled
                    ? t('dashboard.allConfirmed')
                    : t('dashboard.unconfirmed', { count: scheduled - confirmed })
              }
              tone={
                scheduled === 0 ? 'plain' : confirmed >= scheduled ? 'sage' : 'warm'
              }
            />
            <StatTile
              label={t('dashboard.timeTogether')}
              value={
                todayRow?.played
                  ? t('engagement.minutes', { count: Math.round(todayRow.minutes_played ?? 0) })
                  : t('dashboard.noTime')
              }
              detail={
                todayRow?.played
                  ? t('dashboard.sessions', { count: todayRow.sessions ?? 1 })
                  : t('dashboard.noSession')
              }
              tone={todayRow?.played ? 'sage' : 'plain'}
            />
            <StatTile
              label={t('nav.messages')}
              value={String(unreadMemos.length)}
              detail={
                unreadMemos.length > 0
                  ? t('dashboard.messagesWaiting')
                  : t('dashboard.noMessages')
              }
              tone={unreadMemos.length > 0 ? 'warm' : 'plain'}
            />
          </>
        )}
      </section>

      {report.error && <ErrorState error={report.error} className="mt-6" />}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Today's medicines */}
        <Card padding="md">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Pill className="size-4.5 text-terracotta" />
              {t('dashboard.medicinesToday')}
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to={`/p/${patientId}/manage/medicines`}>
                {t('dashboard.manage')}
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            {medicines.isPending && [0, 1].map((i) => <Skeleton key={i} className="h-16" />)}
            {!medicines.isPending && todaysMedicines.length === 0 && (
              <EmptyState
                icon={<Pill className="size-5" />}
                title={t('dashboard.noMedicines')}
                description={t('dashboard.noMedicinesDescription')}
                action={
                  <Button asChild size="sm">
                    <Link to={`/p/${patientId}/manage/medicines`}>{t('dashboard.addMedicine')}</Link>
                  </Button>
                }
              />
            )}
            {todaysMedicines.map((med) => (
              <div
                key={med.id}
                className="relative flex items-center gap-3 overflow-hidden rounded-2xl bg-sand/60 py-3 pl-5 pr-4 transition-[transform,background-color] duration-200 hover:translate-x-1 hover:bg-sand motion-reduce:hover:translate-x-0"
              >
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-risa-v" />
                <span className="grid size-9 flex-none place-items-center rounded-full bg-ivory text-terracotta ring-1 ring-terracotta/15">
                  <Pill className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{med.name}</p>
                  <p className="truncate text-[13px] text-muted">{med.dose}</p>
                </div>
                <Badge tone="neutral" size="sm">
                  <Clock className="size-3" />
                  {formatTimeMinutes(med.chosen_time_min)}
                </Badge>
              </div>
            ))}
            {/* Per-dose outcomes come from `reminder_events`, which this app
                never queries directly (§6). `daily_report` gives the daily
                totals above; a per-medicine confirmed/missed line would need a
                new view server-side. */}
            {todaysMedicines.length > 0 && (
              <p className="pt-1 text-[12.5px] leading-snug text-muted">
                {t('dashboard.medicineNote')}
              </p>
            )}
          </div>
        </Card>

        {/* The rest of their day */}
        <Card padding="md">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-4.5 text-sage" />
              {t('dashboard.routineTitle')}
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to={`/p/${patientId}/manage/routine`}>
                {t('dashboard.manage')}
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            {routine.isPending && [0, 1].map((i) => <Skeleton key={i} className="h-14" />)}
            {!routine.isPending && (routine.data ?? []).length === 0 && (
              <EmptyState
                icon={<Clock className="size-5" />}
                title={t('dashboard.noRoutine')}
                description={t('dashboard.noRoutineDescription')}
                action={
                  <Button asChild size="sm">
                    <Link to={`/p/${patientId}/manage/routine`}>{t('dashboard.addRoutine')}</Link>
                  </Button>
                }
              />
            )}
            {(routine.data ?? []).map((item) => {
              const past = item.time_min <= patientNowMinutes
              return (
                <div
                  key={item.id}
                  className="relative flex items-center gap-3 overflow-hidden rounded-2xl bg-sage-soft/70 py-3 pl-5 pr-4 transition-[transform,background-color] duration-200 hover:translate-x-1 hover:bg-sage-soft motion-reduce:hover:translate-x-0"
                >
                  <span
                    aria-hidden="true"
                    className={`absolute inset-y-0 left-0 w-1.5 ${past ? 'bg-sage-bright' : 'bg-sage/25'}`}
                  />
                  <span
                    className={`grid size-8 flex-none place-items-center rounded-full ${
                      past ? 'bg-sage-bright' : 'border-2 border-dashed border-sage/40'
                    }`}
                  >
                    {past && <Check className="size-4 text-ivory" strokeWidth={3} />}
                  </span>
                  <p className="min-w-0 flex-1 truncate font-semibold">{item.label_key}</p>
                  <span className="numeral text-[13.5px] text-sage">
                    {formatTimeMinutes(item.time_min)}
                  </span>
                </div>
              )
            })}
            {(routine.data ?? []).length > 0 && (
              <p className="pt-1 text-[12.5px] leading-snug text-muted">
                {t('dashboard.routineNote')}
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Latest memo, if there is one worth surfacing. */}
      {unreadMemos.length > 0 && (
        <Card tone="warm" padding="lg" className="mt-6">
          <div className="flex items-start gap-4">
            <span className="grid size-11 flex-none place-items-center rounded-full bg-ivory text-terracotta">
              <MessageSquareHeart className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-bark">
                {t('dashboard.newFrom', { name: patient?.display_name.split(' ')[0] ?? t('setup.pairing.fallbackName') })}
              </p>
              <p className="mt-1.5 font-heading text-lg leading-snug">
                {unreadMemos[0].transcript
                  ? `“${unreadMemos[0].transcript}”`
                  : t('dashboard.fallbackMemo')}
              </p>
              <p className="mt-1.5 text-[13px] text-muted">
                {t('dashboard.recorded', { time: formatRelativeTime(new Date(unreadMemos[0].recorded_at).toISOString()) })}
              </p>
              <Button asChild variant="solid" size="sm" className="mt-4">
                <Link to={`/p/${patientId}/messages`}>
                  {t('dashboard.listen')}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      )}

      <p className="mt-8 flex items-center gap-2 text-[13px] text-muted">
        {health === 'ok' ? null : <WifiOff className="size-3.5" />}
        {t('device.lastHeard', { time: formatRelativeTime(patient?.device_last_seen_at) })}
      </p>
    </>
  )
}
