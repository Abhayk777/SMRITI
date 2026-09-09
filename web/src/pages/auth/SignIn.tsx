import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { useAuth } from '@/auth/useAuth.ts'
import { Logomark } from '@/components/brand/Logomark.tsx'
import { Wordmark } from '@/components/brand/Wordmark.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Field, Input } from '@/components/ui/field.tsx'
import { Notice } from '@/components/ui/feedback.tsx'
import { isMockMode } from '@/lib/supabase.ts'
import { FRESH_SIGNIN_KEY } from '@/routes/RootRedirect.tsx'

/**
 * Phone + OTP, Supabase Auth's native flow (frontend.md §3). There is nothing
 * custom to build here beyond the UI, and deliberately so — a bespoke auth path
 * in a health app is a liability, not a feature.
 *
 * `family_viewer` accounts sign in through exactly this screen. They differ
 * only by the role on their `patient_members` rows; the UI adapts by role, not
 * by a separate login.
 *
 * On success the app always routes through `/`, never straight to a patient —
 * the patient-count redirect in §4 decides where a caregiver belongs, and this
 * screen has no business guessing.
 */

const phoneSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(1, 'Enter the mobile number you signed up with')
    .regex(/^\+[1-9]\d{7,14}$/, 'Include the country code, like +91 98765 43210'),
})

const otpSchema = z.object({
  token: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'The code is six digits'),
})

type PhoneValues = z.infer<typeof phoneSchema>
type OtpValues = z.infer<typeof otpSchema>

const RESEND_SECONDS = 45

export default function SignIn() {
  const { sendOtp, verifyOtp, session } = useAuth()
  const navigate = useNavigate()
  const [phone, setPhone] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (session) navigate('/', { replace: true })
  }, [session, navigate])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  const phoneForm = useForm<PhoneValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: '' },
  })

  const otpForm = useForm<OtpValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { token: '' },
  })

  // Move the cursor into the code field the moment the step changes. Via
  // react-hook-form's own `setFocus` rather than a ref of our own: the input is
  // remounted between the two steps, and a ref captured before that remount
  // points at a detached node.
  const { setFocus } = otpForm
  useEffect(() => {
    if (phone) setFocus('token')
  }, [phone, setFocus])

  const requestCode = async (values: PhoneValues) => {
    setServerError(null)
    try {
      await sendOtp(values.phone)
      setPhone(values.phone)
      setCooldown(RESEND_SECONDS)
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Could not send the code')
    }
  }

  const submitCode = async (values: OtpValues) => {
    if (!phone) return
    setServerError(null)
    try {
      await verifyOtp(phone, values.token)
      // Tells the root route to play the logo splash once, on this arrival only.
      sessionStorage.setItem(FRESH_SIGNIN_KEY, '1')
      navigate('/', { replace: true })
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : 'That code did not work. Try again.',
      )
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Left: the brand side. Hidden on small screens, where the form is all
          that matters and vertical space is scarce. */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-terracotta p-12 text-ivory lg:flex">
        <Link to="/" className="flex items-center gap-2.5">
          <Logomark size={26} color="var(--color-cream)" decorative />
          <Wordmark size={19} color="var(--color-cream)" />
        </Link>

        <div className="max-w-[26ch]">
          <h2 className="text-[clamp(28px,2.8vw,40px)] leading-[1.1] text-ivory">
            Be close to their day, from wherever you are.
          </h2>
          <p className="mt-4 text-[15.5px] leading-relaxed text-ivory/80">
            Sign in with the mobile number your family uses. We will send a six-digit code.
          </p>
        </div>

        <div className="pointer-events-none absolute -bottom-24 -right-24 opacity-[0.08]">
          <Logomark size={420} color="var(--color-cream)" strokeWidth={8.6} decorative />
        </div>

        <p className="text-[13px] text-ivory/55">
          Smriti (स्मृति) is Sanskrit for memory — what is kept, and what is passed on.
        </p>
      </aside>

      {/* Right: the form. */}
      <main className="flex items-center justify-center bg-ivory px-5 py-14 sm:px-10">
        <div className="w-full max-w-[400px]">
          <Link to="/" className="mb-10 flex items-center gap-2.5 text-terracotta lg:hidden">
            <Logomark size={24} decorative />
            <Wordmark size={18} color="var(--color-ink)" />
          </Link>

          {isMockMode && (
            <Notice tone="warn" className="mb-6">
              No Supabase credentials are configured, so this is a demo. Any number and any
              six digits will sign you in, and nothing you save is real.
            </Notice>
          )}

          {!phone ? (
            <>
              <h1 className="text-[28px]">Sign in</h1>
              <p className="mb-7 mt-2 text-[15px] leading-relaxed text-body">
                Enter your mobile number and we will text you a code. No password to
                remember.
              </p>

              <form onSubmit={phoneForm.handleSubmit(requestCode)} noValidate>
                <Field
                  label="Mobile number"
                  htmlFor="phone"
                  hint="Include the country code."
                  error={phoneForm.formState.errors.phone?.message ?? serverError ?? undefined}
                >
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+91 98765 43210"
                    aria-invalid={Boolean(phoneForm.formState.errors.phone)}
                    {...phoneForm.register('phone')}
                  />
                </Field>

                <Button
                  type="submit"
                  variant="accent"
                  size="lg"
                  className="mt-2 w-full"
                  disabled={phoneForm.formState.isSubmitting}
                >
                  {phoneForm.formState.isSubmitting ? 'Sending…' : 'Send me a code'}
                </Button>
              </form>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setPhone(null)
                  setServerError(null)
                  otpForm.reset()
                }}
                className="mb-5 flex items-center gap-1.5 text-sm font-semibold text-bark hover:underline"
              >
                <ArrowLeft className="size-4" />
                Use a different number
              </button>

              <h1 className="text-[28px]">Enter your code</h1>
              <p className="mb-7 mt-2 text-[15px] leading-relaxed text-body">
                We sent six digits to <span className="font-semibold text-ink">{phone}</span>.
              </p>

              <form onSubmit={otpForm.handleSubmit(submitCode)} noValidate>
                <Field
                  label="Six-digit code"
                  htmlFor="token"
                  error={otpForm.formState.errors.token?.message ?? serverError ?? undefined}
                >
                  <Input
                    id="token"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="123456"
                    className="text-center font-heading text-2xl tracking-[0.5em]"
                    aria-invalid={Boolean(otpForm.formState.errors.token)}
                    {...otpForm.register('token')}
                  />
                </Field>

                <Button
                  type="submit"
                  variant="accent"
                  size="lg"
                  className="mt-2 w-full"
                  disabled={otpForm.formState.isSubmitting}
                >
                  {otpForm.formState.isSubmitting ? 'Checking…' : 'Sign in'}
                </Button>

                <button
                  type="button"
                  disabled={cooldown > 0}
                  onClick={() => void requestCode({ phone })}
                  className="mt-4 w-full text-center text-sm text-muted disabled:opacity-60"
                >
                  {cooldown > 0 ? `Send again in ${cooldown}s` : 'Send the code again'}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
