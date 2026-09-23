import { useEffect, useRef, useState } from 'react'
import { Camera, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button.tsx'
import { BUCKET } from '@/lib/db.ts'
import { useMediaUpload, useSignedUrl } from '@/hooks/useMediaUpload.ts'
import { cn } from '@/lib/utils.ts'
import { useTranslation } from '@/i18n/index.ts'

/**
 * Choosing a photo.
 *
 * The preview is a local object URL, shown the instant a file is chosen — the
 * upload happens behind it. The caregiver sees the face they picked
 * immediately, which is what makes adding eight family members bearable, while
 * the path that actually goes into the row is only handed back once the object
 * is committed to storage (see `useMediaUpload`).
 *
 * `capture="environment"` is deliberately absent: these are photos from the
 * family album far more often than they are taken on the spot.
 */
export function PhotoPicker({
  patientId,
  value,
  onChange,
  label,
  hint,
  className,
}: {
  patientId: string
  /** The storage path already saved, if any. */
  value: string | null
  onChange: (path: string | null) => void
  label?: string
  hint?: string
  className?: string
}) {
  const { t } = useTranslation()
  const displayLabel = label ?? t('photo.label')
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const { upload, uploading, error } = useMediaUpload(patientId)
  const stored = useSignedUrl(patientId, BUCKET.media, value, Boolean(value) && !preview)

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  const pick = async (file: File | undefined) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old)
      return url
    })
    try {
      const path = await upload(file, 'photo')
      onChange(path)
    } catch {
      // `error` from the hook renders below; the preview stays so the caregiver
      // can see what failed and try the same file again.
    }
  }

  const clear = () => {
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old)
      return null
    })
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const imageSrc = preview ?? stored.data
  const hasImage = Boolean(preview || value)

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            'grid size-20 flex-none place-items-center overflow-hidden rounded-full transition-colors',
            hasImage
              ? 'bg-sand'
              : 'border-2 border-dashed border-ink/20 bg-sand/40 text-muted hover:border-terracotta/50 hover:text-terracotta',
          )}
          aria-label={hasImage ? t('photo.change', { label: displayLabel.toLowerCase() }) : t('photo.add', { label: displayLabel.toLowerCase() })}
        >
          {imageSrc ? (
            <img src={imageSrc} alt="" className="size-full object-cover" />
          ) : value ? (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-sage">
              {t('photo.saved')}
            </span>
          ) : (
            <Camera className="size-6" />
          )}
        </button>

        <div className="min-w-0">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            {hasImage ? t('photo.change', { label: displayLabel.toLowerCase() }) : t('photo.choose', { label: displayLabel.toLowerCase() })}
          </Button>
          {hasImage && (
            <Button type="button" variant="ghost" size="sm" onClick={clear} className="ml-1">
              <Trash2 className="size-4" />
              {t('photo.remove')}
            </Button>
          )}
          <p className="mt-1.5 text-[12.5px] leading-snug text-muted">
            {uploading
              ? t('photo.uploading')
              : hint ??
                t('photo.hint')}
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-[13px] font-medium text-alert">
          {t('photo.uploadFailed')} {error.message}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => void pick(e.target.files?.[0])}
      />
    </div>
  )
}
