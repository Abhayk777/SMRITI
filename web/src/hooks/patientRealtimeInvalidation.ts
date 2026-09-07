import { qk } from '../lib/queryKeys.ts'

type QueryKey = readonly unknown[]
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const canSubscribeToPatient = (
  patientId: string | undefined,
  accessConfirmed: boolean,
): patientId is string => accessConfirmed && patientId !== undefined && UUID.test(patientId)

const contentKeys = (patientId: string): QueryKey[] => [
  qk.people(patientId),
  qk.medications(patientId),
  qk.routineItems(patientId),
  qk.escalationConfig(patientId),
]

export function patientUpdateInvalidationKeys(
  patientId: string,
  cachedContentVersion: number | undefined,
  nextContentVersion: number | undefined,
): QueryKey[] {
  const keys: QueryKey[] = [
    qk.overview(),
    qk.patient(patientId),
    qk.deviceStatus(patientId),
    qk.dailyReports(patientId),
    qk.dailyDomains(patientId),
  ]

  if (
    cachedContentVersion === undefined ||
    nextContentVersion === undefined ||
    cachedContentVersion !== nextContentVersion
  ) {
    keys.push(...contentKeys(patientId))
  }

  return keys
}

export const flagInvalidationKeys = (patientId: string): QueryKey[] => [
  qk.flags(patientId),
  qk.patient(patientId),
  qk.overview(),
]

export const memoInvalidationKeys = (patientId: string): QueryKey[] => [
  qk.memos(patientId),
  qk.overview(),
]
