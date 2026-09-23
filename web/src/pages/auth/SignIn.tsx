import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { useAuth } from '@/auth/useAuth.ts'
import { Logomark } from '@/components/brand/Logomark.tsx'
import { Wordmark } from '@/components/brand/Wordmark.tsx'
import { LocaleSelector } from '@/components/i18n/LocaleSelector.tsx'
import { GamosaBand, JapiRosette, TempleHem } from '@/components/ner/index.ts'
import { Button } from '@/components/ui/button.tsx'
import { Field, Input } from '@/components/ui/field.tsx'
import { Notice } from '@/components/ui/feedback.tsx'
import { isMockMode } from '@/lib/supabase.ts'
import { cn } from '@/lib/utils.ts'
import { FRESH_SIGNIN_KEY } from '@/routes/RootRedirect.tsx'
import { color } from '@/styles/tokens.ts'
import { useTranslation } from '@/i18n/index.ts'

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

type PhoneValues = { phone: string }
type OtpValues = { token: string }

const RESEND_SECONDS = 45

/**
 * Sign-in keeps its original, lighter field style. The heavier stitched
 * controls are for the dense forms inside the app; this page has one field at
 * a time.
 */
const SIGNIN_INPUT =
  'border border-ink/12 shadow-none hover:border-ink/12 focus-visible:bg-ivory focus-visible:ring-2 focus-visible:ring-terracotta/20'

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
      <path
        fill="#4285F4"
        d="M21.8 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.5a4.7 4.7 0 0 1-2.04 3.08v2.52h3.25c1.9-1.75 3.09-4.34 3.09-7.43Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.76 0 5.08-.91 6.71-2.34l-3.25-2.52c-.9.6-2.06.96-3.46.96-2.66 0-4.91-1.8-5.72-4.21H2.92v2.6A10.13 10.13 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.28 13.89A6.1 6.1 0 0 1 5.96 12c0-.66.11-1.3.32-1.89v-2.6H2.92A10 10 0 0 0 1.8 12c0 1.61.39 3.14 1.12 4.49l3.36-2.6Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.9c1.5 0 2.84.52 3.9 1.53l2.93-2.93C17.08 2.87 14.76 2 12 2a10.13 10.13 0 0 0-9.08 5.51l3.36 2.6C7.09 7.7 9.34 5.9 12 5.9Z"
      />
    </svg>
  )
}

export default function SignIn() {
  const { t } = useTranslation()
  const { sendOtp, verifyOtp, signInWithGoogle, session } = useAuth()
  const navigate = useNavigate()
  const [phone, setPhone] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [googlePending, setGooglePending] = useState(false)

  const phoneSchema = useMemo(() => z.object({
    phone: z.string().trim().min(1, t('auth.phoneRequired')).regex(/^\+[1-9]\d{7,14}$/, t('auth.phoneInvalid')),
  }), [t])
  const otpSchema = useMemo(() => z.object({
    token: z.string().trim().regex(/^\d{6}$/, t('auth.otpInvalid')),
  }), [t])

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
      setServerError(error instanceof Error ? error.message : t('auth.sendFailed'))
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
        error instanceof Error ? error.message : t('auth.verifyFailed'),
      )
    }
  }

  const continueWithGoogle = async () => {
    setServerError(null)
    setGooglePending(true)
    try {
      await signInWithGoogle()
      // The browser immediately leaves for Google in production. Storing this
      // first lets the existing root arrival show its one-time sign-in splash
      // when Google returns to this tab.
      sessionStorage.setItem(FRESH_SIGNIN_KEY, '1')
    } catch (error) {
      setGooglePending(false)
      setServerError(
        error instanceof Error ? error.message : t('auth.googleFailed'),
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
            {t('auth.welcomeTitle')}
          </h2>
          <p className="mt-4 text-[15.5px] leading-relaxed text-ivory/80">
            {t('auth.welcomeDescription')}
          </p>
        </div>

        {/* A loom's worth of Northeast bands, drifting slowly in alternate
            directions behind the copy — cream on terracotta, at low weight. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-28 space-y-5 opacity-[0.16]">
          <GamosaBand size={22} thread={color.cream} ground="transparent" drift={9} />
          <TempleHem size={16} fill={color.cream} accent="transparent" />
          <GamosaBand size={10} variant="rule" thread={color.cream} ground="transparent" drift={6} />
          <GamosaBand size={22} thread={color.cream} ground="transparent" drift={11} />
        </div>
        <div className="pointer-events-none absolute -right-20 -top-20 text-cream opacity-[0.1] animate-spin-slow">
          <JapiRosette size={300} strokeWidth={1.1} />
        </div>

        <p className="text-[13px] text-ivory/55">
          {t('auth.brandMeaning')}
        </p>
      </aside>

      {/* Right: the form. */}
      <main className="flex items-center justify-center bg-ivory px-5 py-14 sm:px-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-10 flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-2.5 text-terracotta lg:hidden">
              <Logomark size={24} decorative />
              <Wordmark size={18} color="var(--color-ink)" />
            </Link>
            <LocaleSelector className="ml-auto text-ink" />
          </div>

          {isMockMode && (
            <Notice tone="warn" className="mb-6">
              {t('auth.demoNotice')}
            </Notice>
          )}

          {!phone ? (
            <>
              <h1 className="text-[28px]">{t('auth.signIn')}</h1>
              <p className="mb-7 mt-2 text-[15px] leading-relaxed text-body">
                {t('auth.signInDescription')}
              </p>

              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full border-ink/20 bg-white hover:bg-sand/40"
                onClick={() => void continueWithGoogle()}
                disabled={googlePending}
              >
                <GoogleMark />
                {googlePending ? t('auth.googleOpening') : t('auth.continueWithGoogle')}
              </Button>

              <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                <span className="h-px flex-1 bg-ink/10" />
                {t('auth.orMobile')}
                <span className="h-px flex-1 bg-ink/10" />
              </div>

              <form onSubmit={phoneForm.handleSubmit(requestCode)} noValidate>
                <Field
                  label={t('auth.mobileNumber')}
                  htmlFor="phone"
                  hint={t('auth.countryCodeHint')}
                  error={phoneForm.formState.errors.phone?.message ?? serverError ?? undefined}
                >
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+91 98765 43210"
                    className={SIGNIN_INPUT}
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
                  {phoneForm.formState.isSubmitting ? t('auth.sending') : t('auth.sendCode')}
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
                {t('auth.differentNumber')}
              </button>

              <h1 className="text-[28px]">{t('auth.enterCode')}</h1>
              <p className="mb-7 mt-2 text-[15px] leading-relaxed text-body">
                {t('auth.codeSent', { phone })}
              </p>

              <form onSubmit={otpForm.handleSubmit(submitCode)} noValidate>
                <Field
                  label={t('auth.sixDigitCode')}
                  htmlFor="token"
                  error={otpForm.formState.errors.token?.message ?? serverError ?? undefined}
                >
                  <Input
                    id="token"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="123456"
                    className={cn(SIGNIN_INPUT, 'text-center font-heading text-2xl tracking-[0.5em]')}
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
                  {otpForm.formState.isSubmitting ? t('auth.checking') : t('auth.signIn')}
                </Button>

                <button
                  type="button"
                  disabled={cooldown > 0}
                  onClick={() => void requestCode({ phone })}
                  className="mt-4 w-full text-center text-sm text-muted disabled:opacity-60"
                >
                  {cooldown > 0 ? t('auth.resendIn', { seconds: cooldown }) : t('auth.resend')}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
