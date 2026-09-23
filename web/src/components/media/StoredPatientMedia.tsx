import { useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button.tsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.tsx'
import { BUCKET } from '@/lib/db.ts'
import { cn } from '@/lib/utils.ts'
import { useSignedUrl } from '@/hooks/useMediaUpload.ts'
import { useTranslation } from '@/i18n/index.ts'

/**
 * Media rows store a Storage path, never a URL. These small renderers resolve
 * a short-lived URL only for the caregiver currently allowed to see the row.
 */
export function StoredPatientPhoto({
  patientId,
  path,
  alt,
  fallback,
  className,
}: {
  patientId: string
  path: string | null | undefined
  alt: string
  fallback: ReactNode
  className?: string
}) {
  const { t } = useTranslation()
  const signed = useSignedUrl(patientId, BUCKET.media, path)
  const [open, setOpen] = useState(false)

  const image = signed.data ? (
    <img src={signed.data} alt={alt} className="size-full object-cover" />
  ) : (
    fallback
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        disabled={!signed.data}
        onClick={() => setOpen(true)}
        aria-label={t('common.viewName', { name: alt })}
        className={cn(
          'grid flex-none place-items-center overflow-hidden rounded-full bg-sand text-muted',
          signed.data && 'cursor-zoom-in transition-opacity hover:opacity-85 focus:outline-none focus:ring-2 focus:ring-terracotta focus:ring-offset-2',
          className,
        )}
      >
        {image}
      </button>
      {signed.data && (
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{alt}</DialogTitle>
          </DialogHeader>
          <img src={signed.data} alt={alt} className="max-h-[70vh] w-full rounded-card object-contain" />
        </DialogContent>
      )}
    </Dialog>
  )
}

/** Fetch voice media only after the caregiver asks to hear it. */
export function StoredPatientVoice({
  patientId,
  path,
  label,
  className,
}: {
  patientId: string
  path: string | null | undefined
  label: string
  className?: string
}) {
  const { t } = useTranslation()
  const [wanted, setWanted] = useState(false)
  const signed = useSignedUrl(patientId, BUCKET.media, path, wanted)

  if (!path) return null

  return (
    <div className={cn('mt-2 flex flex-wrap items-center gap-2', className)}>
      {!wanted && (
        <Button type="button" variant="outline" size="sm" onClick={() => setWanted(true)}>
          {t('common.playVoice')}
        </Button>
      )}
      {wanted && signed.isPending && <span className="text-[13px] text-muted">{t('common.loadingVoice')}</span>}
      {wanted && signed.data && (
        <audio controls autoPlay aria-label={label} className="h-9 max-w-[220px]" src={signed.data} />
      )}
      {wanted && signed.error && (
        <span role="alert" className="text-[13px] font-medium text-alert">
          {t('common.voiceLoadFailed')}
        </span>
      )}
    </div>
  )
}
