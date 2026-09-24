import { RefreshCw, Smartphone } from 'lucide-react'

import { Button } from '@/components/ui/button.tsx'
import { Card } from '@/components/ui/card.tsx'
import { ErrorState, Notice } from '@/components/ui/feedback.tsx'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import { useTranslation } from '@/i18n/index.ts'
import { PairingCode } from './PairingCode.tsx'
import { PairingQr } from './PairingQr.tsx'
import { usePairingToken, useTokenCountdown } from './usePairingToken.ts'

/**
 * Generating and presenting a pairing token - shared by the last step of the
 * setup wizard and the Tablet page, because they are the same job. A device
 * that has to be re-paired after a factory reset should not meet a different
 * screen from the one the caregiver used the first time.
 */
export function PairingPanel({
  patientId,
  patientName,
}: {
  patientId: string
  patientName: string
}) {
  const { t } = useTranslation()
  const pairing = usePairingToken(patientId)
  const countdown = useTokenCountdown(pairing.data?.expires_at)

  const token = pairing.data?.token
  const usable = token && !countdown.expired

  return (
    <Card tone="sand" padding="lg">
      <div className="flex items-start gap-4">
        <span className="grid size-11 flex-none place-items-center rounded-full bg-ivory text-terracotta">
          <Smartphone className="size-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-lg">{t('pairing.title', { name: patientName })}</h3>
          <p className="mt-1.5 max-w-[52ch] text-[15px] leading-relaxed text-body">
            {t('pairing.description')}
          </p>
        </div>
      </div>

      {!token && (
        <div className="mt-6">
          <Button
            variant="accent"
            size="lg"
            onClick={() => pairing.mutate()}
            disabled={pairing.isPending}
          >
            {pairing.isPending ? t('pairing.generating') : t('pairing.generate')}
          </Button>
          {pairing.isPending && (
            <div className="mt-6 flex flex-wrap items-center gap-6">
              <Skeleton className="size-[252px] rounded-panel" />
              <Skeleton className="h-16 w-56" />
            </div>
          )}
        </div>
      )}

      {pairing.error && <ErrorState error={pairing.error} className="mt-5" />}

      {token && (
        <div className="mt-6 flex flex-wrap items-center gap-8">
          <div className={usable ? '' : 'opacity-35 grayscale'}>
            <PairingQr token={token} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">
              {t('pairing.readOut')}
            </p>
            <PairingCode token={token} />

            <div className="mt-5">
              {countdown.expired ? (
                <Notice tone="warn">
                  {t('pairing.expired')}
                </Notice>
              ) : (
                <p className="text-sm text-muted">
                  {t('pairing.expiresIn', { time: countdown.display ?? '-' })} {t('pairing.singleUse')}
                </p>
              )}
            </div>

            <Button
              variant={countdown.expired ? 'accent' : 'ghost'}
              size="sm"
              className="mt-3"
              onClick={() => pairing.mutate()}
              disabled={pairing.isPending}
            >
              <RefreshCw className="size-4" />
              {pairing.isPending ? t('pairing.generating') : t('pairing.generateNew')}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
