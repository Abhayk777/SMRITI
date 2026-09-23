import { useQuery } from '@tanstack/react-query'

import type { DailyDomainRow, DailyReportRow } from '@/lib/database.types.ts'
import * as db from '@/lib/db.ts'
import { HISTORICAL_STALE_TIME } from '@/lib/queryClient.ts'
import { qk } from '@/lib/queryKeys.ts'
import { fillDailyReportRange } from '@/lib/reporting.ts'
import { calendarDayRangeInZone, calendarMonthRangeInZone } from '@/lib/utils.ts'
import { assertPatientMatchAll } from '@/patients/usePatientAccess.ts'

/**
 * The `daily_report` view — the only place any play, session or adherence
 * figure in this app comes from (frontend.md §6, §15 rule 2).
 *
 * Cached hard: once a day has passed, its row cannot change, so re-fetching
 * ninety days of history on every navigation is pure waste. Today's row *can*
 * change, which is what the realtime subscription is for.
 */
export function useDailyReport(patientId: string, days: number, timezone?: string | null) {
  // Ranges are anchored to the patient's timezone, because that is what the
  // view's `day` column is computed in. The exclusive upper bound prevents a
  // range from drifting when the caregiver and patient are on different dates.
  const range = calendarDayRangeInZone(timezone, days)
  return useQuery({
    queryKey: qk.dailyReport(patientId, range.fromDate, range.toDateExclusive),
    queryFn: async () => {
      const rows = await db.unwrap(
        db.dailyReportRange(patientId, range.fromDate, range.toDateExclusive),
      )
      assertPatientMatchAll(patientId, rows, 'useDailyReport')
      return fillDailyReportRange(rows, patientId, range)
    },
    staleTime: HISTORICAL_STALE_TIME,
  })
}

export function useDailyReportMonths(
  patientId: string,
  months: number,
  timezone?: string | null,
) {
  const range = calendarMonthRangeInZone(timezone, months)
  return useQuery({
    queryKey: qk.dailyReport(patientId, range.fromDate, range.toDateExclusive),
    queryFn: async () => {
      const rows = await db.unwrap(
        db.dailyReportRange(patientId, range.fromDate, range.toDateExclusive),
      )
      assertPatientMatchAll(patientId, rows, 'useDailyReportMonths')
      return fillDailyReportRange(rows, patientId, range)
    },
    staleTime: HISTORICAL_STALE_TIME,
  })
}

export function useDailyDomain(patientId: string, days: number, timezone?: string | null) {
  const range = calendarDayRangeInZone(timezone, days)
  return useQuery({
    queryKey: qk.dailyDomain(patientId, range.fromDate, range.toDateExclusive),
    queryFn: async () => {
      const rows = await db.unwrap(
        db.dailyDomainRange(patientId, range.fromDate, range.toDateExclusive),
      )
      assertPatientMatchAll(patientId, rows, 'useDailyDomain')
      return rows
    },
    staleTime: HISTORICAL_STALE_TIME,
  })
}

/* ────────────────────────────────────────────────────────────────────────
   Derivations. All of them tolerate nulls, because `daily_report` is a
   `full outer join` — a day with medicines and no play, or play and no
   medicines, is normal and produces a row with one half missing.
   ──────────────────────────────────────────────────────────────────────── */

export const rowForDay = (rows: DailyReportRow[] | undefined, day: string) =>
  rows?.find((row) => row.day === day) ?? null

export type AdherenceSummary = {
  scheduled: number
  confirmed: number
  missed: number
  viaTablet: number
  viaCall: number
  /** `null` rather than 0 when nothing was ever scheduled — a different fact. */
  rate: number | null
}

export function summariseAdherence(rows: DailyReportRow[]): AdherenceSummary {
  const total = rows.reduce(
    (acc, row) => ({
      scheduled: acc.scheduled + (row.scheduled ?? 0),
      confirmed: acc.confirmed + (row.confirmed ?? 0),
      missed: acc.missed + (row.missed ?? 0),
      viaTablet: acc.viaTablet + (row.via_tablet ?? 0),
      viaCall: acc.viaCall + (row.via_call ?? 0),
    }),
    { scheduled: 0, confirmed: 0, missed: 0, viaTablet: 0, viaCall: 0 },
  )
  return {
    ...total,
    rate: total.scheduled > 0 ? total.confirmed / total.scheduled : null,
  }
}

export type PlaySummary = {
  daysPlayed: number
  daysTotal: number
  minutes: number
  sessions: number
  abandoned: number
  /** Mean accuracy across days that had play, or `null` if there were none. */
  accuracy: number | null
}

export function summarisePlay(rows: DailyReportRow[]): PlaySummary {
  const played = rows.filter((row) => row.played)
  const accuracies = played
    .map((row) => row.accuracy)
    .filter((value): value is number => typeof value === 'number')

  return {
    daysPlayed: played.length,
    daysTotal: rows.length,
    minutes: Math.round(played.reduce((sum, row) => sum + (row.minutes_played ?? 0), 0)),
    sessions: played.reduce((sum, row) => sum + (row.sessions ?? 0), 0),
    abandoned: played.reduce((sum, row) => sum + (row.abandoned ?? 0), 0),
    accuracy:
      accuracies.length > 0
        ? accuracies.reduce((sum, value) => sum + value, 0) / accuracies.length
        : null,
  }
}

/**
 * A centred rolling mean, so a chart shows the trend rather than the noise of a
 * single bad afternoon. Windows shorter than the full span at the edges rather
 * than dropping points, because a 90-day chart that starts on day 4 looks like
 * missing data.
 */
export function rollingMean(
  rows: DailyReportRow[],
  pick: (row: DailyReportRow) => number | null | undefined,
  window = 7,
): Array<{ day: string; value: number | null }> {
  const half = Math.floor(window / 2)
  return rows.map((_, index) => {
    const slice = rows
      .slice(Math.max(0, index - half), index + half + 1)
      .map(pick)
      .filter((value): value is number => typeof value === 'number')
    return {
      day: rows[index].day,
      value: slice.length ? slice.reduce((sum, v) => sum + v, 0) / slice.length : null,
    }
  })
}

/** Groups `daily_domain` rows into one series per cognitive domain. */
export function byDomain(rows: DailyDomainRow[]): Record<string, DailyDomainRow[]> {
  const out: Record<string, DailyDomainRow[]> = {}
  for (const row of rows) {
    ;(out[row.domain] ??= []).push(row)
  }
  return out
}

export const DOMAIN_LABEL: Record<string, string> = {
  memory: 'domains.memory', attention: 'domains.attention', executive: 'domains.executive',
  visuospatial: 'domains.visuospatial', language: 'domains.language',
}
