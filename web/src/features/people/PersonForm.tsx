import { useState } from 'react'

import { PhotoPicker } from '@/components/media/PhotoPicker.tsx'
import { VoiceRecorder } from '@/components/media/VoiceRecorder.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Switch } from '@/components/ui/controls.tsx'
import { Field, Input, Label, Textarea } from '@/components/ui/field.tsx'
import type { Person } from '@smriti/shared'

export type PersonDraft = {
  id?: string
  name: string
  relationship: string
  photo_path: string | null
  voice_path: string | null
  memory_prompt: string
  is_deceased: boolean
  sort_order: number
}

export const emptyPerson = (sortOrder = 0): PersonDraft => ({
  name: '',
  relationship: '',
  photo_path: null,
  voice_path: null,
  memory_prompt: '',
  is_deceased: false,
  sort_order: sortOrder,
})

export const toPersonDraft = (row: Person): PersonDraft => ({
  id: row.id,
  name: row.name,
  relationship: row.relationship,
  photo_path: row.photo_path,
  voice_path: row.voice_path,
  memory_prompt: row.memory_prompt ?? '',
  is_deceased: row.is_deceased,
  sort_order: row.sort_order,
})

/**
 * Adding someone to a patient's circle.
 *
 * `photo_path` is required by the schema and by the games — a person without a
 * face is not something the tablet can show them. The form says so rather than
 * letting the insert fail.
 *
 * The "no longer with us" switch is not an edge case. Getting it wrong means
 * the tablet asks an older person where their late husband is today, and
 * that is the single worst thing this product could do. It is prominent, it is
 * explained, and it is on the same screen as the name.
 */
export function PersonForm({
  patientId,
  value,
  onChange,
  onSubmit,
  onCancel,
  saving,
  submitLabel = 'Save',
  disabled,
}: {
  patientId: string
  value: PersonDraft
  onChange: (next: PersonDraft) => void
  onSubmit: () => void
  onCancel?: () => void
  saving?: boolean
  submitLabel?: string
  disabled?: boolean
}) {
  const [touched, setTouched] = useState(false)

  const nameError = touched && !value.name.trim() ? 'A first name is enough' : undefined
  const relError = touched && !value.relationship.trim() ? 'What is their relationship to the patient?' : undefined
  const photoError =
    touched && !value.photo_path ? 'A photo is needed — the tablet shows the face' : undefined

  const valid = Boolean(value.name.trim() && value.relationship.trim() && value.photo_path)

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
      <div>
        <Label className="mb-2">Photo *</Label>
        <PhotoPicker
          patientId={patientId}
          value={value.photo_path}
          onChange={(path) => onChange({ ...value, photo_path: path })}
        />
        {photoError && (
          <p role="alert" className="mt-1 text-[13px] font-medium text-alert">
            {photoError}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="person-name" required error={nameError}>
          <Input
            id="person-name"
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            placeholder="Divya"
            disabled={disabled}
            aria-invalid={Boolean(nameError)}
          />
        </Field>

        <Field
          label="Relationship"
          htmlFor="person-rel"
          required
          hint="As they would say it."
          error={relError}
        >
          <Input
            id="person-rel"
            value={value.relationship}
            onChange={(e) => onChange({ ...value, relationship: e.target.value })}
            placeholder="Daughter"
            disabled={disabled}
            aria-invalid={Boolean(relError)}
          />
        </Field>
      </div>

      <Field
        label="One thing to remember them by"
        htmlFor="person-prompt"
        hint="Smriti uses this to start a conversation about them. A detail, not a biography."
      >
        <Textarea
          id="person-prompt"
          value={value.memory_prompt}
          onChange={(e) => onChange({ ...value, memory_prompt: e.target.value })}
          placeholder="Divya calls every Sunday evening from Seattle."
          disabled={disabled}
          maxLength={280}
        />
      </Field>

      <div>
        <Label className="mb-2">Their voice</Label>
        <VoiceRecorder
          patientId={patientId}
          value={value.voice_path}
          onChange={(path) => onChange({ ...value, voice_path: path })}
          prompt="If they are nearby, have them say their own name and how they are related — “Divya, your daughter”. A familiar voice does something a caption cannot."
        />
      </div>

      <div className="flex items-start gap-4 rounded-card bg-sand/50 p-4">
        <Switch
          id="person-deceased"
          checked={value.is_deceased}
          onCheckedChange={(checked) => onChange({ ...value, is_deceased: checked })}
          disabled={disabled}
        />
        <div className="min-w-0">
          <Label htmlFor="person-deceased" className="normal-case tracking-normal">
            This person has passed away
          </Label>
          <p className="mt-1 text-[13px] leading-relaxed text-body">
            Please set this if it applies. Smriti will still show their photograph and talk
            about them warmly, but it will never ask them where they are or when they are
            coming.
          </p>
        </div>
      </div>

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
