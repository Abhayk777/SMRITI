import { useState } from 'react'
import { FileText } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Card, CardTitle } from '@/components/ui/card.tsx'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/controls.tsx'
import { Notice } from '@/components/ui/feedback.tsx'
import { REPORT_RANGES } from '@/features/reports/useGenerateReport.ts'
import {
  summariseAdherence,
  summarisePlay,
  useDailyReportMonths,
} from '@/features/reports/useDailyReport.ts'
import { usePatientAccess } from '@/patients/usePatientAccess.ts'

/**
 * Report (frontend.md §8, §10).
 *
 * `generate-report` is not built yet, so its control is visibly disabled and
 * no request is made to a nonexistent function.
 *
 * In the meantime the page is not empty: the figures underneath come from
 * `daily_report`, which is live, so there is something to read to a doctor
 * today even without the PDF.
 */
export default function Report() {
  const { patientId, patient } = usePatientAccess()
  const [months, setMonths] = useState<number>(3)

  const report = useDailyReportMonths(patientId, months, patient?.timezone)

  const rows = report.data ?? []
  const play = summarisePlay(rows)
  const adherence = summariseAdherence(rows)

  return (
    <>
      <PageHeader
        eyebrow="Report"
        title="Something to take to the doctor"
        description="A single page covering the period you choose — routines kept, medicines confirmed, what has changed, and the questions worth asking at the next appointment."
      />

      <Card padding="lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-4.5 text-terracotta" />
              Generate a report
            </CardTitle>
            <p className="mt-1.5 max-w-[52ch] text-[14.5px] leading-relaxed text-body">
              Covering {patient?.display_name ?? 'the patient'}. Shareable with siblings and with their
              doctor — it contains no game scores out of context, only patterns and dates.
            </p>
          </div>

          <Tabs value={String(months)} onValueChange={(value) => setMonths(Number(value))}>
            <TabsList>
              {REPORT_RANGES.map((range) => (
                <TabsTrigger key={range.months} value={String(range.months)}>
                  {range.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="mt-6">
          <Button variant="accent" size="lg" disabled title="PDF reports are not available yet">
            <FileText className="size-4" />
            PDF report unavailable
          </Button>
          <Notice tone="warn" className="mt-4">
            <strong>PDF report generation is not switched on yet.</strong> The figures below
            are live and use the selected calendar period; no report request will be sent.
          </Notice>
        </div>
      </Card>

      {/* Live figures, so the page is useful before the PDF exists. */}
      <section className="mt-8">
        <h2 className="text-[19px]">What the report will say</h2>
        <p className="mt-1.5 max-w-[62ch] text-[14px] leading-relaxed text-body">
          These come straight from the tablet, for the period selected above. You can read
          them out at an appointment today.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Card tone="sand" padding="md">
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.1em] text-muted">
              Medicines
            </p>
            <p className="numeral mt-2 text-[30px] leading-none">
              {adherence.rate === null ? '—' : `${Math.round(adherence.rate * 100)}%`}
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-body">
              {adherence.rate === null
                ? 'Nothing scheduled in this period.'
                : `${adherence.confirmed} of ${adherence.scheduled} doses confirmed. ${adherence.viaCall} needed a phone call.`}
            </p>
          </Card>

          <Card tone="sand" padding="md">
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.1em] text-muted">
              Sessions
            </p>
            <p className="numeral mt-2 text-[30px] leading-none">
              {play.daysPlayed}
              <span className="text-[18px] text-muted">/{play.daysTotal} days</span>
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-body">
              {play.minutes} minutes in total.
              {play.accuracy !== null &&
                ` Answers correct ${Math.round(play.accuracy * 100)}% of the time on average.`}
            </p>
          </Card>
        </div>
      </section>
    </>
  )
}
