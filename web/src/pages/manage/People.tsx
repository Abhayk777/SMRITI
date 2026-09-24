import { useState } from 'react'
import { Pencil, Plus, Trash2, Users } from 'lucide-react'

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
import { useTranslation } from '@/i18n/index.ts'
import {
  PersonForm,
  emptyPerson,
  toPersonDraft,
  type PersonDraft,
} from '@/features/people/PersonForm.tsx'
import { usePeople, usePeopleMutation } from '@/features/people/usePeople.ts'
import { usePatientAccess } from '@/patients/usePatientAccess.ts'
import type { Person } from '@smriti/shared'

/**
 * Manage → People (frontend.md §8).
 *
 * Every write goes through `useContentMutation('people', id)` - never a bespoke
 * inline mutation (§15 rule 3) - so the server-side `content_version` bump
 * always lands with a matching cache invalidation and the Tablet page never
 * reports a version the device has already moved past.
 *
 * A `family_viewer` gets this page with no write affordances at all: no add
 * button, no edit, no remove (§15 rule 8). RLS refuses those writes regardless;
 * not rendering them is what stops a family member from discovering that by
 * being told off by the database.
 */
export default function People() {
  const { patientId, canEdit, patient } = usePatientAccess()
  const { t } = useTranslation()
  const people = usePeople(patientId)
  const { save, remove } = usePeopleMutation<PersonDraft>(patientId)

  const [draft, setDraft] = useState<PersonDraft | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<Person | null>(null)

  const rows = people.data ?? []
  const firstName = patient?.display_name.split(' ')[0] ?? 'the patient'

  return (
    <>
      <PageHeader
        eyebrow={t('people.eyebrow')}
        title={t('people.title')}
        description={t('people.description', { name: firstName })}
        actions={
          canEdit &&
          !draft && (
            <Button variant="accent" onClick={() => setDraft(emptyPerson(rows.length))}>
              <Plus className="size-4" />
              {t('people.addSomeone')}
            </Button>
          )
        }
      />

      {!canEdit && (
        <Notice className="mb-6">
          {t('people.viewOnly')}
        </Notice>
      )}

      {people.error && <ErrorState error={people.error} className="mb-6" />}

      {draft && (
        <Card padding="lg" className="mb-6">
          <h2 className="mb-5 text-[19px]">
            {draft.id ? t('people.editThisPerson', { name: draft.name || t('people.title').toLowerCase() }) : t('people.addSomeone')}
          </h2>
          <PersonForm
            patientId={patientId}
            value={draft}
            onChange={setDraft}
            saving={save.isPending}
            submitLabel={draft.id ? t('common.save') : t('people.addSomeone')}
            onCancel={() => setDraft(null)}
            onSubmit={() => save.mutate(draft, { onSuccess: () => setDraft(null) })}
          />
          {save.error && <ErrorState error={save.error} className="mt-4" />}
        </Card>
      )}

      <div className="space-y-3">
        {people.isPending && [0, 1, 2].map((i) => <SkeletonRow key={i} />)}

        {!people.isPending && rows.length === 0 && !draft && (
          <EmptyState
            icon={<Users className="size-5" />}
            title={t('people.nobodyYet')}
            description={t('people.emptyDescription', { name: firstName })}
            action={
              canEdit && (
                <Button onClick={() => setDraft(emptyPerson(0))}>
                  <Plus className="size-4" />
                  {t('people.addFirstPerson')}
                </Button>
              )
            }
          />
        )}

        {rows.map((person) => (
          <Card key={person.id} padding="md" className="flex items-center gap-4">
            <StoredPatientPhoto
              patientId={patientId}
              path={person.photo_path}
              alt={person.name}
              className="size-12 bg-terracotta/12 font-heading text-lg font-bold text-terracotta"
              fallback={person.name[0]}
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-heading text-[17px] font-bold">{person.name}</p>
                {person.is_deceased && (
                  <Badge tone="neutral" size="sm">
                    {t('people.passedAway')}
                  </Badge>
                )}
                {person.voice_path && (
                  <Badge tone="sage" size="sm">
                    {t('people.voiceRecorded')}
                  </Badge>
                )}
              </div>
              <p className="truncate text-[13.5px] text-muted">{person.relationship}</p>
              {person.memory_prompt && (
                <p className="mt-1 line-clamp-2 text-[13.5px] leading-snug text-body">
                  {person.memory_prompt}
                </p>
              )}
              <StoredPatientVoice
                patientId={patientId}
                path={person.voice_path}
                label={t('people.voiceRecordingFor', { name: person.name })}
              />
            </div>

            {canEdit && (
              <div className="flex flex-none gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('people.editPerson', { name: person.name })}
                  onClick={() => setDraft(toPersonDraft(person))}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('people.removeTitle', { name: person.name })}
                  onClick={() => setConfirmRemove(person)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Dialog
        open={Boolean(confirmRemove)}
        onOpenChange={(open) => !open && setConfirmRemove(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('people.removeTitle', { name: confirmRemove?.name ?? '' })}</DialogTitle>
            <DialogDescription>
              {t('people.removeDescription', { patient: firstName })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmRemove(null)}>
              {t('people.keep')}
            </Button>
            <Button
              variant="danger"
              disabled={remove.isPending}
              onClick={() => {
                if (!confirmRemove) return
                remove.mutate(confirmRemove.id, { onSuccess: () => setConfirmRemove(null) })
              }}
            >
              {remove.isPending ? t('people.removing') : t('people.remove')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
