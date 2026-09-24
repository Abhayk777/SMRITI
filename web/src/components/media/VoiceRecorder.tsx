import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Mic, Square, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button.tsx'
import { useMediaUpload } from '@/hooks/useMediaUpload.ts'
import { useTranslation } from '@/i18n/index.ts'
import { cn } from '@/lib/utils.ts'

/** Recording longer than this is almost always a forgotten stop button. */
const MAX_MS = 20_000

/**
 * Recording a short voice clip with the `MediaRecorder` API (frontend.md §8).
 *
 * These clips are the person's own voice saying who they are - "Divya, your
 * daughter" - and the tablet plays them alongside the photo. A familiar voice
 * does something a caption cannot, which is why this is worth the extra step in
 * setup rather than a text field.
 *
 * The recording is capped and stopped automatically: a caregiver setting this
 * up at eleven at night will leave it running, and a four-minute clip is both a
 * bad prompt and a slow download for the tablet.
 */
export function VoiceRecorder({
  patientId,
  value,
  onChange,
  prompt,
  className,
}: {
  patientId: string
  value: string | null
  onChange: (path: string | null) => void
  prompt?: string
  className?: string
}) {
  const { formatDuration, t } = useTranslation()
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [localUrl, setLocalUrl] = useState<string | null>(null)
  const [deviceError, setDeviceError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)

  const { upload, uploading, error } = useMediaUpload(patientId)

  const stop = useCallback(() => {
    recorderRef.current?.stop()
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop())
    recorderRef.current = null
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = null
    setRecording(false)
  }, [])

  // Tearing down on unmount matters: leaving the recorder running keeps the
  // browser's microphone indicator lit after the caregiver has navigated away.
  useEffect(() => stop, [stop])

  const start = async () => {
    setDeviceError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setLocalUrl((old) => {
          if (old) URL.revokeObjectURL(old)
          return url
        })

        const extension = (recorder.mimeType || 'audio/webm').includes('mp4') ? 'm4a' : 'webm'
        const file = new File([blob], `voice.${extension}`, { type: blob.type })
        void upload(file, 'voice')
          .then(onChange)
          .catch(() => {
            // `error` renders below; the local clip stays playable so the
            // caregiver can decide whether to retry or re-record.
          })
      }

      recorder.start()
      recorderRef.current = recorder
      setRecording(true)
      setElapsed(0)

      timerRef.current = window.setInterval(() => {
        setElapsed((ms) => {
          const next = ms + 200
          if (next >= MAX_MS) stop()
          return next
        })
      }, 200)
    } catch {
      setDeviceError(
        t('recorder.microphoneError'),
      )
    }
  }

  const clear = () => {
    setLocalUrl((old) => {
      if (old) URL.revokeObjectURL(old)
      return null
    })
    onChange(null)
  }

  const hasClip = Boolean(localUrl || value)

  return (
    <div className={cn('space-y-3', className)}>
      {prompt && <p className="text-[13.5px] leading-relaxed text-body">{prompt}</p>}

      <div className="flex flex-wrap items-center gap-3">
        {!recording ? (
          <Button type="button" variant={hasClip ? 'outline' : 'solid'} size="sm" onClick={() => void start()}>
            <Mic className="size-4" />
            {hasClip ? t('recorder.recordAgain') : t('recorder.record')}
          </Button>
        ) : (
          <Button type="button" variant="danger" size="sm" onClick={stop}>
            <Square className="size-3.5" />
            {t('recorder.stop', { duration: formatDuration(elapsed) })}
          </Button>
        )}

        {hasClip && !recording && (
          <>
            {localUrl && <audio src={localUrl} controls className="h-9 max-w-[220px]" />}
            {!localUrl && value && (
              <span className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-sage">
                <Check className="size-4" />
                {t('recorder.saved')}
              </span>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={clear}>
              <Trash2 className="size-4" />
              {t('recorder.remove')}
            </Button>
          </>
        )}

        {uploading && <span className="text-[13px] text-muted">{t('recorder.uploading')}</span>}
      </div>

      {recording && (
        <div className="h-1.5 w-full max-w-[220px] overflow-hidden rounded-pill bg-sand">
          <div
            className="h-full rounded-pill bg-alert transition-[width] duration-200"
            style={{ width: `${Math.min(100, (elapsed / MAX_MS) * 100)}%` }}
          />
        </div>
      )}

      {(deviceError || error) && (
        <p role="alert" className="text-[13px] font-medium text-alert">
          {deviceError ?? t('recorder.uploadFailed')}
        </p>
      )}
    </div>
  )
}
