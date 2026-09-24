import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { PageHeader } from '@/components/layout/PageHeader.tsx'
import { Card } from '@/components/ui/card.tsx'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/controls.tsx'
import { EmptyState, ErrorState } from '@/components/ui/feedback.tsx'
import { SkeletonChart, SkeletonStat } from '@/components/ui/skeleton.tsx'
import { ChartFrame, ChartTooltip, LegendItem } from '@/features/reports/ChartFrame.tsx'
import { axisProps, CHART, SEQUENTIAL, SERIES, STATUS } from '@/features/reports/chartTheme.ts'
import {
  summariseAdherence,
  summarisePlay,
  useDailyReport,
} from '@/features/reports/useDailyReport.ts'
import type { DailyReportRow } from '@/lib/database.types.ts'
import { groupDailyReportWeeks } from '@/lib/reporting.ts'
import { cn, formatDayShort, isoWeekdayIndex } from '@/lib/utils.ts'
import { useTranslation } from '@/i18n/index.ts'
import { usePatientAccess } from '@/patients/usePatientAccess.ts'

/**
 * Engagement (frontend.md §8).
 *
 * Two questions, kept apart: are they using it, and are the medicines getting
 * taken. They correlate but they are not the same thing, and a caregiver acting
 * on one when the other is the problem wastes the phone call.
 */

const RANGES = [
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
] as const

/**
 * The calendar heatmap, driven by the `played` boolean per day.
 *
 * One hue, light to dark - a sequential encoding for a magnitude, with "no
 * session" as an off-ramp neutral rather than the lightest step of the ramp.
 * Those two states mean different things and must not blend into each other.
 */
function PlayCalendar({ rows }: { rows: DailyReportRow[] }) {
  const { t } = useTranslation()
  const maxMinutes = Math.max(1, ...rows.map((row) => row.minutes_played ?? 0))

  const stepFor = (row: DailyReportRow) => {
    if (!row.played) return null
    const share = (row.minutes_played ?? 0) / maxMinutes
    return SEQUENTIAL[Math.min(SEQUENTIAL.length - 1, 1 + Math.floor(share * 3.99))]
  }

  // Monday-first columns, so weeks read as weeks.
  const firstWeekday = rows.length ? isoWeekdayIndex(rows[0].day) : 0

  return (
    <div>
      {/* Fixed 14px cells rather than fractional columns. A `1fr` track stretches
          each square to a hundred pixels on a wide screen, at which point the
          calendar stops reading as a calendar and becomes a wall of blocks -
          the whole value of this form is seeing a quarter of a year at once. */}
      <div className="overflow-x-auto pb-1">
        <div
          className="grid grid-flow-col gap-[3px]"
          style={{ gridTemplateRows: 'repeat(7, 14px)', gridAutoColumns: '14px' }}
          role="img"
          aria-label={t('engagement.sessionsAria', { count: rows.length })}
        >
          {Array.from({ length: firstWeekday }, (_, i) => (
            <span key={`pad-${i}`} aria-hidden="true" />
          ))}
          {rows.map((row) => {
            const color = stepFor(row)
            return (
              <span
                key={row.day}
                title={`${formatDayShort(row.day)} - ${
                  row.played ? t('engagement.minutes', { count: Math.round(row.minutes_played ?? 0) }) : t('engagement.noSession')
                }`}
                className={cn(
                  'size-[14px] rounded-[3px]',
                  !color && 'border border-ink/[0.09] bg-ivory',
                )}
                style={color ? { backgroundColor: color } : undefined}
              />
            )
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px] text-body">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] border border-ink/[0.12] bg-ivory" />
          {t('engagement.noSession')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          {t('engagement.less')}
          {SEQUENTIAL.slice(1).map((color) => (
            <span
              key={color}
              className="size-2.5 rounded-[3px]"
              style={{ backgroundColor: color }}
            />
          ))}
          {t('engagement.more')}
        </span>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <Card padding="md">
      <p className="text-[12.5px] font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </p>
      <p className="numeral mt-2 text-[clamp(26px,3vw,34px)] leading-none">{value}</p>
      <p className="mt-2 text-[13.5px] leading-snug text-body">{detail}</p>
    </Card>
  )
}

export default function Engagement() {
  const { t } = useTranslation()
  const { patientId, patient } = usePatientAccess()
  const [days, setDays] = useState<number>(90)

  const report = useDailyReport(patientId, days, patient?.timezone)
  const rows = report.data ?? []

  const play = summarisePlay(rows)
  const adherence = summariseAdherence(rows)

  // Weekly buckets - daily bars over ninety days are unreadable, and the
  // question here is about weeks anyway.
  const weeks: Array<{
    week: string
    onTablet: number
    byCall: number
    missed: number
    minutes: number
  }> = []
  for (const chunk of groupDailyReportWeeks(rows)) {
    weeks.push({
      week: chunk[0].day,
      onTablet: chunk.reduce((sum, row) => sum + (row.via_tablet ?? 0), 0),
      byCall: chunk.reduce((sum, row) => sum + (row.via_call ?? 0), 0),
      missed: chunk.reduce((sum, row) => sum + (row.missed ?? 0), 0),
      minutes: Math.round(chunk.reduce((sum, row) => sum + (row.minutes_played ?? 0), 0)),
    })
  }

  return (
    <>
      <PageHeader
        eyebrow={t('engagement.eyebrow')}
        title={t('engagement.title')}
        description={t('engagement.description')}
        actions={
          <Tabs value={String(days)} onValueChange={(value) => setDays(Number(value))}>
            <TabsList>
              {RANGES.map((range) => (
                <TabsTrigger key={range.days} value={String(range.days)}>
                  {t('engagement.rangeDays', { count: range.days })}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />

      {report.error && <ErrorState error={report.error} className="mb-6" />}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {report.isPending ? (
          [0, 1, 2, 3].map((i) => <SkeletonStat key={i} />)
        ) : (
          <>
            <Stat
              label={t('engagement.daysSession')}
              value={`${play.daysPlayed}/${play.daysTotal}`}
              detail={
                play.daysTotal > 0
                  ? t('engagement.daysPeriod', { percent: Math.round((play.daysPlayed / play.daysTotal) * 100) })
                  : t('engagement.noDays')
              }
            />
            <Stat
              label={t('engagement.tabletTime')}
              value={t('engagement.minutes', { count: play.minutes })}
              detail={t('engagement.sessions', { count: play.sessions })}
            />
            <Stat
              label={t('engagement.leftEarly')}
              value={String(play.abandoned)}
              detail={
                play.abandoned === 0
                  ? t('engagement.finished')
                  : t('engagement.unfinished')
              }
            />
            <Stat
              label={t('engagement.confirmed')}
              value={adherence.rate === null ? '-' : `${Math.round(adherence.rate * 100)}%`}
              detail={
                adherence.rate === null
                  ? t('engagement.noScheduled')
                  : t('engagement.doses', { confirmed: adherence.confirmed, scheduled: adherence.scheduled })
              }
            />
          </>
        )}
      </section>

      {report.isPending ? (
        <SkeletonChart className="mt-6" />
      ) : rows.length === 0 ? (
        <EmptyState
          className="mt-6"
          title={t('engagement.noData')}
          description={t('engagement.noDataDescription')}
        />
      ) : (
        <div className="mt-6 space-y-6">
          <ChartFrame
            title={t('engagement.dosesTitle')}
            reading={t('engagement.dosesReading')}
            legend={
              <>
                <LegendItem color={STATUS.onTablet} label={t('engagement.onTablet')} />
                <LegendItem color={STATUS.byCall} label={t('engagement.afterCall')} />
                <LegendItem color={STATUS.missed} label={t('engagement.notConfirmed')} />
              </>
            }
            table={{
              head: [t('engagement.weekOf'), t('engagement.onTablet'), t('engagement.afterCall'), t('engagement.notConfirmed')],
              rows: [...weeks]
                .reverse()
                .map((week) => [
                  formatDayShort(week.week),
                  String(week.onTablet),
                  String(week.byCall),
                  String(week.missed),
                ]),
            }}
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeks} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis
                    dataKey="week"
                    {...axisProps}
                    minTickGap={30}
                    tickFormatter={(value: string) => formatDayShort(value).slice(4)}
                  />
                  <YAxis {...axisProps} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(32,30,29,0.04)' }} content={<ChartTooltip />} />
                  {/* 2px surface gap between stacked segments, per the mark spec -
                      it is also the secondary encoding the status trio needs. */}
                  <Bar
                    name={t('engagement.onTablet')}
                    dataKey="onTablet"
                    stackId="doses"
                    fill={STATUS.onTablet}
                    stroke={CHART.surface}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                  <Bar
                    name={t('engagement.afterCall')}
                    dataKey="byCall"
                    stackId="doses"
                    fill={STATUS.byCall}
                    stroke={CHART.surface}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                  <Bar
                    name={t('engagement.notConfirmed')}
                    dataKey="missed"
                    stackId="doses"
                    fill={STATUS.missed}
                    stroke={CHART.surface}
                    strokeWidth={2}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartFrame>

          <ChartFrame
            title={t('engagement.minutesTitle')}
            reading={t('engagement.minutesReading')}
            table={{
              head: [t('engagement.weekOf'), t('engagement.minutesTitle')],
              rows: [...weeks]
                .reverse()
                .map((week) => [formatDayShort(week.week), String(week.minutes)]),
            }}
          >
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeks} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis
                    dataKey="week"
                    {...axisProps}
                    minTickGap={30}
                    tickFormatter={(value: string) => formatDayShort(value).slice(4)}
                  />
                  <YAxis {...axisProps} />
                  <Tooltip
                    cursor={{ fill: 'rgba(32,30,29,0.04)' }}
                    content={<ChartTooltip formatter={(value) => t('engagement.minutes', { count: value })} />}
                  />
                  <Bar
                    name={t('engagement.minutesTitle')}
                    dataKey="minutes"
                    fill={SERIES.primary}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartFrame>

          <ChartFrame
            title={t('engagement.calendarTitle')}
            reading={t('engagement.calendarReading')}
          >
            <PlayCalendar rows={rows} />
          </ChartFrame>
        </div>
      )}
    </>
  )
}
