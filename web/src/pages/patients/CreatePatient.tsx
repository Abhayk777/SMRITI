import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Camera, Check, Plus, Trash2 } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { Logomark } from '@/components/brand/Logomark.tsx'
import { Wordmark } from '@/components/brand/Wordmark.tsx'
import { AppBackdrop } from '@/components/layout/AppBackdrop.tsx'
import { usePatientMinutes } from '@/components/layout/sky.ts'
import { VoiceRecorder } from '@/components/media/VoiceRecorder.tsx'
import { GamosaBand } from '@/components/ner/GamosaBand.tsx'
import { SetupCompleteLoader } from '@/components/onboarding/SetupCompleteLoader.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Card } from '@/components/ui/card.tsx'
import { Field, Input, Select } from '@/components/ui/field.tsx'
import { EmptyState, ErrorState, Notice } from '@/components/ui/feedback.tsx'
import { useTranslation } from '@/i18n/index.ts'
import { PairingPanel } from '@/features/pairing/PairingPanel.tsx'
import { useEscalationConfig } from '@/features/escalation/useEscalationConfig.ts'
import {
  MedicineForm,
  emptyMedicine,
  type MedicineDraft,
} from '@/features/medicines/MedicineForm.tsx'
import { OcrReview } from '@/features/medicines/OcrReview.tsx'
import { useMedicines, useMedicineBatchMutation } from '@/features/medicines/useMedicines.ts'
import { PersonForm, emptyPerson, type PersonDraft } from '@/features/people/PersonForm.tsx'
import { usePeople } from '@/features/people/usePeople.ts'
import {
  RoutineForm,
  emptyRoutine,
  type RoutineDraft,
} from '@/features/routine/RoutineForm.tsx'
import { useRoutine } from '@/features/routine/useRoutine.ts'
import { useContentMutation } from '@/hooks/useContentMutation.ts'
import * as db from '@/lib/db.ts'
import {
  languageByCode,
  SUPPORTED_LANGUAGE_CODES,
  SUPPORTED_LANGUAGES,
} from '@/lib/languages.ts'
import { qk } from '@/lib/queryKeys.ts'
import { cn } from '@/lib/utils.ts'

/**
 * Create Patient, plus the setup wizard (frontend.md §8, §16 step 3).
 *
 * ── Why it writes incrementally ───────────────────────────────────────────
 * Every step commits as it is completed rather than batching into one submit at
 * the end. This is a long form: photographs of eight relatives, voice
 * recordings, a medicine schedule. Setting it up takes an evening, gets
 * interrupted, and is often done by someone tired. Losing all of it to a closed
 * tab would mean they simply do not come back.
 *
 * The created patient's id lives in the URL (`?patient=…`) from step 1 onward,
 * so a refresh, a phone call, or a browser crash resumes exactly where it left
 * off.
 *
 * ── The ordering rule that matters ────────────────────────────────────────
 * Media is uploaded and confirmed *before* the row referencing it is written
 * (§15 rule 5). That is enforced structurally: `PhotoPicker` and
 * `VoiceRecorder` only hand back a path once the object is committed, and the
 * forms cannot submit without one. A `people` row pointing at an unfinished
 * upload does not degrade into a missing photo — it aborts the tablet's entire
 * content pull.
 */

const createBasicsSchema = (messages: { name: string; age: string; schooling: string; contact: string; phone: string }) => z.object({
  display_name: z.string().trim().min(1, messages.name),
  age: z.coerce.number().int().min(30, messages.age).max(120, messages.age),
  education_years: z.coerce
    .number()
    .int()
    .min(0, messages.schooling)
    .max(25, messages.schooling),
  lang_code: z.enum(SUPPORTED_LANGUAGE_CODES),
  timezone: z.string().min(1),
  primary_name: z.string().trim().min(1, messages.contact),
  primary_phone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, messages.phone),
})

type BasicsValues = z.input<ReturnType<typeof createBasicsSchema>>

const STEPS = [
  { key: 'basics' }, { key: 'people' }, { key: 'voices' }, { key: 'medicines' },
  { key: 'routine' }, { key: 'alerts' }, { key: 'pairing' },
] as const

const setupStepKey = (patientId: string) => `smriti.setup-step.${patientId}`

function savedSetupStep(patientId: string): number | null {
  try {
    const value = Number(window.localStorage.getItem(setupStepKey(patientId)))
    return Number.isInteger(value) && value >= 1 && value < STEPS.length ? value : null
  } catch {
    return null
  }
}

export default function CreatePatient() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  // The profile being set up has no timezone yet, so the sky follows yours.
  const minutes = usePatientMinutes(undefined)

  const patientId = params.get('patient')
  const [step, setStep] = useState(() => (patientId ? (savedSetupStep(patientId) ?? 1) : 0))
  const [finishing, setFinishing] = useState(false)
  const [patientName, setPatientName] = useState(params.get('name') ?? '')

  const goTo = (next: number) => {
    const bounded = Math.max(0, Math.min(STEPS.length - 1, next))
    setStep(bounded)
    if (patientId && bounded > 0) {
      try {
        window.localStorage.setItem(setupStepKey(patientId), String(bounded))
      } catch {
        // The wizard still works in private browsing; only resume is unavailable.
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="relative isolate min-h-dvh bg-ivory">
      <AppBackdrop minutes={minutes} />
      {finishing && (
        <SetupCompleteLoader
          caption={patientName ? t('setup.pairing.loadingNamed', { name: patientName }) : t('setup.pairing.loading')}
          onDone={() => navigate(`/p/${patientId}/dashboard`, { replace: true })}
        />
      )}

      <header className="bg-ivory">
        <div className="mx-auto flex max-w-[820px] items-center gap-3 px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5 text-terracotta">
            <Logomark size={24} decorative />
            <Wordmark size={18} color="var(--color-ink)" />
          </Link>
          <span className="ml-auto text-[13px] text-muted">
            {t('setup.step', { current: step + 1, total: STEPS.length })}
          </span>
        </div>
        <GamosaBand variant="rule" size={4} />
      </header>

      {/* Progress. Steps already committed are shown as done, because they are:
          nothing here is waiting on a final submit. */}
      <div className="mx-auto max-w-[820px] px-5 pt-6 sm:px-8">
        <ol className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <li key={s.key} className="flex-1">
              <button
                type="button"
                disabled={!patientId && i > 0}
                onClick={() => goTo(i)}
                className="w-full text-left disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span
                  className={cn(
                    'block h-1.5 rounded-pill transition-colors',
                    i < step ? 'bg-sage' : i === step ? 'bg-risa' : 'bg-sand',
                  )}
                />
                <span
                  className={cn(
                    'mt-2 block whitespace-nowrap text-[12px] font-semibold',
                    i === step ? 'text-ink' : 'text-muted',
                  )}
                >
                  {t(`setup.steps.${s.key}` as const)}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <main className="mx-auto max-w-[820px] px-5 py-8 sm:px-8">
        {step === 0 && (
          <BasicsStep
            onCreated={(id, name) => {
              setParams({ patient: id, name }, { replace: true })
              setPatientName(name)
              try {
                window.localStorage.setItem(setupStepKey(id), '1')
              } catch {
                // See `goTo`: persistence is helpful, not required for a valid setup.
              }
              void queryClient.invalidateQueries({ queryKey: qk.overview() })
              goTo(1)
            }}
          />
        )}

        {step > 0 && !patientId && (
          <Notice tone="warn">
            {t('setup.profileNotCreated')}{' '}
            <button type="button" onClick={() => goTo(0)} className="font-semibold underline">
              {t('setup.firstStep')}
            </button>
          </Notice>
        )}

        {step === 1 && patientId && <PeopleStep patientId={patientId} onNext={() => goTo(2)} />}
        {step === 2 && patientId && <VoicesStep patientId={patientId} onNext={() => goTo(3)} />}
        {step === 3 && patientId && (
          <MedicinesStep patientId={patientId} onNext={() => goTo(4)} />
        )}
        {step === 4 && patientId && <RoutineStep patientId={patientId} onNext={() => goTo(5)} />}
        {step === 5 && patientId && <AlertsStep patientId={patientId} onNext={() => goTo(6)} />}
        {step === 6 && patientId && (
          <PairingStep
            patientId={patientId}
            patientName={patientName}
            onFinish={() => setFinishing(true)}
          />
        )}

        {step > 0 && (
          <div className="mt-8 flex items-center justify-between border-t border-ink/[0.08] pt-5">
            <Button variant="ghost" onClick={() => goTo(step - 1)}>
              <ArrowLeft className="size-4" />
              {t('setup.back')}
            </Button>
            {step < STEPS.length - 1 && (
              <Button variant="outline" onClick={() => goTo(step + 1)}>
                {t('setup.skip')}
                <ArrowRight className="size-4" />
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

/* ── Step 1: the `create_patient` RPC ─────────────────────────────────────
   One call creates the patient row, the caller's caregiver membership and the
   default escalation config, atomically. Nothing else in the wizard can run
   until it has succeeded.
   ──────────────────────────────────────────────────────────────────────── */

function BasicsStep({ onCreated }: { onCreated: (id: string, name: string) => void }) {
  const { t } = useTranslation()
  const basicsSchema = createBasicsSchema({
    name: t('setup.basics.nameError'), age: t('setup.basics.ageError'), schooling: t('setup.basics.schoolingError'),
    contact: t('setup.basics.contactError'), phone: t('setup.basics.phoneError'),
  })
  const form = useForm<BasicsValues>({
    resolver: zodResolver(basicsSchema),
    defaultValues: {
      display_name: '',
      age: 75,
      education_years: 10,
      lang_code: 'hi',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
      primary_name: '',
      primary_phone: '',
    },
  })

  const create = useMutation({
    mutationFn: (values: z.output<typeof basicsSchema>) =>
      db.unwrap(
        db.createPatient({
          p_name: values.display_name,
          p_age: values.age,
          p_education: values.education_years,
          p_lang: values.lang_code,
          p_timezone: values.timezone,
          p_primary_name: values.primary_name,
          p_primary_phone: values.primary_phone,
        }),
      ),
  })
  const selectedLanguage = useWatch({ control: form.control, name: 'lang_code' })

  return (
    <>
      <h1 className="text-[clamp(26px,3.4vw,34px)]">{t('setup.basics.title')}</h1>
      <p className="mt-2 max-w-[54ch] text-[15.5px] leading-relaxed text-body">
        {t('setup.basics.description')}
      </p>

      <form
        className="mt-7 space-y-1"
        noValidate
        onSubmit={form.handleSubmit((values) => {
          const parsed = basicsSchema.parse(values)
          create.mutate(parsed, {
            onSuccess: (id) => onCreated(id as string, parsed.display_name),
          })
        })}
      >
        <Field
          label={t('setup.basics.name')}
          htmlFor="display_name"
          required
          hint={t('setup.basics.nameHint')}
          error={form.formState.errors.display_name?.message}
        >
          <Input id="display_name" placeholder={t('setup.basics.namePlaceholder')} {...form.register('display_name')} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t('setup.basics.age')} htmlFor="age" required error={form.formState.errors.age?.message}>
            <Input id="age" type="number" min={30} max={120} {...form.register('age')} />
          </Field>

          <Field
            label={t('setup.basics.schooling')}
            htmlFor="education_years"
            required
            error={form.formState.errors.education_years?.message}
          >
            <Input
              id="education_years"
              type="number"
              min={0}
              max={25}
              {...form.register('education_years')}
            />
          </Field>

          <Field label={t('setup.basics.language')} htmlFor="lang_code" required>
            <Select id="lang_code" {...form.register('lang_code')}>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </Select>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
              {languageByCode(selectedLanguage)?.delivery}
            </p>
          </Field>
        </div>

        <Field
          label={t('setup.basics.timezone')}
          htmlFor="timezone"
          hint={t('setup.basics.timezoneHint')}
          error={form.formState.errors.timezone?.message}
        >
          <Input id="timezone" {...form.register('timezone')} />
        </Field>

        <div className="mt-2 rounded-card bg-sand/50 p-5">
          <p className="font-heading text-[17px] font-bold">
            {t('setup.basics.missedDoseTitle')}
          </p>
          <p className="mt-1 max-w-[52ch] text-[13.5px] leading-relaxed text-body">
            {t('setup.basics.missedDoseDescription')}
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label={t('setup.alerts.name')}
              htmlFor="primary_name"
              required
              error={form.formState.errors.primary_name?.message}
            >
              <Input id="primary_name" placeholder={t('setup.basics.contactPlaceholder')} {...form.register('primary_name')} />
            </Field>
            <Field
              label={t('setup.basics.phone')}
              htmlFor="primary_phone"
              required
              error={form.formState.errors.primary_phone?.message}
            >
              <Input
                id="primary_phone"
                type="tel"
                placeholder="+91 98765 43210"
                {...form.register('primary_phone')}
              />
            </Field>
          </div>
        </div>

        {create.error && <ErrorState error={create.error} className="mt-4" />}

        <Button
          type="submit"
          variant="accent"
          size="lg"
          className="mt-5"
          disabled={create.isPending}
        >
          {create.isPending ? t('setup.basics.creating') : t('setup.basics.create')}
          <ArrowRight className="size-4" />
        </Button>
      </form>
    </>
  )
}

/* ── Step 2: people ───────────────────────────────────────────────────── */

function PeopleStep({ patientId, onNext }: { patientId: string; onNext: () => void }) {
  const { t } = useTranslation()
  const people = usePeople(patientId)
  const { save, remove } = useContentMutation<PersonDraft>('people', patientId)
  const [draft, setDraft] = useState<PersonDraft | null>(null)

  const rows = people.data ?? []

  return (
    <>
      <h1 className="text-[clamp(26px,3.4vw,34px)]">{t('setup.people.title')}</h1>
      <p className="mt-2 max-w-[54ch] text-[15.5px] leading-relaxed text-body">
        {t('setup.people.description')}
      </p>

      <div className="mt-7 space-y-3">
        {rows.map((person) => (
          <Card key={person.id} padding="sm" className="flex items-center gap-4">
            <span className="grid size-11 flex-none place-items-center rounded-full bg-terracotta/12 font-heading font-bold text-terracotta">
              {person.name[0]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">
                {person.name}
                {person.is_deceased && (
                  <Badge tone="neutral" size="sm" className="ml-2">
                    {t('people.passedAway')}
                  </Badge>
                )}
              </p>
              <p className="truncate text-[13px] text-muted">{person.relationship}</p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('setup.people.remove', { name: person.name })}
              onClick={() => remove.mutate(person.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </Card>
        ))}

        {rows.length === 0 && !draft && (
          <EmptyState
            title={t('people.nobodyYet')}
            description={t('people.emptyDescription', { name: 'them' })}
          />
        )}
      </div>

      {draft ? (
        <Card padding="lg" className="mt-4">
          <PersonForm
            patientId={patientId}
            value={draft}
            onChange={setDraft}
            saving={save.isPending}
            submitLabel={t('people.addSomeone')}
            onCancel={() => setDraft(null)}
            onSubmit={() =>
              save.mutate(draft, {
                onSuccess: () => setDraft(null),
              })
            }
          />
        </Card>
      ) : (
        <Button variant="outline" className="mt-4" onClick={() => setDraft(emptyPerson(rows.length))}>
          <Plus className="size-4" />
          {rows.length === 0 ? t('setup.people.add') : t('setup.people.addAnother')}
        </Button>
      )}

      <Button variant="accent" size="lg" className="mt-8 w-full sm:w-auto" onClick={onNext}>
        {rows.length === 0 ? t('setup.people.skip') : t('setup.people.next')}
        <ArrowRight className="size-4" />
      </Button>
    </>
  )
}

/* ── Step 3: voices ───────────────────────────────────────────────────── */

function VoicesStep({ patientId, onNext }: { patientId: string; onNext: () => void }) {
  const { t } = useTranslation()
  const people = usePeople(patientId)
  const { save } = useContentMutation<PersonDraft>('people', patientId)
  const rows = people.data ?? []

  return (
    <>
      <h1 className="text-[clamp(26px,3.4vw,34px)]">{t('setup.voices.title')}</h1>
      <p className="mt-2 max-w-[54ch] text-[15.5px] leading-relaxed text-body">
        {t('setup.voices.description')}
      </p>

      {rows.length === 0 ? (
        <EmptyState
          className="mt-7"
          title={t('setup.voices.noneTitle')}
          description={t('setup.voices.noneDescription')}
        />
      ) : (
        <div className="mt-7 space-y-3">
          {rows.map((person) => (
            <Card key={person.id} padding="md">
              <div className="flex items-center gap-3">
                <span className="grid size-10 flex-none place-items-center rounded-full bg-terracotta/12 font-heading font-bold text-terracotta">
                  {person.name[0]}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{person.name}</p>
                  <p className="truncate text-[13px] text-muted">{person.relationship}</p>
                </div>
                {person.voice_path && (
                  <Badge tone="sage" size="sm" className="ml-auto">
                    <Check className="size-3" />
                    {t('recorder.saved')}
                  </Badge>
                )}
              </div>
              <VoiceRecorder
                className="mt-4"
                patientId={patientId}
                value={person.voice_path}
                onChange={(path) => save.mutate({ id: person.id, voice_path: path })}
                prompt={t('setup.voices.prompt', { name: person.name, relationship: person.relationship.toLowerCase() })}
              />
            </Card>
          ))}
        </div>
      )}

      <Button variant="accent" size="lg" className="mt-8 w-full sm:w-auto" onClick={onNext}>
        {t('setup.voices.next')}
        <ArrowRight className="size-4" />
      </Button>
    </>
  )
}

/* ── Step 4: medicines ────────────────────────────────────────────────── */

function MedicinesStep({ patientId, onNext }: { patientId: string; onNext: () => void }) {
  const { formatDaysOfWeek, formatTimeMinutes, t } = useTranslation()
  const medicines = useMedicines(patientId)
  const { save, remove } = useContentMutation<MedicineDraft>('medications', patientId)
  const saveScanned = useMedicineBatchMutation(patientId)
  const [draft, setDraft] = useState<MedicineDraft | null>(null)
  const [scanning, setScanning] = useState(false)

  const rows = medicines.data ?? []

  return (
    <>
      <h1 className="text-[clamp(26px,3.4vw,34px)]">{t('setup.medicines.title')}</h1>
      <p className="mt-2 max-w-[54ch] text-[15.5px] leading-relaxed text-body">
        {t('setup.medicines.description')}
      </p>

      <Notice className="mt-5">
        {t('setup.medicines.scanHint')}
      </Notice>

      {scanning && (
        <div className="mt-6">
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

      <div className="mt-6 space-y-3">
        {rows.map((med) => (
          <Card key={med.id} padding="sm" className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{med.name}</p>
              <p className="truncate text-[13px] text-muted">
                {med.dose} · {formatTimeMinutes(med.chosen_time_min)} · {formatDaysOfWeek(med.days_of_week)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('setup.medicines.remove', { name: med.name })}
              onClick={() => remove.mutate(med.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </Card>
        ))}

        {rows.length === 0 && !draft && !scanning && (
          <EmptyState
            title={t('medicines.noMedicines')}
            description={t('medicines.noMedicinesDescription')}
          />
        )}
      </div>

      {draft ? (
        <Card padding="lg" className="mt-4">
          <MedicineForm
            patientId={patientId}
            value={draft}
            onChange={setDraft}
            saving={save.isPending}
            submitLabel={t('medicines.add')}
            onCancel={() => setDraft(null)}
            onSubmit={() => save.mutate(draft, { onSuccess: () => setDraft(null) })}
          />
        </Card>
      ) : !scanning && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setScanning(true)}>
            <Camera className="size-4" />
            {t('medicines.scan')}
          </Button>
          <Button variant="outline" onClick={() => setDraft(emptyMedicine())}>
            <Plus className="size-4" />
            {rows.length === 0 ? t('setup.medicines.add') : t('setup.medicines.addAnother')}
          </Button>
        </div>
      )}

      <Button variant="accent" size="lg" className="mt-8 w-full sm:w-auto" onClick={onNext}>
        {t('setup.medicines.next')}
        <ArrowRight className="size-4" />
      </Button>
    </>
  )
}

/* ── Step 5: routine ──────────────────────────────────────────────────── */

function RoutineStep({ patientId, onNext }: { patientId: string; onNext: () => void }) {
  const { formatTimeMinutes, t } = useTranslation()
  const routine = useRoutine(patientId)
  const { save, remove } = useContentMutation<RoutineDraft>('routine_items', patientId)
  const [draft, setDraft] = useState<RoutineDraft | null>(null)

  const rows = routine.data ?? []

  return (
    <>
      <h1 className="text-[clamp(26px,3.4vw,34px)]">{t('setup.routine.title')}</h1>
      <p className="mt-2 max-w-[54ch] text-[15.5px] leading-relaxed text-body">
        {t('setup.routine.description')}
      </p>

      <div className="mt-7 space-y-3">
        {rows.map((item) => (
          <Card key={item.id} padding="sm" className="flex items-center gap-4">
            <span className="numeral w-20 flex-none text-[15px] text-sage">
              {formatTimeMinutes(item.time_min)}
            </span>
            <p className="min-w-0 flex-1 truncate font-semibold">{item.label_key}</p>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('setup.routine.remove', { name: item.label_key })}
              onClick={() => remove.mutate(item.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </Card>
        ))}

        {rows.length === 0 && !draft && (
          <EmptyState
            title={t('routine.emptyTitle')}
            description={t('routine.emptyDescription')}
          />
        )}
      </div>

      {draft ? (
        <Card padding="lg" className="mt-4">
          <RoutineForm
            value={draft}
            onChange={setDraft}
            saving={save.isPending}
            submitLabel={t('routine.add')}
            onCancel={() => setDraft(null)}
            onSubmit={() => save.mutate(draft, { onSuccess: () => setDraft(null) })}
          />
        </Card>
      ) : (
        <Button variant="outline" className="mt-4" onClick={() => setDraft(emptyRoutine())}>
          <Plus className="size-4" />
          {rows.length === 0 ? t('setup.routine.add') : t('setup.routine.addAnother')}
        </Button>
      )}

      <Button variant="accent" size="lg" className="mt-8 w-full sm:w-auto" onClick={onNext}>
        {t('setup.routine.next')}
        <ArrowRight className="size-4" />
      </Button>
    </>
  )
}

/* ── Step 6: escalation contacts ──────────────────────────────────────── */

const createContactsSchema = (messages: { primaryName: string; primaryPhone: string; secondaryPhone: string }) => z.object({
  primary_name: z.string().trim().min(1, messages.primaryName),
  primary_phone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, messages.primaryPhone),
  secondary_name: z.string().trim().optional(),
  secondary_phone: z
    .string()
    .trim()
    .regex(/^(\+[1-9]\d{7,14})?$/, messages.secondaryPhone)
    .optional(),
})

function AlertsStep({ patientId, onNext }: { patientId: string; onNext: () => void }) {
  const { t } = useTranslation()
  const contactsSchema = createContactsSchema({ primaryName: t('setup.alerts.primaryNameError'), primaryPhone: t('setup.alerts.primaryPhoneError'), secondaryPhone: t('setup.alerts.secondaryPhoneError') })
  const { save } = useContentMutation<Record<string, unknown>>('escalation_config', patientId)
  const config = useEscalationConfig(patientId)

  const form = useForm<z.input<typeof contactsSchema>>({
    resolver: zodResolver(contactsSchema),
    defaultValues: {
      primary_name: '',
      primary_phone: '',
      secondary_name: '',
      secondary_phone: '',
    },
  })

  const { reset } = form
  useEffect(() => {
    if (!config.data) return
    reset({
      primary_name: config.data.primary_name ?? '',
      primary_phone: config.data.primary_phone ?? '',
      secondary_name: config.data.secondary_name ?? '',
      secondary_phone: config.data.secondary_phone ?? '',
    })
  }, [config.data, reset])

  return (
    <>
      <h1 className="text-[clamp(26px,3.4vw,34px)]">{t('setup.alerts.title')}</h1>
      <p className="mt-2 max-w-[54ch] text-[15.5px] leading-relaxed text-body">
        {t('setup.alerts.description')}
      </p>

      <form
        className="mt-7 space-y-1"
        noValidate
        onSubmit={form.handleSubmit((values) => {
          save.mutate(
            {
              primary_name: values.primary_name,
              primary_phone: values.primary_phone,
              secondary_name: values.secondary_name || null,
              secondary_phone: values.secondary_phone || null,
            },
            { onSuccess: onNext },
          )
        })}
      >
        {config.error && <ErrorState error={config.error} className="mb-4" />}
        <div className="rounded-card bg-clay p-5">
          <p className="font-heading text-[17px] font-bold">{t('setup.alerts.firstCall')}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label={t('setup.alerts.name')}
              htmlFor="alert-p-name"
              required
              error={form.formState.errors.primary_name?.message}
            >
              <Input id="alert-p-name" {...form.register('primary_name')} />
            </Field>
            <Field
              label={t('setup.alerts.phone')}
              htmlFor="alert-p-phone"
              required
              error={form.formState.errors.primary_phone?.message}
            >
              <Input id="alert-p-phone" type="tel" {...form.register('primary_phone')} />
            </Field>
          </div>
        </div>

        <div className="mt-3 rounded-card bg-sand/50 p-5">
          <p className="font-heading text-[17px] font-bold">{t('setup.alerts.secondCall')}</p>
          <p className="mt-1 text-[13.5px] text-body">
            {t('setup.alerts.secondCallHint')}
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label={t('setup.alerts.name')} htmlFor="alert-s-name">
              <Input id="alert-s-name" {...form.register('secondary_name')} />
            </Field>
            <Field
              label={t('setup.alerts.phone')}
              htmlFor="alert-s-phone"
              error={form.formState.errors.secondary_phone?.message}
            >
              <Input id="alert-s-phone" type="tel" {...form.register('secondary_phone')} />
            </Field>
          </div>
        </div>

        {save.error && <ErrorState error={save.error} className="mt-4" />}

        <Button
          type="submit"
          variant="accent"
          size="lg"
          className="mt-5"
          disabled={save.isPending}
        >
          {save.isPending ? t('common.saving') : t('setup.alerts.next')}
          <ArrowRight className="size-4" />
        </Button>
      </form>
    </>
  )
}

/* ── Step 7: pairing, then the loader ─────────────────────────────────── */

function PairingStep({
  patientId,
  patientName,
  onFinish,
}: {
  patientId: string
  patientName: string
  onFinish: () => void
}) {
  const { t } = useTranslation()
  return (
    <>
      <h1 className="text-[clamp(26px,3.4vw,34px)]">{t('setup.pairing.title')}</h1>
      <p className="mt-2 max-w-[54ch] text-[15.5px] leading-relaxed text-body">
        {t('setup.pairing.description')}
      </p>

      <div className="mt-7">
        <PairingPanel patientId={patientId} patientName={patientName || t('setup.pairing.fallbackName')} />
      </div>

      <Notice className="mt-5">
        {t('setup.pairing.noTablet')}{' '}
        <strong>{t('setup.pairing.manageTablet')}</strong>.
      </Notice>

      <Button variant="accent" size="lg" className="mt-8 w-full sm:w-auto" onClick={onFinish}>
        <Check className="size-4" />
        {t('setup.pairing.finish')}
      </Button>
    </>
  )
}
