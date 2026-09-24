/**
 * The `Database` generic the client is parameterised on.
 *
 * `@smriti/shared` describes every table and RPC, but its `Views` entry is
 * still `Record<string, never>` - the backend package has not mirrored
 * `0010_views.sql` yet. Since the web app reads *only* from views for anything
 * event-derived (frontend.md §6), those row shapes are declared here, copied
 * column-for-column from `docs/backend-spec.md` §6. Nothing is invented; when
 * `@smriti/shared` grows real view types, delete this file's `SmritiViews` and
 * point `Database` straight at the shared one.
 *
 * Every column is nullable because `daily_report` is built from a
 * `full outer join` - a day where the patient took their medicines but never played, and
 * the reverse, both produce rows with one side missing.
 */
import type { Database as SharedDatabase } from '@smriti/shared'

type ViewDefinition<Row> = { Row: Row; Relationships: [] }

export type DailyPlayRow = {
  patient_id: string
  day: string
  sessions: number | null
  trials: number | null
  accuracy: number | null
  mean_rt_ms: number | null
  mean_initiation_ms: number | null
  mean_movement_ms: number | null
  rt_variability: number | null
  mean_hint_level: number | null
  perseverations: number | null
  repeat_errors: number | null
  semantic_errors: number | null
  peak_difficulty: number | null
  games_played: string[] | null
}

export type DailyDomainRow = {
  patient_id: string
  day: string
  domain: string
  trials: number | null
  accuracy: number | null
  mean_theta: number | null
  mean_rt_ms: number | null
  rt_variability: number | null
}

export type DailySessionsRow = {
  patient_id: string
  day: string
  sessions: number | null
  minutes_played: number | null
  abandoned: number | null
  demo_replays: number | null
}

export type DailyAdherenceRow = {
  patient_id: string
  day: string
  scheduled: number | null
  confirmed: number | null
  via_tablet: number | null
  via_call: number | null
  missed: number | null
}

/** The view the dashboard, engagement and trends pages all read. */
export type DailyReportRow = {
  patient_id: string
  day: string
  played: boolean | null
  minutes_played: number | null
  sessions: number | null
  abandoned: number | null
  demo_replays: number | null
  trials: number | null
  accuracy: number | null
  mean_rt_ms: number | null
  mean_initiation_ms: number | null
  mean_movement_ms: number | null
  rt_variability: number | null
  mean_hint_level: number | null
  perseverations: number | null
  repeat_errors: number | null
  semantic_errors: number | null
  peak_difficulty: number | null
  games_played: string[] | null
  scheduled: number | null
  confirmed: number | null
  via_tablet: number | null
  via_call: number | null
  missed: number | null
}

export type SmritiViews = {
  daily_play: ViewDefinition<DailyPlayRow>
  daily_domain: ViewDefinition<DailyDomainRow>
  daily_sessions: ViewDefinition<DailySessionsRow>
  daily_adherence: ViewDefinition<DailyAdherenceRow>
  daily_report: ViewDefinition<DailyReportRow>
}

export type Database = {
  public: Omit<SharedDatabase['public'], 'Views'> & { Views: SmritiViews }
}
