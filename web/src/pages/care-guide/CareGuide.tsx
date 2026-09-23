import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader.tsx'
import { Card } from '@/components/ui/card.tsx'
import { Notice } from '@/components/ui/feedback.tsx'
import { cn } from '@/lib/utils.ts'
import { usePatientAccess } from '@/patients/usePatientAccess.ts'
import { CATALOGUES, useTranslation } from '@/i18n/index.ts'

/**
 * Care guide (frontend.md §8).
 *
 * Static content, no backend wiring — deliberately hardcoded rather than pulled
 * from a CMS, because it is short, it changes rarely, and a caregiver reading it
 * at midnight should not be waiting on a network request.
 *
 * The one editorial rule this page follows: **nothing here diagnoses anything.**
 * Smriti detects changes in patterns. It does not know why a pattern changed and
 * neither does this page, and telling a frightened adult child otherwise would
 * be both wrong and unkind.
 */

function Section({ title, body }: { title: string; body: string[] }) {
  const [open, setOpen] = useState(false)
  return (
    <Card padding="none" className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-sand/40 sm:px-6"
      >
        <h2 className="min-w-0 flex-1 font-heading text-[18px] font-bold">{title}</h2>
        <ChevronDown
          className={cn('size-5 flex-none text-muted transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div className="space-y-3 border-t border-ink/[0.07] px-5 pb-5 pt-4 sm:px-6">
          {body.map((paragraph, i) => (
            <p key={i} className="max-w-[68ch] text-[15px] leading-relaxed text-body">
              {paragraph}
            </p>
          ))}
        </div>
      )}
    </Card>
  )
}

export default function CareGuide() {
  const { locale, t } = useTranslation()
  const { patient } = usePatientAccess()
  const firstName = patient?.display_name.split(' ')[0] ?? 'the patient'

  return (
    <>
      <PageHeader
        eyebrow={t('careGuide.eyebrow')}
        title={t('careGuide.title')}
        description={t('careGuide.description', { name: firstName })}
      />

      <Notice className="mb-6">
        {t('careGuide.safetyNotice')}
      </Notice>

      <div className="space-y-3">
        {CATALOGUES[locale].careGuide.sections.map((section) => (
          <Section key={section.title} {...section} />
        ))}
      </div>

      <Card tone="dark" padding="lg" className="mt-8">
        <h2 className="text-[19px] text-ivory">{t('careGuide.stillStuck')}</h2>
        <p className="mt-2 max-w-[52ch] text-[15px] leading-relaxed text-ivory/85">
          {t('careGuide.stillStuckBody')}
        </p>
      </Card>
    </>
  )
}
