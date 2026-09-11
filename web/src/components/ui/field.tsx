import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'

import { cn } from '@/lib/utils.ts'

export function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn(
        'block text-[13px] font-semibold tracking-[0.01em] text-muted uppercase',
        className,
      )}
      {...props}
    />
  )
}

/*
 * Controls take the same warm 1.5px edge as the cards, darken under the
 * pointer, and on focus turn terracotta with a soft ring and a warm fill — so
 * the field being typed into is unmistakable on a busy form.
 */
const controlClasses =
  'w-full rounded-2xl border-[1.5px] border-[#DCCBAE] bg-ivory px-4 text-ink placeholder:text-muted/60 ' +
  'shadow-[inset_0_1px_2px_rgba(74,36,19,0.05)] transition-[border-color,box-shadow,background-color] duration-200 outline-none ' +
  'hover:border-[#C9B28D] focus-visible:border-terracotta focus-visible:bg-[#FFFBF5] focus-visible:ring-4 ' +
  'focus-visible:ring-terracotta/15 disabled:cursor-not-allowed disabled:opacity-60 ' +
  'aria-[invalid=true]:border-alert aria-[invalid=true]:ring-alert/20'

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return <input className={cn(controlClasses, 'h-12 text-[15px]', className)} {...props} />
}

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(controlClasses, 'min-h-24 resize-y py-3 text-[15px] leading-relaxed', className)}
      {...props}
    />
  )
}

export function Select({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(controlClasses, 'h-12 appearance-none pr-10 text-[15px]', className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23645C50' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 14px center',
        backgroundSize: '18px',
      }}
      {...props}
    />
  )
}

export type FieldProps = {
  label: string
  htmlFor?: string
  /** Shown under the label. Say what the value is *for*, not what it is. */
  hint?: string
  error?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}

/**
 * Label + control + hint + error, in the one arrangement used everywhere.
 *
 * The error is rendered in an `aria-live` region so a screen reader announces
 * a validation failure without the caregiver having to hunt for it — this app
 * is used one-handed, at speed, often while on the phone to a parent.
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-1 text-alert">*</span>}
      </Label>
      {hint && <p className="-mt-1 text-[13px] leading-snug text-muted">{hint}</p>}
      {children}
      <p aria-live="polite" className="min-h-[1rem] text-[13px] font-medium text-alert">
        {error}
      </p>
    </div>
  )
}
