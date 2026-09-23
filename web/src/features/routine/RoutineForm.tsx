import { useState } from 'react'

import { Button } from '@/components/ui/button.tsx'
import { Field, Input, Select } from '@/components/ui/field.tsx'
import { useTranslation } from '@/i18n/index.ts'
import { minutesToTimeInput, timeInputToMinutes } from '@/lib/utils.ts'
import { ROUTINE_ICONS } from './useRoutine.ts'
import type { RoutineItem } from '@smriti/shared'

export type RoutineDraft = {
  id?: string
  label_key: string
  icon_asset: string
  time_min: number
}

export const emptyRoutine = (): RoutineDraft => ({
  label_key: '',
  icon_asset: 'tea',
  time_min: 420,
})

export const toRoutineDraft = (row: RoutineItem): RoutineDraft => ({
  id: row.id,
  label_key: row.label_key,
  icon_asset: row.icon_asset,
  time_min: row.time_min,
})

/**
 * A routine item: a time, a name, and a picture the tablet can draw.
 *
 * The icon is a `<select>` over the fixed set the Flutter app ships assets for
 * rather than a free-text field, because `icon_asset` is free text server-side
 * and anything outside that set renders as an empty card on the patient's home
 * screen — a silent failure the caregiver would never see.
 */
export function RoutineForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  saving,
  submitLabel,
  disabled,
}: {
  value: RoutineDraft
  onChange: (next: RoutineDraft) => void
  onSubmit: () => void
  onCancel?: () => void
  saving?: boolean
  submitLabel?: string
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const [touched, setTouched] = useState(false)
  const labelError = touched && !value.label_key.trim() ? t('routine.form.labelError') : undefined
  const valid = Boolean(value.label_key.trim())

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setTouched(true)
        if (valid) onSubmit()
      }}
      className="space-y-4"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
        <Field label={t('routine.form.label')} htmlFor="routine-label" required error={labelError}>
          <Input
            id="routine-label"
            value={value.label_key}
            onChange={(e) => onChange({ ...value, label_key: e.target.value })}
            placeholder={t('routine.form.placeholder')}
            disabled={disabled}
            aria-invalid={Boolean(labelError)}
          />
        </Field>

        <Field label={t('routine.form.time')} htmlFor="routine-time">
          <Input
            id="routine-time"
            type="time"
            step={300}
            value={minutesToTimeInput(value.time_min)}
            onChange={(e) => onChange({ ...value, time_min: timeInputToMinutes(e.target.value) })}
            disabled={disabled}
            className="w-36"
          />
        </Field>

        <Field label={t('routine.form.picture')} htmlFor="routine-icon">
          <Select
            id="routine-icon"
            value={value.icon_asset}
            onChange={(e) => onChange({ ...value, icon_asset: e.target.value })}
            disabled={disabled}
            className="w-44"
          >
            {ROUTINE_ICONS.map((icon) => (
              <option key={icon.value} value={icon.value}>
                {t(icon.key)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="accent" disabled={saving || disabled}>
          {saving ? t('common.saving') : submitLabel ?? t('common.save')}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
            {t('common.cancel')}
          </Button>
        )}
      </div>
    </form>
  )
}
