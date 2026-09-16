import * as SliderPrimitive from '@radix-ui/react-slider'
import { Moon, RotateCcw, Sun } from 'lucide-react'

import { cn, formatMinutes } from '@/lib/utils.ts'
import { arcProgress, minutesToScrub, scrubToMinutes, SKY_SCRUB_MAX } from './sky.ts'

/**
 * The handle on the sky.
 *
 * The backdrop follows the patient's clock on its own; this lets someone push
 * the sun and moon along that same arc by hand — to see the evening light
 * before the evening, or simply because it is pleasant. The first half of the
 * travel walks the sun from sunrise to dusk, the second half the moon from
 * dusk back round to first light, so the two swap at the midpoint.
 *
 * It changes nothing but the backdrop. "Their sky" in the sidebar, and every
 * time shown anywhere in the app, stay on the real clock — so the scrubber can
 * never make the app report a time that is not the patient's. Once it has been
 * moved, a "Real time" button appears: it is named for where the sky started,
 * rather than for the act of resetting, so that the real clock reads as the
 * default a hand-moved sky is borrowed from.
 *
 * It is deliberately small and quiet: pinned to the bottom-right corner rather
 * than centred, half-faded until it is pointed at or focused, and out of the
 * way of the reading column. It is an ornament for the room the app is drawn
 * in, so it must never compete with the screen's actual work.
 */
export function SkyScrubber({
  value,
  realMinutes,
  onChange,
  onReset,
}: {
  /** Current scrubber position, or `null` while the sky follows the clock. */
  value: number | null
  realMinutes: number
  onChange: (value: number) => void
  onReset: () => void
}) {
  const minutes = value === null ? realMinutes : scrubToMinutes(value)
  const { body } = arcProgress(minutes)
  const overridden = value !== null
  const Body = body === 'sun' ? Sun : Moon

  return (
    <div className="pointer-events-none fixed bottom-3 right-3 z-30 sm:bottom-4 sm:right-4">
      <div
        className={cn(
          'pointer-events-auto flex items-center gap-2 rounded-pill border border-[#E7D9C2] bg-ivory/90 px-2.5 py-1.5',
          'shadow-sm transition-opacity duration-300 hover:opacity-100 focus-within:opacity-100',
          overridden ? 'opacity-100' : 'opacity-45',
        )}
      >
        <Body
          aria-hidden="true"
          className={
            body === 'sun' ? 'size-[13px] flex-none text-gold' : 'size-[13px] flex-none text-muted'
          }
        />

        <SliderPrimitive.Root
          className="relative flex w-[112px] touch-none select-none items-center py-1.5 sm:w-[136px]"
          min={0}
          max={SKY_SCRUB_MAX}
          step={5}
          value={[value ?? minutesToScrub(realMinutes)]}
          onValueChange={([next]) => onChange(next)}
          aria-label="Move the sun and moon across the sky"
        >
          <SliderPrimitive.Track className="relative h-[3px] w-full grow rounded-pill bg-sand">
            <SliderPrimitive.Range className="absolute h-full rounded-pill bg-terracotta/70" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb className="block size-[11px] rounded-full border-2 border-terracotta bg-ivory shadow-sm transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/30" />
        </SliderPrimitive.Root>

        <p className="numeral w-[52px] flex-none text-right text-[11px] leading-none text-muted tabular-nums">
          {formatMinutes(minutes)}
        </p>

        {overridden && (
          <button
            type="button"
            onClick={onReset}
            title="Put the sky back on the real time"
            className="flex flex-none items-center gap-1 rounded-pill px-2 py-1 text-[11px] font-semibold leading-none text-bark transition-colors hover:bg-sand/70 hover:text-bark-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/30"
          >
            <RotateCcw className="size-[11px]" />
            Real time
          </button>
        )}
      </div>
    </div>
  )
}

export default SkyScrubber
