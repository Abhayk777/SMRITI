import { Logomark } from '@/components/brand/Logomark.tsx'
import { JapiRosette } from '@/components/ner/JapiRosette.tsx'

/**
 * The full-page waiting state used while a route decides what to render.
 *
 * Not a skeleton, because there is no known shape yet — at this point the app
 * genuinely does not know whether the next screen is a dashboard, an overview
 * or a setup wizard. It is the mark, breathing, inside a japi crown that
 * weaves itself in ring by ring and then turns slowly, with a label that says
 * what is being waited on. Short-lived by design; if a caregiver sees this for
 * more than a moment, something upstream is wrong.
 */
export function FullPageLoading({ label }: { label?: string }) {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-ivory"
      role="status"
      aria-live="polite"
    >
      <div className="relative grid size-[104px] place-items-center">
        <div className="absolute inset-0 text-terracotta/35 animate-spin-slow">
          <JapiRosette size={104} strokeWidth={1.3} draw />
        </div>
        <Logomark size={40} color="var(--color-terracotta)" className="animate-pulse" decorative />
      </div>
      <p className="text-sm text-muted">{label ?? 'Loading'}</p>
    </div>
  )
}
