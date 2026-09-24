import { useQuery } from '@tanstack/react-query'
import { Check, ChevronDown } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

import { Avatar, AvatarFallback } from '@/components/ui/controls.tsx'
import { useTranslation } from '@/i18n/index.ts'
import * as db from '@/lib/db.ts'
import { qk } from '@/lib/queryKeys.ts'
import { cn, deviceHealth, initialsOf } from '@/lib/utils.ts'
import { usePatientAccess, useSwitchPatient } from '@/patients/usePatientAccess.ts'

/**
 * The persistent patient identity indicator (frontend.md §12 rule 3).
 *
 * Photo-or-initials and name, on every single screen, never behind a click.
 * A caregiver managing two parents needs to be able to answer "whose medicines
 * am I looking at" without doing anything - and the moment that answer costs a
 * click is the moment someone edits the wrong person's dose.
 *
 * The sync line underneath is part of the same honesty: it says when the tablet
 * last reported in, so nothing on the screen can be mistaken for live.
 */
export function PatientIdentity({ compact = false }: { compact?: boolean }) {
  const { patient, patientId, role } = usePatientAccess()
  const switchPatient = useSwitchPatient()
  const { t, formatRelativeTime } = useTranslation()

  const overview = useQuery({
    queryKey: qk.overview(),
    queryFn: () => db.unwrap(db.patientsOverview()),
    staleTime: 60_000,
  })

  const others = (overview.data ?? []).filter((p) => p.patient_id !== patientId)
  const name = patient?.display_name ?? '-'
  const health = deviceHealth(patient?.device_last_seen_at)

  const identity = (
    <span className="flex min-w-0 items-center gap-3 text-left">
      {/* A bead ring of Risa colours around whoever the app is about. */}
      <span className="flex-none rounded-full bg-risa-ring p-[2.5px]">
        <span className="block rounded-full bg-ivory p-[2px]">
          <Avatar className={compact ? 'size-8' : 'size-10'}>
            <AvatarFallback>{initialsOf(name)}</AvatarFallback>
          </Avatar>
        </span>
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="truncate font-heading text-[17px] font-bold leading-tight">
            {name}
          </span>
          {role !== 'caregiver' && (
            <span className="rounded-pill bg-ink/[0.06] px-2 py-0.5 text-[11px] font-semibold text-muted">
              {t('identity.viewOnly')}
            </span>
          )}
        </span>
        <span
          className={cn(
            'block truncate text-[12.5px] leading-tight',
            health === 'ok' ? 'text-muted' : 'text-alert',
          )}
        >
          {health === 'never'
            ? t('device.health.never.label')
            : t('device.lastHeard', { time: formatRelativeTime(patient?.device_last_seen_at) })}
        </span>
      </span>
    </span>
  )

  // With one patient there is nothing to switch to, so it is not a control.
  if (others.length === 0) {
    return <div className="flex min-w-0 items-center">{identity}</div>
  }

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        className="flex min-w-0 items-center gap-2 rounded-2xl px-1 py-1 transition-colors hover:bg-ink/[0.05]"
        aria-label={t('identity.switchAria', { name })}
      >
        {identity}
        <ChevronDown className="size-4 flex-none text-muted" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          className="z-50 min-w-64 rounded-card border border-ink/[0.08] bg-ivory p-1.5 shadow-panel"
        >
          <DropdownMenu.Label className="px-3 py-2 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted">
            {t('identity.switchPatient')}
          </DropdownMenu.Label>
          {(overview.data ?? []).map((p) => (
            <DropdownMenu.Item
              key={p.patient_id}
              onSelect={() => {
                if (p.patient_id !== patientId) switchPatient(p.patient_id)
              }}
              className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm outline-none data-[highlighted]:bg-sand/70"
            >
              <Avatar className="size-8">
                <AvatarFallback className="text-[12px]">
                  {initialsOf(p.display_name)}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{p.display_name}</span>
                <span className="block truncate text-[12px] text-muted">
                  {p.active_flags > 0
                    ? t('identity.flags', { count: p.active_flags })
                    : p.played_today
                      ? t('identity.playedToday')
                      : t('identity.noActivity')}
                </span>
              </span>
              {p.patient_id === patientId && <Check className="size-4 text-sage" />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
