import { useEffect, useState } from 'react'

import { minutesOfDayInZone } from '@/lib/utils.ts'

/**
 * The patient's sky: which part of the day it is where they are.
 *
 * The app backdrop and the sidebar's "Their sky" clock both follow the
 * patient's local time, not the caregiver's — a caregiver abroad sees their
 * parent's morning, not their own evening. It is the same rule the dashboard
 * already follows for "today", applied to the room the app is drawn in.
 */
export type SkyPhase = 'dawn' | 'day' | 'dusk' | 'night'

export function skyPhase(minutes: number): SkyPhase {
  if (minutes >= 300 && minutes < 480) return 'dawn' // 5:00–8:00
  if (minutes >= 480 && minutes < 990) return 'day' // 8:00–16:30
  if (minutes >= 990 && minutes < 1170) return 'dusk' // 16:30–19:30
  return 'night'
}

/**
 * Where the sun (5:00–19:30) or moon (19:30–5:00) sits on its arc, 0 to 1.
 * The Northeast's day starts early — sunrise over Shillong is before five in
 * summer — which is why the day here runs from five, not six.
 */
export function arcProgress(minutes: number): { body: 'sun' | 'moon'; t: number } {
  if (minutes >= 300 && minutes < 1170) {
    return { body: 'sun', t: (minutes - 300) / (1170 - 300) }
  }
  const sinceDusk = minutes >= 1170 ? minutes - 1170 : minutes + (1440 - 1170)
  return { body: 'moon', t: sinceDusk / (1440 - 1170 + 300) }
}

/** Minutes since midnight in the given zone, refreshed every minute. */
export function usePatientMinutes(timezone: string | null | undefined): number {
  // The interval only forces a re-render; the time itself is read fresh from
  // the zone on every render, so a changed timezone is never a minute stale.
  const [, setTick] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setTick((n) => n + 1), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  return minutesOfDayInZone(timezone)
}
