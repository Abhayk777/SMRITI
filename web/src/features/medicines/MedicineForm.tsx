import { useState } from 'react'

import { PhotoPicker } from '@/components/media/PhotoPicker.tsx'
import { VoiceRecorder } from '@/components/media/VoiceRecorder.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Field, Input, Label } from '@/components/ui/field.tsx'
import {
  cn,
  DAY_LABELS,
  describeDays,
  EVERY_DAY,
  isDayOn,
  normaliseDaysOfWeek,
  parseDaysOfWeek,
  toggleDay,
} from '@/lib/utils.ts'
import { MedicineWindow } from './MedicineWindow.tsx'
import type { Medication } from '@smriti/shared'

export type MedicineDraft = {
  id?: string
  name: string
  dose: string
  window_start_min: number
  window_end_min: number
  chosen_time_min: number
  days_of_week: string
  pill_photo_path: string | null
  voice_path: string | null
}

export const emptyMedicine = (): MedicineDraft => ({
  name: '',
  dose: '',
  window_start_min: 480,
  window_end_min: 660,
  chosen_time_min: 540,
  days_of_week: EVERY_DAY,
  pill_photo_path: null,
  voice_path: null,
})

export const toDraft = (row: Medication): MedicineDraft => ({
  id: row.id,
  name: row.name,
  dose: row.dose,
  window_start_min: row.window_start_min,
  window_end_min: row.window_end_min,
  chosen_time_min: row.chosen_time_min,
  days_of_week: normaliseDaysOfWeek(row.days_of_week),
  pill_photo_path: row.pill_photo_path,
  voice_path: row.voice_path,
})

/**
 * The medicine form, shared by the setup wizard and the Medicines page.
 *
 * The window control is where the real work is — see `MedicineWindow`. The rest
 * is deliberately plain: a name, a dose in the caregiver's own words, the days,
 * and two optional pieces of media that make the reminder land better on the
 * tablet than text alone would.
 */
export function MedicineForm({
  patientId,
  value,
  onChange,
  onSubmit,
  onCancel,
  saving,
  submitLabel = 'Save medicine',
  disabled,
}: {
  patientId: string
  value: MedicineDraft
  onChange: (next: MedicineDraft) => void
  onSubmit: () => void
  onCancel?: () => void
  saving?: boolean
  submitLabel?: string
  disabled?: boolean
}) {
  const [touched, setTouched] = useState(false)

  const nameError = touched && !value.name.trim() ? 'What is it called?' : undefined
  const doseError = touched && !value.dose.trim() ? 'How much, and how?' : undefined
  const daysError = touched && parseDaysOfWeek(value.days_of_week).length === 0
    ? 'Pick at least one day'
    : undefined

  const valid = Boolean(
    value.name.trim() && value.dose.trim() && parseDaysOfWeek(value.days_of_week).length,
  )

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setTouched(true)
        if (valid) onSubmit()
      }}
      className="space-y-5"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Medicine" htmlFor="med-name" required error={nameError}>
          <Input
            id="med-name"
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            placeholder="Amlodipine"
            disabled={disabled}
            aria-invalid={Boolean(nameError)}
          />
        </Field>

        <Field
          label="Dose"
          htmlFor="med-dose"
          required
          hint="In the words you would use with her."
          error={doseError}
        >
          <Input
            id="med-dose"
            value={value.dose}
            onChange={(e) => onChange({ ...value, dose: e.target.value })}
            placeholder="One white tablet, after breakfast"
            disabled={disabled}
            aria-invalid={Boolean(doseError)}
          />
        </Field>
      </div>

      <MedicineWindow
        windowStart={value.window_start_min}
        windowEnd={value.window_end_min}
        chosenTime={value.chosen_time_min}
        disabled={disabled}
        onChange={({ windowStart, windowEnd, chosenTime }) =>
          onChange({
            ...value,
            window_start_min: windowStart,
            window_end_min: windowEnd,
            chosen_time_min: chosenTime,
          })
        }
      />

      <div>
        <Label>Which days</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {DAY_LABELS.map((day, index) => {
            const on = isDayOn(value.days_of_week, index)
            return (
              <button
                key={day}
                type="button"
                disabled={disabled}
                aria-pressed={on}
                onClick={() =>
                  onChange({ ...value, days_of_week: toggleDay(value.days_of_week, index) })
                }
                className={cn(
                  'rounded-pill px-3.5 py-2 text-[13.5px] font-semibold transition-colors',
                  on
                    ? 'bg-terracotta text-ivory'
                    : 'bg-sand text-body hover:bg-sand/70',
                )}
              >
                {day}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-[13px] text-muted">{describeDays(value.days_of_week)}</p>
        {daysError && (
          <p role="alert" className="mt-1 text-[13px] font-medium text-alert">
            {daysError}
          </p>
        )}
      </div>

      <details className="rounded-card border border-ink/[0.08] p-4">
        <summary className="cursor-pointer text-[14.5px] font-semibold">
          Add a photo of the pill, or say the name out loud
        </summary>
        <div className="mt-4 space-y-5">
          <PhotoPicker
            patientId={patientId}
            label="Pill photo"
            hint="A clear photo of the pill. We shrink it before sending, so the tablet loads it fast."
            value={value.pill_photo_path}
            onChange={(path) => onChange({ ...value, pill_photo_path: path })}
          />
          <VoiceRecorder
            patientId={patientId}
            value={value.voice_path}
            onChange={(path) => onChange({ ...value, voice_path: path })}
            prompt="Say the medicine's name and what it is for, in her language. The tablet plays this with the reminder."
          />
        </div>
      </details>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="accent" disabled={saving || disabled}>
          {saving ? 'Saving…' : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
