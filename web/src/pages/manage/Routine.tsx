import { useState } from 'react'
import { CalendarHeart, Pencil, Plus, Trash2 } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Card } from '@/components/ui/card.tsx'
import { EmptyState, ErrorState, Notice } from '@/components/ui/feedback.tsx'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import {
  RoutineForm,
  emptyRoutine,
  toRoutineDraft,
  type RoutineDraft,
} from '@/features/routine/RoutineForm.tsx'
import { ROUTINE_ICONS, useRoutine, useRoutineMutation } from '@/features/routine/useRoutine.ts'
import { useTranslation } from '@/i18n/index.ts'
import type { TranslationKey } from '@/i18n/keys.ts'
import { partOfDay } from '@/lib/utils.ts'
import { usePatientAccess } from '@/patients/usePatientAccess.ts'

/**
 * Manage → Routine (frontend.md §8).
 *
 * The tablet renders these as a simple picture of the day. They are not
 * reminders and they do not escalate — that distinction is stated on the page,
 * because a caregiver who adds "take insulin" here expecting a phone call has
 * been badly misled by an interface that looked close enough to the medicines
 * screen.
 */
export default function Routine() {
  const { patientId, canEdit, patient } = usePatientAccess()
  const { formatTimeMinutes, t } = useTranslation()
  const routine = useRoutine(patientId)
  const { save, remove } = useRoutineMutation<RoutineDraft>(patientId)

  const [draft, setDraft] = useState<RoutineDraft | null>(null)

  const rows = [...(routine.data ?? [])].sort((a, b) => a.time_min - b.time_min)
  const firstName = patient?.display_name.split(' ')[0] ?? 'the patient'

  return (
    <>
      <PageHeader
        eyebrow={t('routine.eyebrow')}
        title={t('routine.title')}
        description={t('routine.description', { name: firstName })}
        actions={
          canEdit &&
          !draft && (
            <Button variant="accent" onClick={() => setDraft(emptyRoutine())}>
              <Plus className="size-4" />
              {t('routine.add')}
            </Button>
          )
        }
      />

      <Notice className="mb-6">
        {t('routine.orientationNotice')}
      </Notice>

      {routine.error && <ErrorState error={routine.error} className="mb-6" />}

      {draft && (
        <Card padding="lg" className="mb-6">
          <h2 className="mb-5 text-[19px]">
            {draft.id ? t('routine.edit') : t('routine.add')}
          </h2>
          <RoutineForm
            value={draft}
            onChange={setDraft}
            saving={save.isPending}
            submitLabel={draft.id ? t('common.save') : t('routine.add')}
            onCancel={() => setDraft(null)}
            onSubmit={() => save.mutate(draft, { onSuccess: () => setDraft(null) })}
          />
          {save.error && <ErrorState error={save.error} className="mt-4" />}
        </Card>
      )}

      {routine.isPending && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      )}

      {!routine.isPending && rows.length === 0 && !draft && (
        <EmptyState
          icon={<CalendarHeart className="size-5" />}
          title={t('routine.emptyTitle')}
          description={t('routine.emptyDescription')}
          action={
            canEdit && (
              <Button onClick={() => setDraft(emptyRoutine())}>
                <Plus className="size-4" />
                {t('routine.addFirst')}
              </Button>
            )
          }
        />
      )}

      {/* A timeline rather than a list: the order things happen in is the
          information, and a plain list buries it in the second column. */}
      {rows.length > 0 && (
        <ol className="relative space-y-3 border-l-2 border-sand pl-6">
          {rows.map((item) => (
            <li key={item.id} className="relative">
              <span
                className="absolute -left-[31px] top-5 size-3 rounded-full border-2 border-ivory bg-sage"
                aria-hidden="true"
              />
              <Card tone="sage" padding="md" className="flex items-center gap-4">
                <span className="numeral w-20 flex-none text-[15px] text-sage">
                  {formatTimeMinutes(item.time_min)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-[17px] font-bold">
                    {item.label_key}
                  </p>
                  <p className="truncate text-[13px] text-muted">
                    {t(`format.${partOfDay(item.time_min).toLowerCase()}` as TranslationKey)} ·{' '}
                    {ROUTINE_ICONS.find((icon) => icon.value === item.icon_asset) ? t(ROUTINE_ICONS.find((icon) => icon.value === item.icon_asset)!.key) : item.icon_asset}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex flex-none gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('common.editName', { name: item.label_key })}
                      onClick={() => setDraft(toRoutineDraft(item))}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('common.removeName', { name: item.label_key })}
                      onClick={() => remove.mutate(item.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}
