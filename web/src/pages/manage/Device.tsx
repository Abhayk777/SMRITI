import { CheckCircle2, CloudOff, RefreshCw, Smartphone, TriangleAlert } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Card } from '@/components/ui/card.tsx'
import { ErrorState, Notice } from '@/components/ui/feedback.tsx'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import { useDeviceStatus } from '@/features/device/useDeviceStatus.ts'
import { PairingPanel } from '@/features/pairing/PairingPanel.tsx'
import { VoicebotStatusCard } from '@/features/voicebot/VoicebotStatusCard.tsx'
import { useTranslation } from '@/i18n/index.ts'
import { cn, type DeviceHealth } from '@/lib/utils.ts'
import { usePatientAccess } from '@/patients/usePatientAccess.ts'

/**
 * Manage → Tablet (frontend.md §8).
 *
 * The `ok` / `stale` / `offline` thresholds are the watchdog's own - 24 and 72
 * hours. They match on purpose. A caregiver reading "Connected" here while the
 * server has already decided the device is offline and started calling people
 * about it is two systems telling one family different stories, which is worse
 * than either being wrong on its own.
 *
 * `content_version` is shown deliberately. When a caregiver edits a medicine and
 * asks "has it reached the tablet yet", this is the only honest answer available
 * - and the tablet's own pull is what closes the gap, not anything this page can
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
  const { t, formatRelativeTime, formatNumber } = useTranslation()

  const style = HEALTH_STYLE[device.health]
  const Icon = style.icon
  const copy = {
    label: t(`device.health.${device.health}.label` as const),
    detail: t(`device.health.${device.health}.detail` as const),
  }
  const firstName = patient?.display_name.split(' ')[0] ?? 'the patient'

  return (
    <>
      <PageHeader
        eyebrow={t('device.eyebrow')}
        title={t('device.title')}
        description={t('device.description', { name: firstName })}
        actions={
          <Button variant="ghost" size="sm" onClick={() => void device.refetch()}>
            <RefreshCw className={cn('size-4', device.isFetching && 'animate-spin')} />
            {t('device.checkNow')}
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
                  {t('device.lastHeard', { time: formatRelativeTime(device.lastSeenAt) })}
                </p>
              )}
            </div>
          </div>

          {device.isPaired && (
            <dl className="mt-6 grid gap-5 border-t border-ink/[0.08] pt-5 sm:grid-cols-2 lg:grid-cols-4">
              <Detail label={t('device.appVersion')} value={device.appVersion ?? t('device.awaitingFirstSync')} />
              <Detail
                label={t('device.contentVersion')}
                value={device.contentVersion !== null ? `v${formatNumber(device.contentVersion)}` : '-'}
              />
              <Detail
                label={t('device.waitingToUpload')}
                value={
                  device.pendingEvents === null
                    ? '-'
                    : t('device.eventsWaiting', { count: formatNumber(device.pendingEvents), suffix: device.pendingEvents === 1 ? '' : 's' })
                }
              />
              <Detail
                label={t('device.clockDifference')}
                value={
                  device.clockSkewMs === null
                    ? '-'
                    : `${formatNumber(Math.round(device.clockSkewMs / 1000))}s`
                }
              />
            </dl>
          )}
        </Card>
      )}

      {device.health === 'offline' && (
        <Notice tone="warn" className="mt-5">
          {t('device.offlineNotice')}
        </Notice>
      )}

      {(device.pendingEvents ?? 0) > 0 && (
        <Notice className="mt-5">
          {t('device.pendingEventsNotice', { count: formatNumber(device.pendingEvents ?? 0), suffix: device.pendingEvents === 1 ? '' : 's' })}
        </Notice>
      )}

      {canEdit && (
        <div className="mt-8">
          <h2 className="mb-4 text-[19px]">
            {device.isPaired ? t('device.connectDifferentTablet') : t('device.connectTablet')}
          </h2>
          {device.isPaired && (
            <Notice className="mb-4">
              {t('device.connectedTabletNotice')}
            </Notice>
          )}
          <PairingPanel patientId={patientId} patientName={firstName} />
        </div>
      )}

      {!canEdit && (
        <Notice className="mt-8">
          {t('device.caregiverOnlyNotice')}
        </Notice>
      )}

      <VoicebotStatusCard patientId={patientId} canEdit={canEdit} />
    </>
  )
}
