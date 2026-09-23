import { useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { PageHeader } from '@/components/layout/PageHeader.tsx'
import { Card, CardTitle } from '@/components/ui/card.tsx'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/controls.tsx'
import { EmptyState, ErrorState, Notice } from '@/components/ui/feedback.tsx'
import { SkeletonChart } from '@/components/ui/skeleton.tsx'
import { ChartFrame, ChartTooltip, LegendItem } from '@/features/reports/ChartFrame.tsx'
import { axisProps, CHART, SERIES } from '@/features/reports/chartTheme.ts'
import { FlagCard } from '@/features/flags/FlagCard.tsx'
import { sortByUrgency, useFlags } from '@/features/flags/useFlags.ts'
import {
  DOMAIN_LABEL,
  byDomain,
  rollingMean,
  useDailyDomain,
  useDailyReport,
} from '@/features/reports/useDailyReport.ts'
import { formatDayShort } from '@/lib/utils.ts'
import { useTranslation } from '@/i18n/index.ts'
import { usePatientAccess } from '@/patients/usePatientAccess.ts'

/**
 * Trends (frontend.md §8).
 *
 * The honest gap, stated on the page rather than hidden: without the ML
 * engineer's deeper views (`0013_report_views.sql`), this page can show
 * domain-level trends from `daily_domain` and nothing more. Per-person
 * recognition trajectories, savings scores and sundowning are laid out below as
 * empty sections rather than omitted, so the shape of the finished page is
 * visible and adding them later is a component swap, not a redesign.
 *
 * Everything here reads from views. No screen in this app touches `events` or
 * `sessions` (§15 rule 2).
 */

const RANGES = [
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
] as const

/**
 * One domain, one small multiple.
 *
 * Five domains on one chart would need a five-hue categorical palette, and this
 * brand cannot produce one that survives a colour-vision check on a warm
 * surface (see `chartTheme.ts`). Five small charts in one hue is the better
 * chart regardless: the question is "is this one drifting", not "which of these
 * five is highest".
 */
function DomainSpark({
  domain,
  rows,
  changepoint,
}: {
  domain: string
  rows: Array<{ day: string; accuracy: number | null }>
  changepoint: string | null
}) {
  const { t } = useTranslation()
  const first = rows.find((r) => r.accuracy !== null)?.accuracy ?? null
  const last = [...rows].reverse().find((r) => r.accuracy !== null)?.accuracy ?? null
  const delta = first !== null && last !== null ? last - first : null

  return (
    <div className="stitched rounded-card border-[#E7D9C2] bg-ivory p-4 [--stitch:var(--color-sage)]">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[14px] font-semibold">{DOMAIN_LABEL[domain] ? t(DOMAIN_LABEL[domain] as 'domains.memory') : domain}</p>
        <span
          className={`numeral text-[13px] ${
            delta === null ? 'text-muted' : delta < -0.05 ? 'text-alert' : 'text-sage'
          }`}
        >
          {delta === null
            ? '—'
            : t('trends.points', { count: `${delta >= 0 ? '+' : ''}${Math.round(delta * 100)}` })}
        </span>
      </div>
      <div className="mt-2 h-20">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
            <YAxis domain={[0.3, 1]} hide />
            <XAxis dataKey="day" hide />
            {changepoint && (
              <ReferenceLine x={changepoint} stroke={CHART.axis} strokeDasharray="3 3" />
            )}
            <Tooltip
              content={
                <ChartTooltip
                  formatter={(value) =>
                    typeof value === 'number' ? t('trends.percentCorrect', { percent: Math.round(value * 100) }) : '—'
                  }
                />
              }
            />
            <Line
              type="monotone"
              dataKey="accuracy"
              stroke={SERIES.primary}
              strokeWidth={CHART.strokeWidth}
              dot={false}
              activeDot={{ r: CHART.activeDotRadius, strokeWidth: 2, stroke: CHART.surface }}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function ComingSoon({ title, description }: { title: string; description: string }) {
  const { t } = useTranslation()
  return (
    <Card padding="md" className="border-dashed">
      <CardTitle className="text-[16px] text-muted">{title}</CardTitle>
      <p className="mt-1.5 max-w-[58ch] text-[13.5px] leading-relaxed text-muted">
        {description}
      </p>
      <p className="mt-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-muted">
        {t('trends.unavailable')}
      </p>
    </Card>
  )
}

export default function Trends() {
  const { t } = useTranslation()
  const { patientId, patient } = usePatientAccess()
  const [days, setDays] = useState<number>(90)

  const report = useDailyReport(patientId, days, patient?.timezone)
  const domains = useDailyDomain(patientId, days, patient?.timezone)
  const flags = useFlags(patientId)

  const rows = report.data ?? []
  const activeFlags = sortByUrgency(flags.data ?? [])
  const changepoint = activeFlags.find((f) => f.changepoint_date)?.changepoint_date ?? null

  // Accuracy: the raw daily figure plus a seven-day mean over it. Same measure,
  // same hue at two weights — not two series.
  const accuracySeries = rollingMean(rows, (row) => row.accuracy, 7)
  const accuracyData = rows.map((row, i) => ({
    day: row.day,
    accuracy: row.accuracy,
    mean: accuracySeries[i]?.value ?? null,
  }))

  const domainRows = byDomain(domains.data ?? [])
  const hasPlay = rows.some((row) => row.played)

  return (
    <>
      <PageHeader
        eyebrow={t('trends.eyebrow')}
        title={t('trends.title')}
        description={t('trends.description')}
        actions={
          <Tabs value={String(days)} onValueChange={(value) => setDays(Number(value))}>
            <TabsList>
              {RANGES.map((range) => (
                <TabsTrigger key={range.days} value={String(range.days)}>
                  {t('trends.rangeDays', { count: range.days })}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />

      {activeFlags.length > 0 && (
        <section className="mb-8 space-y-3" aria-label={t('trends.notices')}>
          {activeFlags.map((flag) => (
            <FlagCard key={flag.id} flag={flag} patientId={patientId} />
          ))}
        </section>
      )}

      {report.error && <ErrorState error={report.error} className="mb-6" />}

      {report.isPending ? (
        <SkeletonChart />
      ) : !hasPlay ? (
        <EmptyState
          title={t('trends.noData')}
          description={t('trends.noDataDescription')}
        />
      ) : (
        <>
          <ChartFrame
            title={t('trends.accuracyTitle')}
            reading={t('trends.accuracyReading')}
            legend={
              <>
                <LegendItem color={SERIES.primarySoft} label={t('trends.thatDay')} />
                <LegendItem color={SERIES.trend} label={t('trends.sevenDay')} />
                {changepoint && (
                  <LegendItem color={CHART.axis} label={t('trends.change')} />
                )}
              </>
            }
            table={{
              head: [t('trends.day'), t('trends.correct'), t('trends.sevenDay')],
              rows: accuracyData
                .filter((row) => row.accuracy !== null)
                .slice(-40)
                .reverse()
                .map((row) => [
                  formatDayShort(row.day),
                  row.accuracy !== null ? `${Math.round(row.accuracy * 100)}%` : '—',
                  row.mean !== null ? `${Math.round(row.mean * 100)}%` : '—',
                ]),
            }}
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={accuracyData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis
                    dataKey="day"
                    {...axisProps}
                    minTickGap={44}
                    tickFormatter={(value: string) => formatDayShort(value).slice(4)}
                  />
                  <YAxis
                    {...axisProps}
                    domain={[0.3, 1]}
                    tickFormatter={(value: number) => `${Math.round(value * 100)}%`}
                  />
                  {changepoint && (
                    <ReferenceLine
                      x={changepoint}
                      stroke={CHART.axis}
                      strokeDasharray="4 4"
                      label={{
                        value: t('trends.changeLabel'),
                        position: 'insideTopRight',
                        fill: CHART.tick,
                        fontSize: 11,
                      }}
                    />
                  )}
                  <Tooltip
                    content={
                      <ChartTooltip
                        formatter={(value) =>
                          typeof value === 'number' ? `${Math.round(value * 100)}%` : '—'
                        }
                      />
                    }
                  />
                  <Line
                    name={t('trends.thatDay')}
                    type="monotone"
                    dataKey="accuracy"
                    stroke={SERIES.primarySoft}
                    strokeWidth={CHART.strokeWidth}
                    dot={false}
                    activeDot={{ r: CHART.activeDotRadius, strokeWidth: 2, stroke: CHART.surface }}
                    connectNulls
                    isAnimationActive={false}
                  />
                  <Line
                    name={t('trends.sevenDay')}
                    type="monotone"
                    dataKey="mean"
                    stroke={SERIES.trend}
                    strokeWidth={CHART.strokeWidth}
                    dot={false}
                    activeDot={{ r: CHART.activeDotRadius, strokeWidth: 2, stroke: CHART.surface }}
                    connectNulls
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartFrame>

          <section className="mt-6">
            <h2 className="text-[19px]">{t('trends.domainTitle')}</h2>
            <p className="mt-1.5 max-w-[62ch] text-[14px] leading-relaxed text-body">
              {t('trends.domainDescription')}
            </p>
            {domains.isPending ? (
              <SkeletonChart className="mt-4" />
            ) : Object.keys(domainRows).length === 0 ? (
              <EmptyState
                className="mt-4"
                title={t('trends.noDomain')}
                description={t('trends.noDomainDescription')}
              />
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(domainRows).map(([domain, domainData]) => (
                  <DomainSpark
                    key={domain}
                    domain={domain}
                    changepoint={changepoint}
                    rows={domainData.map((row) => ({ day: row.day, accuracy: row.accuracy }))}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <section className="mt-10">
        <h2 className="text-[19px]">{t('trends.comingSoon')}</h2>
        <Notice className="mt-3">
          {t('trends.comingSoonNotice')}
        </Notice>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <ComingSoon
            title={t('trends.recognitionTitle')}
            description={t('trends.recognitionDescription')}
          />
          <ComingSoon
            title={t('trends.retentionTitle')}
            description={t('trends.retentionDescription')}
          />
          <ComingSoon
            title={t('trends.timeOfDay')}
            description={t('trends.afternoonsDescription')}
          />
        </div>
      </section>
    </>
  )
}
