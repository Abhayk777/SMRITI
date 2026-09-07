import type { DailyReportRow } from './database.types.ts'
import type { CalendarDateRange } from './utils.ts'
import { addIsoDays, isoWeekdayIndex } from './utils.ts'

const emptyReportRow = (patientId: string, day: string): DailyReportRow => ({
  patient_id: patientId,
  day,
  played: false,
  minutes_played: null,
  sessions: null,
  abandoned: null,
  demo_replays: null,
  trials: null,
  accuracy: null,
  mean_rt_ms: null,
  mean_initiation_ms: null,
  mean_movement_ms: null,
  rt_variability: null,
  mean_hint_level: null,
  perseverations: null,
  repeat_errors: null,
  semantic_errors: null,
  peak_difficulty: null,
  games_played: null,
  scheduled: null,
  confirmed: null,
  via_tablet: null,
  via_call: null,
  missed: null,
})

/** Fills view gaps so a no-activity date still counts in calendar denominators. */
export function fillDailyReportRange(
  rows: DailyReportRow[],
  patientId: string,
  range: CalendarDateRange,
): DailyReportRow[] {
  const byDay = new Map(rows.map((row) => [row.day, row]))
  const filled: DailyReportRow[] = []
  for (let day = range.fromDate; day < range.toDateExclusive; day = addIsoDays(day, 1)) {
    filled.push(byDay.get(day) ?? emptyReportRow(patientId, day))
  }
  return filled
}

/** Monday-aligned calendar weeks; partial edge weeks remain partial. */
export function groupDailyReportWeeks(rows: DailyReportRow[]): DailyReportRow[][] {
  const groups = new Map<string, DailyReportRow[]>()
  for (const row of rows) {
    const monday = addIsoDays(row.day, -isoWeekdayIndex(row.day))
    const group = groups.get(monday) ?? []
    group.push(row)
    groups.set(monday, group)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, group]) => group)
}
