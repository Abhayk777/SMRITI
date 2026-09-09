import { CheckCircle2, CloudOff, RefreshCw, Smartphone, TriangleAlert } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Card } from '@/components/ui/card.tsx'
import { ErrorState, Notice } from '@/components/ui/feedback.tsx'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import { useDeviceStatus } from '@/features/device/useDeviceStatus.ts'
import { PairingPanel } from '@/features/pairing/PairingPanel.tsx'
import { DEVICE_HEALTH_COPY, cn, timeAgo, type DeviceHealth } from '@/lib/utils.ts'
import { usePatientAccess } from '@/patients/usePatientAccess.ts'

/**
 * Manage → Tablet (frontend.md §8).
 *
 * The `ok` / `stale` / `offline` thresholds are the watchdog's own — 24 and 72
 * hours. They match on purpose. A caregiver reading "Connected" here while the
 * server has already decided the device is offline and started calling people
 * about it is two systems telling one family different stories, which is worse
 * than either being wrong on its own.
 *
 * `content_version` is shown deliberately. When a caregiver edits a medicine and
 * asks "has it reached the tablet yet", this is the only honest answer available
 * — and the tablet's own pull is what closes the gap, not anything this page can
 * do.
 */

const HEALTH_STYLE: Record<
  DeviceHealth,
  { icon: typeof CheckCircle2; tone: 'sage' | 'warm' | 'alert' | 'sand'; color: string }
> = {
  ok: { icon: CheckCircle2, tone: 'sage', color: 'text-sage' },
  stale: { icon: TriangleAlert, tone: 'warm', color: 'text-gold' },
  offline: { icon: CloudOff, tone: 'alert', color: 'text-alert' },
  paired: { icon: CheckCircle2, tone: 'sage', color: 'text-sage' },
  never: { icon: Smartphone, tone: 'sand', color: 'text-muted' },
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[12.5px] font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </dt>
      <dd className="numeral mt-1 text-[15px]">{value}</dd>
    </div>
  )
}

export default function Device() {
  const { patientId, canEdit, patient } = usePatientAccess()
  const device = useDeviceStatus(patientId)

  const style = HEALTH_STYLE[device.health]
  const Icon = style.icon
  const copy = DEVICE_HEALTH_COPY[device.health]
  const firstName = patient?.display_name.split(' ')[0] ?? 'the patient'

  return (
    <>
      <PageHeader
        eyebrow="Manage"
        title="The tablet"
        description={`Whether ${firstName}'s tablet is reaching Smriti, and what it is currently running. Everything you see anywhere else in this app came through here.`}
        actions={
          <Button variant="ghost" size="sm" onClick={() => void device.refetch()}>
            <RefreshCw className={cn('size-4', device.isFetching && 'animate-spin')} />
            Check now
          </Button>
        }
      />

      {device.error && <ErrorState error={device.error} className="mb-6" />}

      {device.isPending ? (
        <Skeleton className="h-40 rounded-card" />
      ) : (
        <Card tone={style.tone} padding="lg">
          <div className="flex items-start gap-4">
            <span className={cn('grid size-12 flex-none place-items-center rounded-full bg-ivory', style.color)}>
              <Icon className="size-6" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[20px]">{copy.label}</h2>
              <p className="mt-1.5 max-w-[56ch] text-[15px] leading-relaxed text-body">
                {copy.detail}
              </p>
              {device.lastSeenAt && (
                <p className="mt-2 text-[13.5px] text-muted">
                  Last heard from {timeAgo(device.lastSeenAt)}.
                </p>
              )}
            </div>
          </div>

          {device.isPaired && (
            <dl className="mt-6 grid gap-5 border-t border-ink/[0.08] pt-5 sm:grid-cols-2 lg:grid-cols-4">
              <Detail label="App version" value={device.appVersion ?? 'Awaiting first sync'} />
              <Detail
                label="Content version"
                value={device.contentVersion !== null ? `v${device.contentVersion}` : '—'}
              />
              <Detail
                label="Waiting to upload"
                value={
                  device.pendingEvents === null
                    ? '—'
                    : `${device.pendingEvents} event${device.pendingEvents === 1 ? '' : 's'}`
                }
              />
              <Detail
                label="Clock difference"
                value={
                  device.clockSkewMs === null
                    ? '—'
                    : `${Math.round(device.clockSkewMs / 1000)}s`
                }
              />
            </dl>
          )}
        </Card>
      )}

      {device.health === 'offline' && (
        <Notice tone="warn" className="mt-5">
          Local scheduled reminders and chimes continue on the tablet while it is offline.
          Sync, remote visibility, and escalation updates stop until it reconnects, so the
          Today, Trends and Engagement pages may be out of date. Usually it is the charger or
          the wifi.
        </Notice>
      )}

      {(device.pendingEvents ?? 0) > 0 && (
        <Notice className="mt-5">
          The tablet has {device.pendingEvents} thing
          {device.pendingEvents === 1 ? '' : 's'} it has not managed to send yet. It will
          catch up on its own once it has a connection — nothing is lost in the meantime.
        </Notice>
      )}

      {canEdit && (
        <div className="mt-8">
          <h2 className="mb-4 text-[19px]">
            {device.isPaired ? 'Connect a different tablet' : 'Connect a tablet'}
          </h2>
          {device.isPaired && (
            <Notice className="mb-4">
              This profile already has a tablet connected. Generating a new code is for
              replacing it — after a factory reset, or a new device.
            </Notice>
          )}
          <PairingPanel patientId={patientId} patientName={firstName} />
        </div>
      )}

      {!canEdit && (
        <Notice className="mt-8">
          Only a caregiver can connect or replace the tablet on this profile.
        </Notice>
      )}
    </>
  )
}
