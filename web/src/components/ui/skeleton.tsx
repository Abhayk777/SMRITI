import { cn } from '@/lib/utils.ts'

/**
 * Loading states are skeletons, never spinners.
 *
 * A spinner says "something is happening". A skeleton says "a card with a name,
 * a time and two figures is about to appear here" — which is what a caregiver
 * opening the app at lunch on a slow connection actually needs, because the
 * page stops jumping under them when the data lands.
 */
export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('skeleton', className)} aria-hidden="true" {...props} />
}

/** A block of text lines, last one short like real prose. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-3.5', i === lines - 1 ? 'w-2/5' : 'w-full')} />
      ))}
    </div>
  )
}

/** Matches the shape of a stat tile so the number does not shift on arrival. */
export function SkeletonStat({ className }: { className?: string }) {
  return (
    <div className={cn('stitched rounded-card border-[#E7D9C2] bg-ivory p-5', className)}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-9 w-20" />
      <Skeleton className="mt-2 h-3 w-32" />
    </div>
  )
}

export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-4 rounded-card bg-[#F1E6D5] p-4', className)}>
      <Skeleton className="size-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}

export function SkeletonChart({ className }: { className?: string }) {
  return (
    <div className={cn('stitched rounded-card border-[#E7D9C2] bg-ivory p-6', className)}>
      <Skeleton className="h-3.5 w-40" />
      <div className="mt-6 flex h-48 items-end gap-2">
        {[38, 62, 48, 74, 55, 81, 44, 69, 58, 77, 51, 66].map((h, i) => (
          <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  )
}
