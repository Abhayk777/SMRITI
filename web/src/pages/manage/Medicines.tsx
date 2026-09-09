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
import { useMedicines, useMedicineMutation } from '@/features/medicines/useMedicines.ts'
import { describeDays, formatMinutes, partOfDay } from '@/lib/utils.ts'
import { usePatientAccess } from '@/patients/usePatientAccess.ts'
import type { Medication } from '@smriti/shared'

/**
 * Manage → Medicines (frontend.md §8).
 *
 * Medicines are entered by hand through the content-write choke point. The OCR
 * affordance remains visible but disabled until its Edge Function exists.
 *
 * Removing a medicine sets `active: false` rather than deleting the row. The
 * adherence history in `daily_adherence` is built from `reminder_events` that
 * reference it, and a caregiver tidying up an old prescription should not
 * silently rewrite three months of the record they are about to show a doctor.
 */
export default function Medicines() {
  const { patientId, canEdit } = usePatientAccess()
  const medicines = useMedicines(patientId)
  const { save, remove } = useMedicineMutation<MedicineDraft>(patientId)

  const [draft, setDraft] = useState<MedicineDraft | null>(null)
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
        eyebrow="Manage"
        title="Medicines"
        description="A gentle chime at her hour, in her language. If she does not respond, Smriti waits, chimes again, and only then calls you — one call covering everything due, never one per pill."
        actions={
          canEdit &&
          !draft && (
            <>
              <Button variant="outline" disabled title="Prescription scanning is not available yet">
                <Camera className="size-4" />
                Scanning unavailable
              </Button>
              <Button variant="accent" onClick={() => setDraft(emptyMedicine())}>
                <Plus className="size-4" />
                Add a medicine
              </Button>
            </>
          )
        }
      />

      {!canEdit && (
        <Notice className="mb-6">
          You have view-only access to this profile, so medicines cannot be changed here.
        </Notice>
      )}

      {canEdit && !draft && (
        <Notice className="mb-6">
          Prescription scanning is not available yet. Add medicines by hand so every line is
          checked before it reaches the tablet.
        </Notice>
      )}

      {medicines.error && <ErrorState error={medicines.error} className="mb-6" />}

      {draft && (
        <Card padding="lg" className="mb-6">
          <h2 className="mb-5 text-[19px]">
            {draft.id ? `Edit ${draft.name || 'this medicine'}` : 'Add a medicine'}
          </h2>
          <MedicineForm
            patientId={patientId}
            value={draft}
            onChange={setDraft}
            saving={save.isPending}
            submitLabel={draft.id ? 'Save changes' : 'Add this medicine'}
            onCancel={() => setDraft(null)}
            onSubmit={() => save.mutate(draft, { onSuccess: () => setDraft(null) })}
          />
          {save.error && <ErrorState error={save.error} className="mt-4" />}
        </Card>
      )}

      {medicines.isPending && (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      )}

      {!medicines.isPending && rows.length === 0 && !draft && (
        <EmptyState
          icon={<Pill className="size-5" />}
          title="No medicines yet"
          description="Add the ones that matter most first, one at a time."
          action={
            canEdit && (
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={() => setDraft(emptyMedicine())}>
                  <Plus className="size-4" />
                  Add by hand
                </Button>
                <Button variant="outline" disabled title="Prescription scanning is not available yet">
                  <Camera className="size-4" />
                  Scanning unavailable
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
              {slot}
            </h2>
            <div className="space-y-3">
              {grouped[slot]
                .sort((a, b) => a.chosen_time_min - b.chosen_time_min)
                .map((med) => (
                  <Card key={med.id} padding="md" className="flex items-start gap-4">
                    <StoredPatientPhoto
                      patientId={patientId}
                      path={med.pill_photo_path}
                      alt={`Photo of ${med.name}`}
                      className="size-11 bg-terracotta/12 text-terracotta"
                      fallback={<Pill className="size-5" />}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-heading text-[17px] font-bold">{med.name}</p>
                      <p className="truncate text-[13.5px] text-body">{med.dose}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge tone="warm" size="sm">
                          <Clock className="size-3" />
                          {formatMinutes(med.chosen_time_min)}
                        </Badge>
                        <Badge tone="neutral" size="sm">
                          {describeDays(med.days_of_week)}
                        </Badge>
                        <Badge tone="outline" size="sm">
                          Any time {formatMinutes(med.window_start_min)}–
                          {formatMinutes(med.window_end_min)}
                        </Badge>
                      </div>
                      <StoredPatientVoice
                        patientId={patientId}
                        path={med.voice_path}
                        label={`Voice recording for ${med.name}`}
                      />
                    </div>

                    {canEdit && (
                      <div className="flex flex-none gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${med.name}`}
                          onClick={() => setDraft(toDraft(med))}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Stop ${med.name}`}
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
            <DialogTitle>Stop reminding about {confirmRemove?.name}?</DialogTitle>
            <DialogDescription>
              The chime stops and no more calls will be placed about this one. The record of
              doses already taken stays intact, so your reports do not change retrospectively.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmRemove(null)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              disabled={remove.isPending}
              onClick={() => {
                if (!confirmRemove) return
                remove.mutate(confirmRemove.id, { onSuccess: () => setConfirmRemove(null) })
              }}
            >
              {remove.isPending ? 'Stopping…' : 'Stop reminders'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
