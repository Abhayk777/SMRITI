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
import { useTranslation } from '@/i18n/index.ts'

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
  const { t } = useTranslation()
  const { patientId, patient } = usePatientAccess()
  const [months, setMonths] = useState<number>(3)

  const report = useDailyReportMonths(patientId, months, patient?.timezone)

  const rows = report.data ?? []
  const play = summarisePlay(rows)
  const adherence = summariseAdherence(rows)

  return (
    <>
      <PageHeader
        eyebrow={t('report.eyebrow')}
        title={t('report.title')}
        description={t('report.description')}
      />

      <Card padding="lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-4.5 text-terracotta" />
              {t('report.generate')}
            </CardTitle>
            <p className="mt-1.5 max-w-[52ch] text-[14.5px] leading-relaxed text-body">
              {t('report.covering', { name: patient?.display_name ?? 'the patient' })}
            </p>
          </div>

          <Tabs value={String(months)} onValueChange={(value) => setMonths(Number(value))}>
            <TabsList>
              {REPORT_RANGES.map((range) => (
                <TabsTrigger key={range.months} value={String(range.months)}>
                  {t(range.key)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="mt-6">
          <Button variant="accent" size="lg" disabled title={t('report.pdfUnavailableTitle')}>
            <FileText className="size-4" />
            {t('report.pdfUnavailable')}
          </Button>
          <Notice tone="warn" className="mt-4">
            {t('report.pdfNotice')}
          </Notice>
        </div>
      </Card>

      {/* Live figures, so the page is useful before the PDF exists. */}
      <section className="mt-8">
        <h2 className="text-[19px]">{t('report.summaryTitle')}</h2>
        <p className="mt-1.5 max-w-[62ch] text-[14px] leading-relaxed text-body">
          {t('report.summaryDescription')}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Card tone="sand" padding="md">
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.1em] text-muted">
              {t('report.medicines')}
            </p>
            <p className="numeral mt-2 text-[30px] leading-none">
              {adherence.rate === null ? '—' : `${Math.round(adherence.rate * 100)}%`}
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-body">
              {adherence.rate === null
                ? t('report.nothingScheduled')
                : t('report.dosesConfirmed', { confirmed: adherence.confirmed, scheduled: adherence.scheduled, viaCall: adherence.viaCall })}
            </p>
          </Card>

          <Card tone="sand" padding="md">
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.1em] text-muted">
              {t('report.sessions')}
            </p>
            <p className="numeral mt-2 text-[30px] leading-none">
              {play.daysPlayed}
              <span className="text-[18px] text-muted">/{play.daysTotal} {t('report.days')}</span>
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-body">
              {t('report.minutesTotal', { minutes: play.minutes })}
              {play.accuracy !== null &&
                ` ${t('report.answersCorrect', { percent: Math.round(play.accuracy * 100) })}`}
            </p>
          </Card>
        </div>
      </section>
    </>
  )
}
