import { useState } from 'react'
import { Camera, Clock, Pencil, Pill, Plus, Trash2 } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader.tsx'
import { StoredPatientPhoto, StoredPatientVoice } from '@/components/media/StoredPatientMedia.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Card } from '@/components/ui/card.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx'
import { EmptyState, ErrorState, Notice } from '@/components/ui/feedback.tsx'
import { SkeletonRow } from '@/components/ui/skeleton.tsx'
import {
  MedicineForm,
  emptyMedicine,
  toDraft,
  type MedicineDraft,
} from '@/features/medicines/MedicineForm.tsx'
import { OcrReview } from '@/features/medicines/OcrReview.tsx'
import { useTranslation } from '@/i18n/index.ts'
import type { TranslationKey } from '@/i18n/keys.ts'
import {
  useMedicines,
  useMedicineBatchMutation,
  useMedicineMutation,
} from '@/features/medicines/useMedicines.ts'
import { partOfDay } from '@/lib/utils.ts'
import { usePatientAccess } from '@/patients/usePatientAccess.ts'
import type { Medication } from '@smriti/shared'

/**
 * Manage → Medicines (frontend.md §8).
 *
 * Medicines use the same content-write choke point whether entered by hand or
 * confirmed from a prescription scan. OCR only proposes review rows.
 *
 * Removing a medicine sets `active: false` rather than deleting the row. The
 * adherence history in `daily_adherence` is built from `reminder_events` that
 * reference it, and a caregiver tidying up an old prescription should not
 * silently rewrite three months of the record they are about to show a doctor.
 */
export default function Medicines() {
  const { patientId, canEdit } = usePatientAccess()
  const { formatDaysOfWeek, formatTimeMinutes, t } = useTranslation()
  const medicines = useMedicines(patientId)
  const { save, remove } = useMedicineMutation<MedicineDraft>(patientId)
  const saveScanned = useMedicineBatchMutation(patientId)

  const [draft, setDraft] = useState<MedicineDraft | null>(null)
  const [scanning, setScanning] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<Medication | null>(null)

  const rows = medicines.data ?? []

  const grouped = rows.reduce<Record<string, Medication[]>>((acc, row) => {
    const key = partOfDay(row.chosen_time_min)
    ;(acc[key] ??= []).push(row)
    return acc
  }, {})

  return (
    <>
      <PageHeader
        eyebrow={t('medicines.eyebrow')}
        title={t('medicines.title')}
        description={t('medicines.description')}
        actions={
          canEdit &&
          !draft && !scanning && (
            <>
              <Button variant="outline" onClick={() => setScanning(true)}>
                <Camera className="size-4" />
                {t('medicines.scan')}
              </Button>
              <Button variant="accent" onClick={() => setDraft(emptyMedicine())}>
                <Plus className="size-4" />
                {t('medicines.add')}
              </Button>
            </>
          )
        }
      />

      {!canEdit && (
        <Notice className="mb-6">
          {t('medicines.viewOnly')}
        </Notice>
      )}

      {canEdit && !draft && !scanning && (
        <Notice className="mb-6">
          {t('medicines.scanHint')}
        </Notice>
      )}

      {medicines.error && <ErrorState error={medicines.error} className="mb-6" />}

      {draft && (
        <Card padding="lg" className="mb-6">
          <h2 className="mb-5 text-[19px]">
            {draft.id ? t('medicines.editThis', { name: draft.name || t('medicines.title').toLowerCase() }) : t('medicines.add')}
          </h2>
          <MedicineForm
            patientId={patientId}
            value={draft}
            onChange={setDraft}
            saving={save.isPending}
            submitLabel={draft.id ? t('common.save') : t('medicines.add')}
            onCancel={() => setDraft(null)}
            onSubmit={() => save.mutate(draft, { onSuccess: () => setDraft(null) })}
          />
          {save.error && <ErrorState error={save.error} className="mt-4" />}
        </Card>
      )}

      {scanning && (
        <div className="mb-6">
          <OcrReview
            patientId={patientId}
            saving={saveScanned.isPending}
            onClose={() => setScanning(false)}
            onSave={(drafts) =>
              saveScanned.mutate(drafts, { onSuccess: () => setScanning(false) })
            }
          />
          {saveScanned.error && <ErrorState error={saveScanned.error} className="mt-4" />}
        </div>
      )}

      {medicines.isPending && (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      )}

      {!medicines.isPending && rows.length === 0 && !draft && !scanning && (
        <EmptyState
          icon={<Pill className="size-5" />}
          title={t('medicines.noMedicines')}
          description={t('medicines.noMedicinesDescription')}
          action={
            canEdit && (
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={() => setDraft(emptyMedicine())}>
                  <Plus className="size-4" />
                  {t('medicines.addByHand')}
                </Button>
                <Button variant="outline" onClick={() => setScanning(true)}>
                  <Camera className="size-4" />
                  {t('medicines.scan')}
                </Button>
              </div>
            )
          }
        />
      )}

      {(['Morning', 'Afternoon', 'Evening', 'Night'] as const).map((slot) =>
        grouped[slot]?.length ? (
          <section key={slot} className="mb-6">
            <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">
              {t(`format.${slot.toLowerCase()}` as TranslationKey)}
            </h2>
            <div className="space-y-3">
              {grouped[slot]
                .sort((a, b) => a.chosen_time_min - b.chosen_time_min)
                .map((med) => (
                  <Card key={med.id} padding="md" className="flex items-start gap-4">
                    <StoredPatientPhoto
                      patientId={patientId}
                      path={med.pill_photo_path}
                      alt={t('common.photoOf', { name: med.name })}
                      className="size-11 bg-terracotta/12 text-terracotta"
                      fallback={<Pill className="size-5" />}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-heading text-[17px] font-bold">{med.name}</p>
                      <p className="truncate text-[13.5px] text-body">{med.dose}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge tone="warm" size="sm">
                          <Clock className="size-3" />
                          {formatTimeMinutes(med.chosen_time_min)}
                        </Badge>
                        <Badge tone="neutral" size="sm">
                          {formatDaysOfWeek(med.days_of_week)}
                        </Badge>
                        <Badge tone="outline" size="sm">
                          {t('medicines.anyTime', { start: formatTimeMinutes(med.window_start_min), end: formatTimeMinutes(med.window_end_min) })}
                        </Badge>
                      </div>
                      <StoredPatientVoice
                        patientId={patientId}
                        path={med.voice_path}
                        label={t('medicines.voiceRecordingFor', { name: med.name })}
                      />
                    </div>

                    {canEdit && (
                      <div className="flex flex-none gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t('medicines.edit', { name: med.name })}
                          onClick={() => setDraft(toDraft(med))}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t('medicines.stopTitle', { name: med.name })}
                          onClick={() => setConfirmRemove(med)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
            </div>
          </section>
        ) : null,
      )}

      <Dialog
        open={Boolean(confirmRemove)}
        onOpenChange={(open) => !open && setConfirmRemove(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('medicines.stopTitle', { name: confirmRemove?.name ?? '' })}</DialogTitle>
            <DialogDescription>
              {t('medicines.stopDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmRemove(null)}>
              {t('medicines.keep')}
            </Button>
            <Button
              variant="danger"
              disabled={remove.isPending}
              onClick={() => {
                if (!confirmRemove) return
                remove.mutate(confirmRemove.id, { onSuccess: () => setConfirmRemove(null) })
              }}
            >
              {remove.isPending ? t('medicines.stopping') : t('medicines.stop')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
