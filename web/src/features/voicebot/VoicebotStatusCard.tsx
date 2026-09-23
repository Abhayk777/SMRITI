import { Bot, RefreshCw, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button.tsx'
import { Card } from '@/components/ui/card.tsx'
import { ErrorState, Notice } from '@/components/ui/feedback.tsx'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import { useTranslation } from '@/i18n/index.ts'
import { cn } from '@/lib/utils.ts'

import { useVoicebotOperation, useVoicebotStatus, voicebotStatusKeys } from './useVoicebotStatus.ts'

export function VoicebotStatusCard({ patientId, canEdit }: { patientId: string; canEdit: boolean }) {
  const status = useVoicebotStatus(patientId, canEdit)
  const operation = useVoicebotOperation(patientId)
  const { t, formatRelativeTime } = useTranslation()

  if (!canEdit) {
    return (
      <Notice className="mt-8">
        {t('voicebot.caregiverOnly')}
      </Notice>
    )
  }
  if (status.isPending) return <Skeleton className="mt-8 h-48 rounded-card" />
  if (status.error || !status.data) return <ErrorState error={status.error ?? new Error(t('voicebot.unavailableError'))} onRetry={() => void status.refetch()} className="mt-8" />

  const data = status.data
  const copy = voicebotStatusKeys(data.status)
  const working = operation.isPending
  const languageReady = data.language.text_enabled && data.language.measured

  return (
    <Card tone={data.status === 'ready' ? 'sage' : data.status === 'error' || data.status === 'unavailable' ? 'warm' : 'sand'} padding="lg" className="mt-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex max-w-2xl items-start gap-4">
          <span className="grid size-12 place-items-center rounded-full bg-ivory text-terracotta">
            <Bot className="size-6" />
          </span>
          <div>
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.1em] text-muted">{t('voicebot.name')}</p>
            <h2 className="mt-1 text-[20px]">{t(copy.title)}</h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-body">{t(copy.body)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!data.enabled ? (
            <Button variant="solid" size="sm" disabled={working} onClick={() => operation.mutate('enable')}>{t('voicebot.turnOn')}</Button>
          ) : (
            <Button variant="outline" size="sm" disabled={working} onClick={() => operation.mutate('disable')}>{t('voicebot.turnOff')}</Button>
          )}
          {data.retry_allowed && (
            <Button variant="ghost" size="sm" disabled={working} onClick={() => operation.mutate('retry_sync')}>
              <RefreshCw className={cn('size-4', working && 'animate-spin')} /> {t('voicebot.tryAgain')}
            </Button>
          )}
        </div>
      </div>

      {operation.error && <ErrorState error={operation.error} className="mt-5" />}
      {data.last_synced_at && <p className="mt-5 text-[13.5px] text-muted">{t('voicebot.lastUpdated', { time: formatRelativeTime(data.last_synced_at) })}</p>}
      {data.status === 'pending' || data.status === 'syncing' ? <p className="mt-2 text-[13.5px] text-muted">{t('voicebot.autoChecking')}</p> : null}
      <Notice tone={languageReady ? 'info' : 'warn'} className="mt-5">
        <ShieldCheck className="mt-0.5 size-4 flex-none" />
        {languageReady
          ? t('voicebot.languageReady', { language: data.language.voicebot_code === 'hin' ? 'Hindi' : 'English' })
          : t('voicebot.languagePending')}
      </Notice>
    </Card>
  )
}
