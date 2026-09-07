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
import { axisProps, CHART, SEQUENTIAL, SERIES, STATUS, STATUS_LABEL } from '@/features/reports/chartTheme.ts'
import {
  summariseAdherence,
  summarisePlay,
  useDailyReport,
} from '@/features/reports/useDailyReport.ts'
import type { DailyReportRow } from '@/lib/database.types.ts'
import { groupDailyReportWeeks } from '@/lib/reporting.ts'
import { cn, formatDayShort, isoWeekdayIndex } from '@/lib/utils.ts'
import { usePatientAccess } from '@/patients/usePatientAccess.ts'

/**
 * Engagement (frontend.md §8).
 *
 * Two questions, kept apart: is she using it, and are the medicines getting
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
 * One hue, light to dark — a sequential encoding for a magnitude, with "no
 * session" as an off-ramp neutral rather than the lightest step of the ramp.
 * Those two states mean different things and must not blend into each other.
 */
function PlayCalendar({ rows }: { rows: DailyReportRow[] }) {
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
          calendar stops reading as a calendar and becomes a wall of blocks —
          the whole value of this form is seeing a quarter of a year at once. */}
      <div className="overflow-x-auto pb-1">
        <div
          className="grid grid-flow-col gap-[3px]"
          style={{ gridTemplateRows: 'repeat(7, 14px)', gridAutoColumns: '14px' }}
          role="img"
          aria-label={`Sessions over the last ${rows.length} days`}
        >
          {Array.from({ length: firstWeekday }, (_, i) => (
            <span key={`pad-${i}`} aria-hidden="true" />
          ))}
          {rows.map((row) => {
            const color = stepFor(row)
            return (
              <span
                key={row.day}
                title={`${formatDayShort(row.day)} — ${
                  row.played ? `${Math.round(row.minutes_played ?? 0)} min` : 'no session'
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
          No session
        </span>
        <span className="inline-flex items-center gap-1.5">
          Less
          {SEQUENTIAL.slice(1).map((color) => (
            <span
              key={color}
              className="size-2.5 rounded-[3px]"
              style={{ backgroundColor: color }}
            />
          ))}
          More
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
  const { patientId, patient } = usePatientAccess()
  const [days, setDays] = useState<number>(90)

  const report = useDailyReport(patientId, days, patient?.timezone)
  const rows = report.data ?? []

  const play = summarisePlay(rows)
  const adherence = summariseAdherence(rows)

  // Weekly buckets — daily bars over ninety days are unreadable, and the
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
        eyebrow="Engagement"
        title="Is Smriti actually being used?"
        description="Whether she is opening the tablet, and whether the medicines are getting taken. Two different questions — a bad week at one does not mean a bad week at the other."
        actions={
          <Tabs value={String(days)} onValueChange={(value) => setDays(Number(value))}>
            <TabsList>
              {RANGES.map((range) => (
                <TabsTrigger key={range.days} value={String(range.days)}>
                  {range.label}
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
              label="Days with a session"
              value={`${play.daysPlayed}/${play.daysTotal}`}
              detail={
                play.daysTotal > 0
                  ? `${Math.round((play.daysPlayed / play.daysTotal) * 100)}% of days in this period.`
                  : 'No days in range.'
              }
            />
            <Stat
              label="Time on the tablet"
              value={`${play.minutes} min`}
              detail={`Across ${play.sessions} session${play.sessions === 1 ? '' : 's'}.`}
            />
            <Stat
              label="Left partway through"
              value={String(play.abandoned)}
              detail={
                play.abandoned === 0
                  ? 'She finished everything she started.'
                  : 'Sessions she started and did not finish.'
              }
            />
            <Stat
              label="Medicines confirmed"
              value={adherence.rate === null ? '—' : `${Math.round(adherence.rate * 100)}%`}
              detail={
                adherence.rate === null
                  ? 'Nothing has been scheduled in this period.'
                  : `${adherence.confirmed} of ${adherence.scheduled} doses.`
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
          title="Nothing here yet"
          description="Once the tablet has been in use for a few days, this page fills in on its own."
        />
      ) : (
        <div className="mt-6 space-y-6">
          <ChartFrame
            title="How each dose was confirmed"
            reading="Confirmed on the tablet is the quiet path. Confirmed after a call means Smriti had to reach someone — a few is normal, a rising run is worth a conversation about the reminder time."
            legend={
              <>
                <LegendItem color={STATUS.onTablet} label={STATUS_LABEL.onTablet} />
                <LegendItem color={STATUS.byCall} label={STATUS_LABEL.byCall} />
                <LegendItem color={STATUS.missed} label={STATUS_LABEL.missed} />
              </>
            }
            table={{
              head: ['Week of', 'On tablet', 'After a call', 'Not confirmed'],
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
                  {/* 2px surface gap between stacked segments, per the mark spec —
                      it is also the secondary encoding the status trio needs. */}
                  <Bar
                    name={STATUS_LABEL.onTablet}
                    dataKey="onTablet"
                    stackId="doses"
                    fill={STATUS.onTablet}
                    stroke={CHART.surface}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                  <Bar
                    name={STATUS_LABEL.byCall}
                    dataKey="byCall"
                    stackId="doses"
                    fill={STATUS.byCall}
                    stroke={CHART.surface}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                  <Bar
                    name={STATUS_LABEL.missed}
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
            title="Minutes on the tablet, by week"
            reading="Total time each week. Steady matters more than high — twenty minutes most days beats an hour on a Sunday."
            table={{
              head: ['Week of', 'Minutes'],
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
                    content={<ChartTooltip formatter={(value) => `${value} min`} />}
                  />
                  <Bar
                    name="Minutes"
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
            title="Every day at a glance"
            reading="One square per day, darker for a longer session. The gaps are as informative as the colour."
          >
            <PlayCalendar rows={rows} />
          </ChartFrame>
        </div>
      )}
    </>
  )
}
