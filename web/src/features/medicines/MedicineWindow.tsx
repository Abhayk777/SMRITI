import { Slider } from '@/components/ui/controls.tsx'
import { Label } from '@/components/ui/field.tsx'
import { useTranslation } from '@/i18n/index.ts'
import { clampToWindow } from './useMedicines.ts'

/** Quarter-hour steps. Finer than that is false precision for a pill reminder. */
const STEP = 15

/**
 * The medicine window and the chosen time.
 *
 * The server enforces `window_start_min ≤ chosen_time_min ≤ window_end_min`
 * with a check constraint. frontend.md §8 is explicit that the UI must make
 * that constraint **structurally unreachable** rather than lean on the database
 * to reject it — a caregiver who submits an invalid time and is handed a raw
 * Postgres constraint violation has learned nothing about what they did wrong.
 *
 * Two things make it unreachable here:
 *
 *   1. The chosen-time slider's own `min` and `max` **are** the window bounds.
 *      There is no position on it that lies outside the window; the invalid
 *      state cannot be expressed, not merely rejected.
 *   2. Dragging the window carries the chosen time with it. Narrowing a window
 *      past the chosen time clamps it to the new edge rather than leaving an
 *      invalid pair behind.
 *
 * ── One limitation, stated plainly ────────────────────────────────────────
 * A window that crosses midnight (start 22:00, end 02:00) cannot be expressed
 * on this control, and this form will not produce one. The schema stores
 * minutes with modulo-1440 arithmetic, so the *database* would accept it, but
 * the check constraint as written (`chosen between start and end`) would not.
 * A genuine overnight window needs a server-side decision first; a night-time
 * dose inside one day is fully supported.
 */
export function MedicineWindow({
  windowStart,
  windowEnd,
  chosenTime,
  onChange,
  disabled,
}: {
  windowStart: number
  windowEnd: number
  chosenTime: number
  onChange: (next: { windowStart: number; windowEnd: number; chosenTime: number }) => void
  disabled?: boolean
}) {
  const { t, formatTimeMinutes } = useTranslation()
  const setWindow = ([start, end]: number[]) => {
    // Keep at least one step of width, or the chosen slider has nowhere to go.
    const safeEnd = Math.max(end, start + STEP)
    onChange({
      windowStart: start,
      windowEnd: safeEnd,
      chosenTime: clampToWindow(chosenTime, start, safeEnd),
    })
  }

  return (
    <div className="space-y-6 rounded-card bg-sand/50 p-5">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Label>{t('medicineWindow.acceptableTime')}</Label>
          <span className="numeral text-[15px]">
            {formatTimeMinutes(windowStart)} – {formatTimeMinutes(windowEnd)}
          </span>
        </div>
        <p className="mt-1 text-[13px] leading-snug text-muted">
          {t('medicineWindow.acceptableHint')}
        </p>
        <Slider
          value={[windowStart, windowEnd]}
          onValueChange={setWindow}
          min={0}
          max={1439}
          step={STEP}
          minStepsBetweenThumbs={1}
          disabled={disabled}
          aria-label={t('medicineWindow.windowAriaLabel')}
          className="mt-2"
        />
      </div>

      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Label>{t('medicineWindow.reminderTime')}</Label>
          <span className="numeral text-[15px]">{formatTimeMinutes(chosenTime)}</span>
        </div>
        <p className="mt-1 text-[13px] leading-snug text-muted">
          {t('medicineWindow.reminderHint')}
        </p>
        <Slider
          value={[chosenTime]}
          onValueChange={([value]) => onChange({ windowStart, windowEnd, chosenTime: value })}
          // These bounds are the whole mechanism: the invalid state has no
          // position on the track.
          min={windowStart}
          max={windowEnd}
          step={STEP}
          disabled={disabled}
          aria-label={t('medicineWindow.reminderAriaLabel')}
          className="mt-2"
        />
        <div className="mt-1 flex justify-between text-[12px] text-muted">
          <span>{formatTimeMinutes(windowStart)}</span>
          <span>{formatTimeMinutes(windowEnd)}</span>
        </div>
      </div>
    </div>
  )
}
