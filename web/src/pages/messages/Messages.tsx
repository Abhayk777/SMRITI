import { useRef, useState } from 'react'
import { MessageSquareHeart, Pause, Play } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { Card } from '@/components/ui/card.tsx'
import { EmptyState, ErrorState } from '@/components/ui/feedback.tsx'
import { SkeletonRow } from '@/components/ui/skeleton.tsx'
import { MEMO_TAG_COPY, useMarkMemoRead, useMemos } from '@/features/memos/useMemos.ts'
import { useSignedUrl } from '@/hooks/useMediaUpload.ts'
import { useTranslation } from '@/i18n/index.ts'
import { BUCKET } from '@/lib/db.ts'
import { cn } from '@/lib/utils.ts'
import { usePatientAccess } from '@/patients/usePatientAccess.ts'
import type { Memo } from '@smriti/shared'

/**
 * Messages (frontend.md §8).
 *
 * Voice memos from the tablet. Two rules shape this page:
 *
 * **Audio URLs are fetched on demand, never up front.** Fifty signed-URL round
 * trips to render a list nobody has pressed play on is a slow page for nothing,
 * and signed URLs expire - minting them early means minting them twice.
 *
 * **`read_at` is set on play, not on render.** A memo scrolling past in a list
 * has not been heard. Marking it read there would quietly bury the one thing a
 * parent recorded that day, and this is often the part of the product families
 * care about most.
 */

function MemoRow({ memo, patientId, canEdit }: { memo: Memo; patientId: string; canEdit: boolean }) {
  const [wanted, setWanted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [playbackError, setPlaybackError] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const markRead = useMarkMemoRead(patientId)
  const signed = useSignedUrl(patientId, BUCKET.memos, memo.storage_path, wanted)
  const { formatDuration, formatRelativeTime, t } = useTranslation()

  const toggle = () => {
    if (!wanted) {
      setWanted(true)
      return
    }
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      setPlaybackError(false)
      void audio.play().catch(() => setPlaybackError(true))
    }
    else audio.pause()
  }

  const unread = !memo.read_at

  return (
    <Card
      tone={unread ? 'warm' : 'plain'}
      padding="md"
      className={cn(unread && 'border-terracotta/25')}
    >
      <div className="flex items-start gap-4">
        <span className="relative grid flex-none place-items-center">
          {/* An unheard message breathes until someone listens. */}
          {unread && !playing && (
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-terracotta/35 animate-pulse-ring"
            />
          )}
          <button
            type="button"
            onClick={toggle}
            disabled={signed.isPending && wanted}
            aria-label={playing ? t('messages.pause') : t('messages.play')}
            className="relative grid size-12 place-items-center rounded-full bg-terracotta text-ivory ring-4 ring-clay transition-[background-color,transform] duration-200 hover:scale-105 hover:bg-terracotta-deep disabled:opacity-60"
          >
            {playing ? <Pause className="size-5" /> : <Play className="size-5 translate-x-0.5" />}
          </button>
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {memo.context_tag && (
              <Badge tone={unread ? 'warm' : 'neutral'} size="sm">
                {MEMO_TAG_COPY[memo.context_tag] ? t(MEMO_TAG_COPY[memo.context_tag] as 'messages.tags.memory') : memo.context_tag}
              </Badge>
            )}
            <span className="text-[12.5px] text-muted">
              {formatRelativeTime(new Date(memo.recorded_at).toISOString())} ·{' '}
              {formatDuration(memo.duration_ms)}
            </span>
            {unread && (
              <Badge tone="gold" size="sm">
                {t('messages.new')}
              </Badge>
            )}
          </div>

          {memo.transcript ? (
            <p className="mt-2 font-heading text-[17px] leading-snug">“{memo.transcript}”</p>
          ) : (
            <p className="mt-2 text-[14.5px] italic text-muted">
              {t('messages.noTranscript')}
            </p>
          )}

          {wanted && signed.isPending && (
            <p className="mt-2 text-[13px] text-muted">{t('messages.fetching')}</p>
          )}
          {wanted && signed.error && (
            <p role="alert" className="mt-2 text-[13px] font-medium text-alert">
              {t('messages.loadFailed')}
            </p>
          )}
          {playbackError && (
            <p role="alert" className="mt-2 text-[13px] font-medium text-alert">
              {t('messages.playbackFailed')}
            </p>
          )}
          {markRead.error && (
            <p role="alert" className="mt-2 text-[13px] font-medium text-alert">
              {t('messages.markReadFailed')}
            </p>
          )}
          {!canEdit && unread && wanted && (
            <p className="mt-2 text-[12.5px] text-muted">
              {t('messages.viewOnly')}
            </p>
          )}
          {signed.data && (
            <audio
              ref={audioRef}
              src={signed.data}
              controls
              autoPlay
              onPlay={() => {
                setPlaying(true)
                setPlaybackError(false)
                if (canEdit && unread && !markRead.isPending && !markRead.isSuccess) {
                  markRead.mutate(memo.id)
                }
              }}
              onError={() => {
                setPlaying(false)
                setPlaybackError(true)
              }}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              className="mt-3 w-full max-w-md"
            />
          )}
        </div>
      </div>
    </Card>
  )
}

export default function Messages() {
  const { patientId, patient, canEdit } = usePatientAccess()
  const memos = useMemos(patientId)
  const { t } = useTranslation()

  const rows = memos.data ?? []
  const unreadCount = rows.filter((memo) => !memo.read_at).length
  const firstName = patient?.display_name.split(' ')[0] ?? 'the patient'

  return (
    <>
      <PageHeader
        eyebrow={t('messages.eyebrow')}
        title={t('messages.title', { name: firstName })}
        description={
          unreadCount > 0
            ? t('messages.unreadDescription', { count: unreadCount })
            : t('messages.description')
        }
      />

      {memos.error && <ErrorState error={memos.error} className="mb-6" />}

      <div className="space-y-3">
        {memos.isPending && [0, 1, 2].map((i) => <SkeletonRow key={i} />)}

        {!memos.isPending && rows.length === 0 && (
          <EmptyState
            icon={<MessageSquareHeart className="size-5" />}
            title={t('messages.emptyTitle')}
            description={t('messages.emptyDescription', { name: firstName })}
          />
        )}

        {rows.map((memo) => (
          <MemoRow key={memo.id} memo={memo} patientId={patientId} canEdit={canEdit} />
        ))}
      </div>
    </>
  )
}
