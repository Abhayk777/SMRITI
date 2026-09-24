import { useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, ShieldCheck, UserPlus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { useAuth } from '@/auth/useAuth.ts'
import { PageHeader } from '@/components/layout/PageHeader.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Card } from '@/components/ui/card.tsx'
import { Field, Input, Label, Select } from '@/components/ui/field.tsx'
import { ErrorState, Notice } from '@/components/ui/feedback.tsx'
import { SkeletonRow } from '@/components/ui/skeleton.tsx'
import { useInviteMember, useMembers } from '@/features/access/useMembers.ts'
import { useTranslation } from '@/i18n/index.ts'
import { usePatientAccess } from '@/patients/usePatientAccess.ts'
import type { InviteMemberArgs } from '@smriti/shared'

/**
 * Manage → Access (frontend.md §8).
 *
 * Only a `caregiver` sees the access form. A `family_viewer` gets the list and
 * nothing else - the RPC refuses them anyway (`invite_member` raises
 * "caregiver only"), so not rendering the form is about not offering someone a
 * control that exists to reject them.
 *
 * ── A gap worth knowing about ─────────────────────────────────────────────
 * frontend.md §5 sketches `membersFor` as `.select('*, users(*)')`, but accounts
 * live in `auth.users`, which PostgREST does not expose and RLS deliberately
 * does not open up - that embed would 400 against the live server. So this list
 * shows role, when they joined, and which row is you. Showing names and phone
 * numbers needs a `public.profiles` view server-side; until then the page says
 * what it can rather than inventing what it cannot.
 */

type Values = { phone: string; role: 'family_viewer' | 'caregiver' }

export default function Access() {
  const { patientId, canEdit, patient } = usePatientAccess()
  const { t, formatDate } = useTranslation()
  const { userId } = useAuth()
  const members = useMembers(patientId)
  const invite = useInviteMember(patientId)
  const [pendingNote, setPendingNote] = useState<string | null>(null)

  const schema = useMemo(() => z.object({
    phone: z.string().trim().regex(/^\+[1-9]\d{7,14}$/, t('access.phoneError')),
    role: z.enum(['family_viewer', 'caregiver']),
  }), [t])

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '', role: 'family_viewer' },
  })

  const rows = members.data ?? []
  const firstName = patient?.display_name.split(' ')[0] ?? 'the patient'

  return (
    <>
      <PageHeader
        eyebrow={t('access.eyebrow')}
        title={t('access.title')}
        description={t('access.description', { name: firstName })}
      />

      {members.error && <ErrorState error={members.error} className="mb-6" />}

      <div className="space-y-3">
        {members.isPending && [0, 1].map((i) => <SkeletonRow key={i} />)}

        {rows.map((member) => {
          const copy = member.role === 'caregiver'
            ? { label: t('access.caregiver.label'), body: t('access.caregiver.body') }
            : member.role === 'family_viewer'
              ? { label: t('access.family.label'), body: t('access.family.body') }
              : { label: t('access.healthWorker.label'), body: t('access.healthWorker.body') }
          const isYou = member.user_id === userId
          return (
            <Card
              key={member.user_id}
              padding="md"
              className="flex items-start gap-4"
              tone={member.role === 'caregiver' ? 'warm' : 'plain'}
            >
              <span
                className={`grid size-11 flex-none place-items-center rounded-full ${
                  member.role === 'caregiver'
                    ? 'bg-terracotta/15 text-terracotta'
                    : 'bg-sage/12 text-sage'
                }`}
              >
                {member.role === 'caregiver' ? (
                  <ShieldCheck className="size-5" />
                ) : (
                  <Eye className="size-5" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-heading text-[17px] font-bold">{copy.label}</p>
                  {isYou && (
                    <Badge tone="neutral" size="sm">
                      {t('access.you')}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 max-w-[54ch] text-[13.5px] leading-relaxed text-body">
                  {copy.body}
                </p>
                <p className="mt-1.5 text-[12.5px] text-muted">
                  {t('access.added', { date: formatDate(member.created_at, { day: 'numeric', month: 'short', year: 'numeric' }) })}
                </p>
              </div>
            </Card>
          )
        })}
      </div>

      {canEdit ? (
        <Card padding="lg" className="mt-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 flex-none place-items-center rounded-full bg-terracotta/12 text-terracotta">
              <UserPlus className="size-5" />
            </span>
            <div>
              <h2 className="text-[19px]">{t('access.addUser')}</h2>
              <p className="mt-1 max-w-[54ch] text-[14.5px] leading-relaxed text-body">
                {t('access.addUserDescription')}
              </p>
            </div>
          </div>

          <form
            className="mt-6"
            noValidate
            onSubmit={form.handleSubmit((values) => {
              setPendingNote(null)
              invite.mutate(
                { phone: values.phone, role: values.role as InviteMemberArgs['p_role'] },
                {
                  onSuccess: (result) => {
                    form.reset({ phone: '', role: values.role })
                    setPendingNote(
                      result.status === 'pending'
                        ? t('access.pending', { phone: values.phone })
                        : null,
                    )
                  },
                },
              )
            })}
          >
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <Field
                label={t('access.phone')}
                htmlFor="invite-phone"
                required
                error={form.formState.errors.phone?.message}
              >
                <Input
                  id="invite-phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  {...form.register('phone')}
                />
              </Field>

              <div>
                <Label htmlFor="invite-role">{t('access.role')}</Label>
                <Select id="invite-role" className="mt-2 w-56" {...form.register('role')}>
                  <option value="family_viewer">{t('access.familyOption')}</option>
                  <option value="caregiver">{t('access.caregiverOption')}</option>
                </Select>
              </div>
            </div>

            {pendingNote && (
              <Notice tone="warn" className="mt-1">
                {pendingNote}
              </Notice>
            )}

            {invite.isSuccess && !pendingNote && (
              <Notice className="mt-1">
                {t('access.addedNotice', { name: firstName })}
              </Notice>
            )}

            {invite.error && <ErrorState error={invite.error} className="mt-3" />}

            <Button type="submit" variant="accent" className="mt-4" disabled={invite.isPending}>
              {invite.isPending ? t('access.adding') : t('access.addAccess')}
            </Button>
          </form>
        </Card>
      ) : (
        <Notice className="mt-6">
          {t('access.caregiverOnly')}
        </Notice>
      )}
    </>
  )
}
