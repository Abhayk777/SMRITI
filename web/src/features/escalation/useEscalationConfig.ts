import { useQuery } from '@tanstack/react-query'

import { useContentMutation } from '@/hooks/useContentMutation.ts'
import * as db from '@/lib/db.ts'
import { qk } from '@/lib/queryKeys.ts'
import type { EscalationConfig } from '@smriti/shared'

export function useEscalationConfig(patientId: string) {
  return useQuery({
    queryKey: qk.escalationConfig(patientId),
    queryFn: () => db.unwrap(db.escalationConfigFor(patientId)),
  })
}

export function useEscalationMutation(patientId: string) {
  return useContentMutation<EscalationConfig>('escalation_config', patientId)
}

export type EscalationStep = { step: number; minutes: number; channel: string }

/**
 * The ladder, as the server stores it: a `steps` JSONB array of
 * `{ step, minutes, channel }`.
 *
 * ── Product call flagged, per frontend.md §8 ──────────────────────────────
 * The spec leaves open whether to expose `steps` as an editable ladder or keep
 * it server-owned. **This app exposes it read-only**, rendered as a plain
 * sentence-per-step timeline, with the contacts editable above it.
 *
 * The reasoning: the ladder decides how long a missed dose waits before it
 * becomes a phone call to a person. A caregiver who sets step 2 to 180 minutes
 * because the calls felt intrusive has quietly disabled the safety net that
 * `escalation-worker` and the watchdog exist to provide, and nothing in the UI
 * would tell them that is what they did. Contacts are safe to edit and are the
 * thing that actually changes between families; timings are a clinical default.
 *
 * If the product decides otherwise, the editor belongs on the Alerts page and
 * `steps` goes through `useEscalationMutation` like any other content field —
 * the write path already supports it.
 */
export function parseSteps(steps: EscalationConfig['steps']): EscalationStep[] {
  if (!Array.isArray(steps)) return []
  return steps
    .filter(
      (step): step is { step: number; minutes: number; channel: string } =>
        typeof step === 'object' &&
        step !== null &&
        !Array.isArray(step) &&
        typeof (step as Record<string, unknown>).step === 'number' &&
        typeof (step as Record<string, unknown>).minutes === 'number' &&
        typeof (step as Record<string, unknown>).channel === 'string',
    )
    .sort((a, b) => a.step - b.step)
}

export const CHANNEL_COPY: Record<string, string> = {
  in_app: 'a second chime on the tablet',
  call: 'a phone call to your contacts',
  sms: 'a text message to your contacts',
  sms_primary: 'a text message to the primary contact',
  sms_secondary: 'a text message to the secondary contact',
  watchdog: 'an automatic safety check',
}
