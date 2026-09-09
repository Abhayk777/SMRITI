import { useState } from 'react'
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
import { ROLE_COPY, useInviteMember, useMembers } from '@/features/access/useMembers.ts'
import { formatDayShort } from '@/lib/utils.ts'
import { usePatientAccess } from '@/patients/usePatientAccess.ts'
import type { InviteMemberArgs } from '@smriti/shared'

/**
 * Manage → Access (frontend.md §8).
 *
 * Only a `caregiver` sees the access form. A `family_viewer` gets the list and
 * nothing else — the RPC refuses them anyway (`invite_member` raises
 * "caregiver only"), so not rendering the form is about not offering someone a
 * control that exists to reject them.
 *
 * ── A gap worth knowing about ─────────────────────────────────────────────
 * frontend.md §5 sketches `membersFor` as `.select('*, users(*)')`, but accounts
 * live in `auth.users`, which PostgREST does not expose and RLS deliberately
 * does not open up — that embed would 400 against the live server. So this list
 * shows role, when they joined, and which row is you. Showing names and phone
 * numbers needs a `public.profiles` view server-side; until then the page says
 * what it can rather than inventing what it cannot.
 */

const schema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, 'Include the country code, like +91 98765 43210'),
  role: z.enum(['family_viewer', 'caregiver']),
})

type Values = z.infer<typeof schema>

export default function Access() {
  const { patientId, canEdit, patient } = usePatientAccess()
  const { userId } = useAuth()
  const members = useMembers(patientId)
  const invite = useInviteMember(patientId)
  const [pendingNote, setPendingNote] = useState<string | null>(null)

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '', role: 'family_viewer' },
  })

  const rows = members.data ?? []
  const firstName = patient?.display_name.split(' ')[0] ?? 'the patient'

  return (
    <>
      <PageHeader
        eyebrow="Manage"
        title="Who can access this"
        description={`Everyone here can see ${firstName}'s day, their trends and their messages. Only caregivers can change their medicines, people and routine.`}
      />

      {members.error && <ErrorState error={members.error} className="mb-6" />}

      <div className="space-y-3">
        {members.isPending && [0, 1].map((i) => <SkeletonRow key={i} />)}

        {rows.map((member) => {
          const copy = ROLE_COPY[member.role]
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
                      You
                    </Badge>
                  )}
                </div>
                <p className="mt-1 max-w-[54ch] text-[13.5px] leading-relaxed text-body">
                  {copy.body}
                </p>
                <p className="mt-1.5 text-[12.5px] text-muted">
                  Added {formatDayShort(member.created_at.slice(0, 10))}
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
              <h2 className="text-[19px]">Add an existing Smriti user</h2>
              <p className="mt-1 max-w-[54ch] text-[14.5px] leading-relaxed text-body">
                This does not send a text or email. Use the number they already used to sign
                in to Smriti; access is added only to that existing account.
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
                        ? `Nobody has signed up with ${values.phone} yet. Ask them to sign in to Smriti with that number once, then invite them again — they have not been given access yet.`
                        : null,
                    )
                  },
                },
              )
            })}
          >
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <Field
                label="Their mobile number"
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
                <Label htmlFor="invite-role">What they can do</Label>
                <Select id="invite-role" className="mt-2 w-56" {...form.register('role')}>
                  <option value="family_viewer">Family — can see everything</option>
                  <option value="caregiver">Caregiver — can also make changes</option>
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
                Added. They will see {firstName} the next time they open Smriti.
              </Notice>
            )}

            {invite.error && <ErrorState error={invite.error} className="mt-3" />}

            <Button type="submit" variant="accent" className="mt-4" disabled={invite.isPending}>
              {invite.isPending ? 'Adding…' : 'Add access'}
            </Button>
          </form>
        </Card>
      ) : (
        <Notice className="mt-6">
          Only a caregiver can add people to this profile. Ask whoever set it up.
        </Notice>
      )}
    </>
  )
}
