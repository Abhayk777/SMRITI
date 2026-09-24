import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'

import * as db from '@/lib/db.ts'

/**
 * Pairing (frontend.md §11).
 *
 * This one is fully live - `create-pairing-token` is deployed and tested, and
 * it is the milestone where the web app and the tablet can finally be tested
 * against each other on entirely real infrastructure.
 */
export function usePairingToken(patientId: string) {
  return useMutation({
    mutationFn: () => db.unwrap(db.createPairingToken(patientId)),
  })
}

/**
 * Seconds left before the token expires, counted down from the server's own
 * `expires_at`, not from when the button was pressed.
 *
 * The token is good for thirty minutes server-side. Showing a live countdown
 * matters more than it sounds: setting up a tablet means walking to another
 * room, finding the wifi password, and getting an elderly parent to look at a
 * screen. Coming back to a code that silently stopped working, with no
 * explanation, is the point where people give up on the setup.
 */
export function useTokenCountdown(expiresAt: string | null | undefined) {
  /**
   * The only state here is the clock. How much time is left is *derived* from
   * it and `expiresAt` during render, rather than being a second copy kept in
   * step by an effect - so the moment a fresh token arrives the countdown is
   * already correct, with no render showing the previous token's remainder.
   */
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!expiresAt) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [expiresAt])

  const secondsLeft = expiresAt
    ? Math.max(0, Math.round((new Date(expiresAt).getTime() - now) / 1000))
    : null

  return {
    secondsLeft,
    expired: secondsLeft !== null && secondsLeft <= 0,
    display:
      secondsLeft === null
        ? null
        : `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`,
  }
}
