import { useRef, useState } from 'react'
import { AlertTriangle, Camera, Check, ShieldCheck, Trash2 } from 'lucide-react'
import imageCompression from 'browser-image-compression'

import { PhotoPicker } from '@/components/media/PhotoPicker.tsx'
import { VoiceRecorder } from '@/components/media/VoiceRecorder.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Card } from '@/components/ui/card.tsx'
import { Input, Label } from '@/components/ui/field.tsx'
import { ErrorState, Notice } from '@/components/ui/feedback.tsx'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import {
  cn,
  DAY_LABELS,
  describeDays,
  EVERY_DAY,
  formatMinutes,
  isDayOn,
  parseDaysOfWeek,
  toggleDay,
} from '@/lib/utils.ts'
import { MedicineWindow } from './MedicineWindow.tsx'
import type { MedicineDraft } from './MedicineForm.tsx'
import {
  CONFIDENCE_COPY,
  confidenceBand,
  useOcrPrescription,
  type OcrCandidate,
} from './useOcrPrescription.ts'

/**
 * Prescription OCR review (frontend.md §9).
 *
 * **The review UI is the safety mechanism**, not the OCR. A machine misreading
 * "10 mg" as "1O mg" and that reaching a reminder unchecked is the single worst
 * bug this product could ship, so the rules below are structural rather than
 * advisory:
 *
 *   - every row shows a confidence badge;
 *   - anything below high confidence is distinguished by **a label and a
 *     border, not only by colour** — a caregiver with any degree of colour
 *     blindness must see the difference, and so must one glancing at a phone in
 *     sunlight;
 *   - the save button stays disabled until **every single row** has been ticked
 *     individually. Not "confirm all". One tick per line, deliberately tedious;
 *   - the copy says plainly that nothing activates until every line is checked.
 *
 * ── A product call the spec left open ─────────────────────────────────────
 * OCR returns a `frequency` string ("Once daily, morning"); the schema needs a
 * window and a chosen time. Rather than ask the caregiver to build a schedule
 * for four medicines inside a review screen, each row is given a **proposed**
 * window derived from that phrase, shown in full on the row and adjustable
 * inline. The proposal is part of what they are ticking, and the row says so.
 */

/** Maps a frequency phrase onto a window. Conservative, and always visible. */
function windowFor(frequency: string): Pick<
  MedicineDraft,
  'window_start_min' | 'window_end_min' | 'chosen_time_min'
> {
  const f = frequency.toLowerCase()
  if (/night|bed|\bhs\b|0-0-1|evening/.test(f)) {
    return { window_start_min: 1200, window_end_min: 1320, chosen_time_min: 1260 }
  }
  if (/noon|lunch|afternoon|0-1-0|midday/.test(f)) {
    return { window_start_min: 780, window_end_min: 900, chosen_time_min: 810 }
  }
  return { window_start_min: 480, window_end_min: 660, chosen_time_min: 540 }
}

/**
 * Whether a prescription line asks for more than one dose a day.
 *
 * This matters more than it looks. A `medications` row is **one dose at one
 * time** — "1-0-1", "twice daily" and "BD" all mean two rows, and this review
 * screen can only propose one. Left unsaid, a caregiver ticks a line believing
 * they have set up a twice-daily tablet and Smriti silently reminds them once.
 * That is a missed dose every single day, caused by the interface.
 *
 * So the row says so, in place, and tells them what to do about it. Splitting
 * the line automatically would be worse: it would invent a second time nobody
 * checked, inside a flow whose entire purpose is that a human checks every time.
 */
function dosesPerDay(frequency: string, rawText: string): number {
  const haystack = `${frequency} ${rawText}`.toLowerCase()

  // The Indian "1-0-1" morning-noon-night notation, read literally.
  const notation = haystack.match(/(\d)\s*-\s*(\d)\s*-\s*(\d)/)
  if (notation) {
    const count = [notation[1], notation[2], notation[3]].filter((d) => Number(d) > 0).length
    if (count > 0) return count
  }

  if (/\b(tds|tid|thrice|three times)\b/.test(haystack)) return 3
  if (/\b(bd|bid|twice|two times)\b/.test(haystack)) return 2
  return 1
}

type ReviewRow = MedicineDraft & {
  key: string
  confidence: number
  raw_text: string
  frequency: string
  /** How many doses a day the line appears to ask for. One row covers one. */
  dosesPerDay: number
  confirmed: boolean
  expanded: boolean
}

const toReviewRow = (candidate: OcrCandidate, index: number): ReviewRow => ({
  key: `${index}-${candidate.raw_text}`,
  name: candidate.name,
  dose: candidate.dose,
  frequency: candidate.frequency,
  confidence: candidate.confidence,
  raw_text: candidate.raw_text,
  dosesPerDay: dosesPerDay(candidate.frequency, candidate.raw_text),
  days_of_week: EVERY_DAY,
  pill_photo_path: null,
  voice_path: null,
  confirmed: false,
  expanded: false,
  ...windowFor(candidate.frequency),
})

export function OcrReview({
  patientId,
  onSave,
  saving,
  onClose,
}: {
  patientId: string
  /** Receives the confirmed rows as medication drafts, in order. */
  onSave: (drafts: MedicineDraft[]) => void
  saving?: boolean
  onClose: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ReviewRow[] | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const ocr = useOcrPrescription(patientId)

  const readFile = async (file: File | undefined) => {
    if (!file) return
    setFileError(null)
    ocr.reset()

    const mimeType = file.type === 'image/jpg' ? 'image/jpeg' : file.type
    const allowed = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
      'application/pdf',
    ])
    if (!allowed.has(mimeType)) {
      setFileError('Choose a JPEG, PNG, WebP, HEIC, HEIF, or PDF prescription.')
      return
    }

    let processed: File | Blob = file
    if (mimeType === 'image/jpeg' || mimeType === 'image/png' || mimeType === 'image/webp') {
      try {
        processed = await imageCompression(file, {
          maxSizeMB: 3,
          maxWidthOrHeight: 2400,
          useWebWorker: true,
        })
      } catch {
        setFileError('That image could not be prepared. Try a different photo or PDF.')
        return
      }
    }
    if (processed.size > 10 * 1024 * 1024) {
      setFileError('The prescription must be 10 MB or smaller.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result)
      const base64 = result.slice(result.indexOf(',') + 1)
      const processedMimeType = processed.type === 'image/jpg'
        ? 'image/jpeg'
        : processed.type || mimeType
      ocr.mutate({ base64, mimeType: processedMimeType }, {
        onSuccess: (data) => setRows(data.medications.map(toReviewRow)),
      })
    }
    reader.onerror = () => setFileError('That file could not be read. Try choosing it again.')
    reader.readAsDataURL(processed)
  }

  const update = (key: string, patch: Partial<ReviewRow>) =>
    setRows((current) =>
      current ? current.map((row) => (row.key === key ? { ...row, ...patch } : row)) : current,
    )

  const validRow = (row: ReviewRow) =>
    Boolean(row.name.trim() && row.dose.trim() && parseDaysOfWeek(row.days_of_week).length)
  const usable = (rows ?? []).filter(validRow)
  // Lines the OCR could not read and the caregiver has not filled in. They are
  // excluded from the save rather than blocking it forever — but never
  // silently, or a medicine on the prescription just quietly does not exist.
  const skipped = (rows ?? []).filter((row) => !validRow(row))
  const allConfirmed = usable.length > 0 && usable.every((row) => row.confirmed)
  const outstanding = usable.filter((row) => !row.confirmed).length

  return (
    <Card padding="lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[20px]">Read a prescription</h2>
          <p className="mt-1.5 max-w-[56ch] text-[14.5px] leading-relaxed text-body">
            Upload a clear photo or PDF of a printed or handwritten prescription. Smriti
            will pull out what it can, and you check every line before anything is saved.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      {!rows && (
        <div className="mt-6">
          <Button
            variant="accent"
            size="lg"
            onClick={() => fileRef.current?.click()}
            disabled={ocr.isPending}
          >
            <Camera className="size-4" />
            {ocr.isPending ? 'Reading…' : 'Scan a photo or PDF'}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.pdf"
            className="sr-only"
            onChange={(e) => {
              void readFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />

          {fileError && <p role="alert" className="mt-3 text-[13px] font-medium text-alert">{fileError}</p>}

          {ocr.isPending && (
            <div className="mt-6 space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          )}

          {ocr.error && (
            <div className="mt-5">
              <Notice tone="warn">
                <strong>Smriti could not read that prescription.</strong> Try a clearer photo
                or PDF, or add the medicines by hand.
              </Notice>
              <ErrorState error={ocr.error} className="mt-3" />
            </div>
          )}
        </div>
      )}

      {rows && (
        <>
          <Notice tone="warn" className="mt-5">
            <strong>Nothing here is scheduled yet.</strong> Smriti will not remind{' '}
            anyone about any of these until you have ticked every line individually. Check
            each one against the original prescription — the name, the dose, and the time
            Smriti proposes.
          </Notice>

          {rows.length === 0 && (
            <div className="mt-5">
              <Notice tone="warn">
                <strong>No medicine lines were found.</strong> Try a clearer photo or PDF,
                or add the medicines by hand.
              </Notice>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => {
                  setRows(null)
                  ocr.reset()
                }}
              >
                Choose another file
              </Button>
            </div>
          )}

          <div className="mt-5 space-y-3">
            {rows.map((row) => {
              const band = confidenceBand(row.confidence)
              const copy = CONFIDENCE_COPY[band]
              const uncertain = band !== 'high'

              return (
                <div
                  key={row.key}
                  className={cn(
                    'rounded-card border-2 p-4 transition-colors',
                    row.confirmed
                      ? 'border-sage/50 bg-sage-soft/50'
                      : uncertain
                        ? 'border-dashed border-alert/45 bg-alert/[0.04]'
                        : 'border-ink/[0.10] bg-ivory',
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Badge tone={copy.tone === 'sage' ? 'sage' : copy.tone === 'gold' ? 'gold' : 'alert'} size="sm">
                        {uncertain ? (
                          <AlertTriangle className="size-3" />
                        ) : (
                          <ShieldCheck className="size-3" />
                        )}
                        {copy.label}
                      </Badge>
                      <span className="text-[12.5px] text-muted">
                        {Math.round(row.confidence * 100)}% sure
                      </span>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Discard this line"
                      onClick={() => setRows((c) => c?.filter((r) => r.key !== row.key) ?? null)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>

                  <p className="mt-2 text-[13px] leading-snug text-body">{copy.help}</p>

                  <p className="mt-2 rounded-lg bg-ink/[0.04] px-3 py-2 font-mono text-[12.5px] text-muted">
                    {row.raw_text}
                  </p>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor={`ocr-name-${row.key}`}>Medicine</Label>
                      <Input
                        id={`ocr-name-${row.key}`}
                        className="mt-1.5"
                        value={row.name}
                        placeholder="Type it in"
                        onChange={(e) =>
                          update(row.key, { name: e.target.value, confirmed: false })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor={`ocr-dose-${row.key}`}>Dose</Label>
                      <Input
                        id={`ocr-dose-${row.key}`}
                        className="mt-1.5"
                        value={row.dose}
                        placeholder="Type it in"
                        onChange={(e) =>
                          update(row.key, { dose: e.target.value, confirmed: false })
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[13.5px] text-body">
                    <span>
                      Smriti will chime at{' '}
                      <strong className="numeral">{formatMinutes(row.chosen_time_min)}</strong>,{' '}
                      {describeDays(row.days_of_week).toLowerCase()}, anywhere between{' '}
                      {formatMinutes(row.window_start_min)} and{' '}
                      {formatMinutes(row.window_end_min)}.
                    </span>
                    <button
                      type="button"
                      onClick={() => update(row.key, { expanded: !row.expanded })}
                      className="font-semibold text-bark hover:underline"
                    >
                      {row.expanded ? 'Done' : 'Change the time'}
                    </button>
                  </div>

                  {row.dosesPerDay > 1 && (
                    <p className="mt-2 flex items-start gap-2 rounded-xl bg-alert/[0.07] px-3 py-2 text-[13px] leading-snug text-alert">
                      <AlertTriangle className="mt-0.5 size-3.5 flex-none" />
                      <span>
                        This line looks like <strong>{row.dosesPerDay} doses a day</strong>, and
                        Smriti can only propose one time per line. Save this one, then add the
                        other {row.dosesPerDay - 1} by hand — otherwise they will only be
                        reminded once.
                      </span>
                    </p>
                  )}

                  {row.expanded && (
                    <div className="mt-3 space-y-4">
                      <MedicineWindow
                        windowStart={row.window_start_min}
                        windowEnd={row.window_end_min}
                        chosenTime={row.chosen_time_min}
                        onChange={({ windowStart, windowEnd, chosenTime }) =>
                          update(row.key, {
                            window_start_min: windowStart,
                            window_end_min: windowEnd,
                            chosen_time_min: chosenTime,
                            confirmed: false,
                          })
                        }
                      />
                      <div>
                        <Label>Which days</Label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {DAY_LABELS.map((day, index) => (
                            <button
                              key={day}
                              type="button"
                              aria-pressed={isDayOn(row.days_of_week, index)}
                              onClick={() => update(row.key, {
                                days_of_week: toggleDay(row.days_of_week, index),
                                confirmed: false,
                              })}
                              className={cn(
                                'rounded-pill px-3.5 py-2 text-[13.5px] font-semibold transition-colors',
                                isDayOn(row.days_of_week, index)
                                  ? 'bg-terracotta text-ivory'
                                  : 'bg-sand text-body hover:bg-sand/70',
                              )}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <details className="mt-4 rounded-card border border-ink/[0.08] p-4">
                    <summary className="cursor-pointer text-[14.5px] font-semibold">
                      Add this pill’s photo and voice reminder
                    </summary>
                    <div className="mt-4 space-y-5">
                      <PhotoPicker
                        patientId={patientId}
                        label="Pill photo"
                        hint="Photograph the actual pill or packaging, not the prescription page."
                        value={row.pill_photo_path}
                        onChange={(path) => update(row.key, {
                          pill_photo_path: path,
                          confirmed: false,
                        })}
                      />
                      <VoiceRecorder
                        patientId={patientId}
                        value={row.voice_path}
                        onChange={(path) => update(row.key, {
                          voice_path: path,
                          confirmed: false,
                        })}
                        prompt="Say the medicine’s name and what it is for, in their language. The tablet plays this with the reminder."
                      />
                    </div>
                  </details>

                  {/* One tick per line. Deliberately not a "confirm all". */}
                  <label
                    className={cn(
                      'mt-4 flex cursor-pointer items-start gap-3 rounded-2xl p-3 transition-colors',
                      row.confirmed ? 'bg-sage/12' : 'bg-sand/60 hover:bg-sand',
                      !validRow(row) ? 'pointer-events-none opacity-50' : '',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={row.confirmed}
                      disabled={!validRow(row)}
                      onChange={(e) => update(row.key, { confirmed: e.target.checked })}
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mt-0.5 grid size-5 flex-none place-items-center rounded-md border-2 transition-colors',
                        row.confirmed
                          ? 'border-sage bg-sage text-ivory'
                          : 'border-ink/25 bg-ivory',
                      )}
                    >
                      {row.confirmed && <Check className="size-3.5" strokeWidth={3.5} />}
                    </span>
                    <span className="text-[13.5px] font-semibold leading-snug">
                      {row.confirmed
                        ? 'Checked against the prescription.'
                        : 'I have compared this line with the original prescription.'}
                    </span>
                  </label>
                </div>
              )
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-ink/[0.08] pt-5">
            <Button
              variant="accent"
              size="lg"
              // The rule, enforced: not one row saved until all of them are ticked.
              disabled={!allConfirmed || saving}
              onClick={() =>
                onSave(
                  usable.map((row) => ({
                    name: row.name,
                    dose: row.dose,
                    window_start_min: row.window_start_min,
                    window_end_min: row.window_end_min,
                    chosen_time_min: row.chosen_time_min,
                    days_of_week: row.days_of_week,
                    pill_photo_path: row.pill_photo_path,
                    voice_path: row.voice_path,
                  })),
                )
              }
            >
              {saving ? 'Saving…' : `Save ${usable.length} medicine${usable.length === 1 ? '' : 's'}`}
            </Button>

            <div className="text-[13.5px] text-muted">
              <p>
                {allConfirmed
                  ? 'Every line has been checked.'
                  : `${outstanding} line${outstanding === 1 ? '' : 's'} still to check.`}
              </p>
              {skipped.length > 0 && (
                <p className="mt-1 font-semibold text-alert">
                  {skipped.length} line{skipped.length === 1 ? '' : 's'} will not be saved —
                  they still need a name, dose, and at least one day. Complete them, or
                  discard them.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </Card>
  )
}
