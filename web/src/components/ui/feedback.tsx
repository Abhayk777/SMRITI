import type { ReactNode } from 'react'
import { AlertTriangle, Info, ShieldOff } from 'lucide-react'

import { Logomark } from '@/components/brand/Logomark.tsx'
import { JapiRosette } from '@/components/ner/JapiRosette.tsx'
import { cn } from '@/lib/utils.ts'

/**
 * Empty states.
 *
 * Every list in this app can legitimately be empty — a newly created profile
 * has no memos, no flags and no history — so "nothing here" is a normal state,
 * not an error, and it gets a real design: what this list is for, and the one
 * action that fills it. A blank panel with the word "None" teaches a caregiver
 * nothing and makes a working app look broken.
 */
export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center overflow-hidden rounded-card border-[1.5px] border-[#E2D3B9] bg-[#F3EADB] px-6 pb-12 pt-14 text-center',
        className,
      )}
    >
      {/* A strip of Ryndia check along the top: an empty list reads as a
          length of cloth waiting to be filled, not a missing panel. */}
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 bg-ryndia opacity-80" />
      <div className="relative grid size-14 place-items-center rounded-full bg-ivory text-terracotta/70 ring-1 ring-ink/[0.06]">
        {icon ?? <Logomark size={24} decorative />}
        <JapiRosette
          size={76}
          strokeWidth={1}
          className="pointer-events-none absolute text-bark/15"
        />
      </div>
      <p className="mt-4 font-heading text-lg font-bold">{title}</p>
      {description && (
        <p className="mt-2 max-w-[44ch] text-sm leading-relaxed text-body">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/**
 * A failed query. Deliberately distinguishes "you don't have access" from
 * "something went wrong", because the first is a permanent answer the
 * caregiver can act on and the second is worth retrying.
 */
export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: unknown
  onRetry?: () => void
  className?: string
}) {
  const message = error instanceof Error ? error.message : String(error ?? 'Unknown error')
  const isPermission =
    /permission|policy|not authori|caregiver only|row-level/i.test(message)

  return (
    <div
      role="alert"
      className={cn(
        'rounded-card border px-5 py-5',
        isPermission ? 'border-ink/12 bg-sand/50' : 'border-alert/25 bg-alert/[0.06]',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn('mt-0.5', isPermission ? 'text-muted' : 'text-alert')}>
          {isPermission ? <ShieldOff className="size-5" /> : <AlertTriangle className="size-5" />}
        </span>
        <div className="min-w-0">
          <p className="font-heading font-bold">
            {isPermission ? "You don't have access to this" : "This didn't load"}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-body">
            {isPermission
              ? 'Ask whoever set up this profile to add you, or check you are signed in with the right number.'
              : message}
          </p>
          {onRetry && !isPermission && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 text-sm font-semibold text-bark underline-offset-4 hover:underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/** A quiet in-page notice. Used for "coming soon" and read-only explanations. */
export function Notice({
  children,
  tone = 'info',
  className,
}: {
  children: ReactNode
  tone?: 'info' | 'warn'
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-2xl px-4 py-3 text-sm leading-relaxed',
        tone === 'info' ? 'bg-sand/60 text-body' : 'bg-gold/12 text-[#6F4E0C]',
        className,
      )}
    >
      {tone === 'info' ? (
        <Info className="mt-0.5 size-4 flex-none text-muted" />
      ) : (
        <AlertTriangle className="mt-0.5 size-4 flex-none text-gold" />
      )}
      <div className="min-w-0">{children}</div>
    </div>
  )
}
