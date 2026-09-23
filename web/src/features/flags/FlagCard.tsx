import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

import { Badge } from '@/components/ui/badge.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Card } from '@/components/ui/card.tsx'
import { cn, formatDayShort } from '@/lib/utils.ts'
import { usePatientAccess } from '@/patients/usePatientAccess.ts'
import { DOMAIN_LABEL } from '@/features/reports/useDailyReport.ts'
import { useTranslation } from '@/i18n/index.ts'
import { FLAG_COPY, SEVERITY_COPY, readZScores, useAcknowledgeFlag } from './useFlags.ts'
import type { Flag } from '@smriti/shared'

/**
 * One flag, with its evidence.
 *
 * "See the evidence" is not a power-user affordance — it is the difference
 * between Smriti telling a frightened person something about their parent and
 * Smriti *showing its work*. Everything behind the toggle is already on the
 * `flags` row (`z_scores`, `changepoint_date`, `evidence_session_ids`, the two
 * comparison windows), so opening it costs no query.
 *
 * Acknowledging is a caregiver action; a `family_viewer` sees the flag and its
 * evidence and cannot clear it (§15 rule 8).
 */
export function FlagCard({ flag, patientId }: { flag: Flag; patientId: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { canEdit } = usePatientAccess()
  const acknowledge = useAcknowledgeFlag(patientId)

  const copy = FLAG_COPY[flag.type]
  const severity = SEVERITY_COPY[flag.severity]
  const zScores = readZScores(flag.z_scores)

  return (
    <Card
      tone={flag.severity === 'high' ? 'alert' : flag.severity === 'moderate' ? 'warm' : 'sand'}
      padding="md"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="relative grid place-items-center">
              {/* A serious flag breathes; the others sit still. */}
              {flag.severity === 'high' && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-pill bg-alert/40 animate-pulse-ring"
                />
              )}
              <Badge tone={severity.tone} size="sm" className="relative">
                {t(severity.label)}
              </Badge>
            </span>
            {flag.domains.length > 0 && (
              <span className="text-[12.5px] text-muted">
                {flag.domains.map((d) => DOMAIN_LABEL[d] ? t(DOMAIN_LABEL[d] as 'domains.memory') : d).join(', ')}
              </span>
            )}
          </div>
          <h3 className="mt-2 text-[18px] leading-snug">{t(copy.title)}</h3>
          <p className="mt-1.5 max-w-[58ch] text-[14.5px] leading-relaxed text-body">
            {t(copy.body)}
          </p>
        </div>

        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => acknowledge.mutate(flag.id)}
            disabled={acknowledge.isPending}
          >
            <Check className="size-4" />
            {acknowledge.isPending ? t('flags.clearing') : t('flags.seen')}
          </Button>
        )}
      </div>

      {acknowledge.error && (
        <p role="alert" className="mt-3 text-[13px] font-medium text-alert">
          {t('flags.clearFailed')}
        </p>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-3 flex items-center gap-1.5 text-[13.5px] font-semibold text-bark hover:underline"
      >
        {t('flags.evidence')}
        <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <dl className="mt-4 grid gap-x-8 gap-y-3 border-t border-ink/[0.08] pt-4 text-[13.5px] sm:grid-cols-2">
          {flag.changepoint_date && (
            <div>
              <dt className="font-semibold text-muted">{t('flags.changeStart')}</dt>
              <dd className="mt-0.5">{formatDayShort(flag.changepoint_date)}</dd>
            </div>
          )}
          {flag.confidence !== null && (
            <div>
              <dt className="font-semibold text-muted">{t('flags.confidence')}</dt>
              <dd className="mt-0.5">
                {t('flags.confidenceValue', { percent: Math.round(flag.confidence * 100) })}
              </dd>
            </div>
          )}
          {flag.baseline_window && (
            <div>
              <dt className="font-semibold text-muted">{t('flags.compared')}</dt>
              <dd className="mt-0.5">{flag.baseline_window.replace('..', ' to ')}</dd>
            </div>
          )}
          {flag.recent_window && (
            <div>
              <dt className="font-semibold text-muted">{t('flags.recent')}</dt>
              <dd className="mt-0.5">{flag.recent_window.replace('..', ' to ')}</dd>
            </div>
          )}
          {zScores.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="font-semibold text-muted">
                {t('flags.usualByArea')}
              </dt>
              <dd className="mt-1.5 flex flex-wrap gap-2">
                {zScores.map(([domain, z]) => (
                  <Badge key={domain} tone={z < -2 ? 'alert' : 'gold'} size="sm">
                    {DOMAIN_LABEL[domain] ? t(DOMAIN_LABEL[domain] as 'domains.memory') : domain}: {z > 0 ? '+' : ''}
                    {z.toFixed(1)}
                  </Badge>
                ))}
              </dd>
            </div>
          )}
          {flag.evidence_session_ids && flag.evidence_session_ids.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="font-semibold text-muted">{t('flags.basedOn')}</dt>
              <dd className="mt-0.5">
                {t('flags.sessions', { count: flag.evidence_session_ids.length })}
              </dd>
            </div>
          )}
        </dl>
      )}
    </Card>
  )
}
