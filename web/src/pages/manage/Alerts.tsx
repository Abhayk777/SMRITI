import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { PhoneCall } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { PageHeader } from '@/components/layout/PageHeader.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Card } from '@/components/ui/card.tsx'
import { Field, Input } from '@/components/ui/field.tsx'
import { ErrorState, Notice } from '@/components/ui/feedback.tsx'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import {
  CHANNEL_COPY,
  parseSteps,
  useEscalationConfig,
  useEscalationMutation,
} from '@/features/escalation/useEscalationConfig.ts'
import { usePatientAccess } from '@/patients/usePatientAccess.ts'

/**
 * Manage → Alerts (frontend.md §8).
 *
 * ── The product call this page makes, stated openly ───────────────────────
 * frontend.md §8 leaves it open whether to expose the escalation `steps` JSONB
 * as an editable ladder. **This page shows it read-only** and makes only the
 * contacts editable. The reasoning is in `useEscalationConfig.ts`: the ladder
 * decides how long a missed dose waits before it becomes a phone call to a
 * person, and a caregiver who stretches step 2 to three hours because the calls
 * felt intrusive has disabled the safety net without any part of the interface
 * telling them so. Contacts are the thing that genuinely differs between
 * families; the timings are a clinical default.
 *
 * Rendering the ladder as plain sentences rather than hiding it is the other
 * half of that decision — a caregiver is entitled to know exactly what Smriti
 * will do and when, even where they cannot change it.
 */

const schema = z.object({
  primary_name: z.string().trim().min(1, 'Who should Smriti call first?'),
  primary_phone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, 'Include the country code, like +91 98765 43210'),
  secondary_name: z.string().trim().optional(),
  secondary_phone: z
    .string()
    .trim()
    .regex(/^(\+[1-9]\d{7,14})?$/, 'Include the country code, or leave it empty')
    .optional(),
})

type Values = z.input<typeof schema>

export default function Alerts() {
  const { patientId, canEdit, patient } = usePatientAccess()
  const config = useEscalationConfig(patientId)
  const { save } = useEscalationMutation(patientId)

  const form = useForm<Values>({
    resolver: zodResolver(schema),
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

  const steps = parseSteps(config.data?.steps ?? null)
  const firstName = patient?.display_name.split(' ')[0] ?? 'the patient'

  return (
    <>
      <PageHeader
        eyebrow="Manage"
        title="If a dose is missed"
        description={`What Smriti does when ${firstName} does not respond to a reminder. It waits before it escalates, and one call covers everything due — never one call per pill.`}
      />

      {config.error && <ErrorState error={config.error} className="mb-6" />}

      {/* The ladder, read-only. */}
      <Card tone="sand" padding="lg" className="mb-6">
        <h2 className="text-[19px]">What happens, in order</h2>
        {config.isPending ? (
          <div className="mt-4 space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-6" />
            ))}
          </div>
        ) : steps.length === 0 ? (
          <p className="mt-3 text-[14.5px] leading-relaxed text-body">
            No ladder is configured for this profile yet. Smriti will still chime on the
            tablet; it will not place calls until one is set up.
          </p>
        ) : (
          <ol className="mt-4 space-y-3">
            {steps.map((step) => (
              <li key={step.step} className="flex items-start gap-3 text-[15px] leading-relaxed">
                <span className="numeral w-16 flex-none text-muted">
                  {step.minutes === 0 ? 'On time' : `+${step.minutes} min`}
                </span>
                <span>
                  {step.minutes === 0
                    ? 'The tablet chimes, in their language.'
                    : `If there is still no response, Smriti sends ${
                        CHANNEL_COPY[step.channel] ?? step.channel
                      }.`}
                </span>
              </li>
            ))}
          </ol>
        )}

        <Notice className="mt-5">
          These timings are set by Smriti and cannot be changed here. They are what the
          missed-dose safety net is built on — stretching them out would quietly switch it
          off. If they genuinely do not suit them, get in touch and we will look at it with
          you.
        </Notice>
      </Card>

      {/* Contacts, editable. */}
      <Card padding="lg">
        <div className="flex items-start gap-3">
          <span className="grid size-10 flex-none place-items-center rounded-full bg-terracotta/12 text-terracotta">
            <PhoneCall className="size-5" />
          </span>
          <div>
            <h2 className="text-[19px]">Who Smriti calls</h2>
            <p className="mt-1 max-w-[54ch] text-[14.5px] leading-relaxed text-body">
              Real phone calls, placed only after the tablet has already tried twice. Keep
              these current — an unanswered number is the same as no safety net.
            </p>
          </div>
        </div>

        {!canEdit && (
          <Notice className="mt-5">
            You have view-only access, so these contacts cannot be changed here.
          </Notice>
        )}

        <form
          className="mt-6 space-y-1"
          noValidate
          onSubmit={form.handleSubmit((values) =>
            save.mutate({
              primary_name: values.primary_name,
              primary_phone: values.primary_phone,
              secondary_name: values.secondary_name || null,
              secondary_phone: values.secondary_phone || null,
            }),
          )}
        >
          <div className="rounded-card bg-clay p-5">
            <p className="font-heading text-[16px] font-bold">First call</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                label="Name"
                htmlFor="p-name"
                required
                error={form.formState.errors.primary_name?.message}
              >
                <Input id="p-name" disabled={!canEdit} {...form.register('primary_name')} />
              </Field>
              <Field
                label="Phone"
                htmlFor="p-phone"
                required
                error={form.formState.errors.primary_phone?.message}
              >
                <Input
                  id="p-phone"
                  type="tel"
                  disabled={!canEdit}
                  {...form.register('primary_phone')}
                />
              </Field>
            </div>
          </div>

          <div className="mt-3 rounded-card bg-sand/50 p-5">
            <p className="font-heading text-[16px] font-bold">If that call is not answered</p>
            <p className="mt-1 text-[13.5px] text-body">
              Ideally someone who lives close enough to walk over.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Name" htmlFor="s-name">
                <Input id="s-name" disabled={!canEdit} {...form.register('secondary_name')} />
              </Field>
              <Field
                label="Phone"
                htmlFor="s-phone"
                error={form.formState.errors.secondary_phone?.message}
              >
                <Input
                  id="s-phone"
                  type="tel"
                  disabled={!canEdit}
                  {...form.register('secondary_phone')}
                />
              </Field>
            </div>
          </div>

          {save.error && <ErrorState error={save.error} className="mt-4" />}

          {canEdit && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button type="submit" variant="accent" disabled={save.isPending}>
                {save.isPending ? 'Saving…' : 'Save contacts'}
              </Button>
              {save.isSuccess && !form.formState.isDirty && (
                <span className="text-[13.5px] font-semibold text-sage">Saved.</span>
              )}
            </div>
          )}
        </form>
      </Card>
    </>
  )
}
