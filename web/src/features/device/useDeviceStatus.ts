import { useQuery } from '@tanstack/react-query'

import * as db from '@/lib/db.ts'
import { qk } from '@/lib/queryKeys.ts'
import { deviceHealth } from '@/lib/utils.ts'

/**
 * The tablet's health, read off the `patients` row the device's heartbeat
 * updates.
 *
 * The `ok` / `stale` / `offline` thresholds here are the watchdog's own - 24
 * and 72 hours. They have to match, or the caregiver ends up looking at a
 * screen saying "connected" while the server has already decided the device is
 * offline and started calling people about it. Two systems disagreeing about
 * whether a patient's tablet is working is worse than either being wrong alone.
 */
export function useDeviceStatus(patientId: string) {
  const query = useQuery({
    queryKey: qk.deviceStatus(patientId),
    queryFn: () => db.unwrap(db.patientRow(patientId)),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    // A "last synced" line that is quietly an hour old is not honest, so this
    // refreshes on its own even without a realtime event.
    refetchInterval: 60_000,
  })

  const patient = query.data ?? null

  const isPaired = Boolean(patient?.device_user_id)

  return {
    ...query,
    patient,
    health: deviceHealth(patient?.device_last_seen_at, isPaired),
    lastSeenAt: patient?.device_last_seen_at ?? null,
    pendingEvents: patient?.device_pending_events ?? null,
    appVersion: patient?.device_app_version ?? null,
    contentVersion: patient?.content_version ?? null,
    clockSkewMs: patient?.clock_skew_ms ?? null,
    isPaired,
  }
}
