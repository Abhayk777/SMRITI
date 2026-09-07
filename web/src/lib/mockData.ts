/**
 * Fixtures for mock mode (see `lib/supabase.ts`).
 *
 * These exist so a fresh clone with no Supabase credentials still renders every
 * screen with plausible content — not so that any screen can quietly fall back
 * to fake data when the server is reachable. `db.ts` consults them only when
 * `isMockMode` is true, and `supabase.ts` logs a loud warning when it is.
 *
 * Everything here is typed against `@smriti/shared`, so a schema change breaks
 * the fixtures at compile time rather than at demo time.
 */
import type {
  EscalationConfig,
  Flag,
  Medication,
  Memo,
  Patient,
  PatientMember,
  PatientOverview,
  Person,
  RoutineItem,
} from '@smriti/shared'

import type { DailyDomainRow, DailyReportRow } from './database.types.ts'
import { isoDateDaysAgoInZone } from './utils.ts'

const DAY = 86_400_000

export const MOCK_USER_ID = '00000000-0000-4000-8000-000000000001'

export const MOCK_PATIENT_IDS = {
  amma: '11111111-1111-4111-8111-111111111111',
  baba: '22222222-2222-4222-8222-222222222222',
} as const

/** Both fixture patients live here, so their `day` values are computed here. */
const FIXTURE_TZ = 'Asia/Kolkata'

const isoDaysAgo = (days: number) => new Date(Date.now() - days * DAY).toISOString()

/**
 * `YYYY-MM-DD` in the fixture patient's timezone, matching how the real views
 * compute `day`. Using `toISOString()` here instead would silently produce UTC
 * dates, and today's row would then fail to match what the dashboard asks for
 * whenever the two disagree — which, for an India-based patient, is every
 * evening.
 */
const dateDaysAgo = (days: number) =>
  isoDateDaysAgoInZone(FIXTURE_TZ, days)

export const mockPatients: Record<string, Patient> = {
  [MOCK_PATIENT_IDS.amma]: {
    id: MOCK_PATIENT_IDS.amma,
    display_name: 'Sunanda Rao',
    age: 78,
    education_years: 12,
    lang_code: 'hi',
    script: 'Deva',
    timezone: 'Asia/Kolkata',
    content_version: 14,
    lang_pack_version: 3,
    device_user_id: '33333333-3333-4333-8333-333333333333',
    device_last_seen_at: new Date(Date.now() - 42 * 60_000).toISOString(),
    device_pending_events: 0,
    device_app_version: '1.4.2',
    clock_skew_ms: 380,
    consent_given_at: isoDaysAgo(96),
    active_flag_count: 1,
    created_by: MOCK_USER_ID,
    created_at: isoDaysAgo(96),
    archived_at: null,
  },
  [MOCK_PATIENT_IDS.baba]: {
    id: MOCK_PATIENT_IDS.baba,
    display_name: 'Hari Rao',
    age: 82,
    education_years: 16,
    lang_code: 'hi',
    script: 'Deva',
    timezone: 'Asia/Kolkata',
    content_version: 6,
    lang_pack_version: 3,
    device_user_id: null,
    device_last_seen_at: isoDaysAgo(4),
    device_pending_events: 12,
    device_app_version: '1.3.9',
    clock_skew_ms: null,
    consent_given_at: isoDaysAgo(30),
    active_flag_count: 0,
    created_by: MOCK_USER_ID,
    created_at: isoDaysAgo(30),
    archived_at: null,
  },
}

export const mockOverview: PatientOverview[] = [
  {
    patient_id: MOCK_PATIENT_IDS.amma,
    display_name: 'Sunanda Rao',
    role: 'caregiver',
    played_today: true,
    session_minutes: 11.5,
    meds_scheduled: 3,
    meds_confirmed: 2,
    active_flags: 1,
    unread_memos: 2,
    device_last_seen_at: new Date(Date.now() - 42 * 60_000).toISOString(),
    device_status: 'ok',
  },
  {
    patient_id: MOCK_PATIENT_IDS.baba,
    display_name: 'Hari Rao',
    role: 'caregiver',
    played_today: false,
    session_minutes: 0,
    meds_scheduled: 2,
    meds_confirmed: 0,
    active_flags: 0,
    unread_memos: 0,
    device_last_seen_at: isoDaysAgo(4),
    device_status: 'offline',
  },
]

export const mockPeople: Record<string, Person[]> = {
  [MOCK_PATIENT_IDS.amma]: [
    {
      id: 'aaaaaaa1-0000-4000-8000-000000000001',
      patient_id: MOCK_PATIENT_IDS.amma,
      name: 'Divya',
      relationship: 'Daughter',
      photo_path: `${MOCK_PATIENT_IDS.amma}/divya.jpg`,
      voice_path: `${MOCK_PATIENT_IDS.amma}/divya-voice.m4a`,
      memory_prompt: 'Divya calls every Sunday evening from Seattle.',
      is_deceased: false,
      sort_order: 0,
      created_at: isoDaysAgo(96),
    },
    {
      id: 'aaaaaaa1-0000-4000-8000-000000000002',
      patient_id: MOCK_PATIENT_IDS.amma,
      name: 'Hari',
      relationship: 'Husband',
      photo_path: `${MOCK_PATIENT_IDS.amma}/hari.jpg`,
      voice_path: null,
      memory_prompt: 'They married in Pune in 1969.',
      is_deceased: false,
      sort_order: 1,
      created_at: isoDaysAgo(96),
    },
    {
      id: 'aaaaaaa1-0000-4000-8000-000000000003',
      patient_id: MOCK_PATIENT_IDS.amma,
      name: 'Anita',
      relationship: 'Neighbour',
      photo_path: `${MOCK_PATIENT_IDS.amma}/anita.jpg`,
      voice_path: null,
      memory_prompt: 'They walk together at half past five.',
      is_deceased: false,
      sort_order: 2,
      created_at: isoDaysAgo(60),
    },
  ],
  [MOCK_PATIENT_IDS.baba]: [],
}

export const mockMedications: Record<string, Medication[]> = {
  [MOCK_PATIENT_IDS.amma]: [
    {
      id: 'bbbbbbb1-0000-4000-8000-000000000001',
      patient_id: MOCK_PATIENT_IDS.amma,
      name: 'Amlodipine',
      dose: '5 mg, one tablet',
      pill_photo_path: null,
      voice_path: null,
      window_start_min: 480,
      window_end_min: 660,
      chosen_time_min: 540,
      days_of_week: '1,2,3,4,5,6,7',
      active: true,
      created_at: isoDaysAgo(96),
    },
    {
      id: 'bbbbbbb1-0000-4000-8000-000000000002',
      patient_id: MOCK_PATIENT_IDS.amma,
      name: 'Metformin',
      dose: '500 mg, after food',
      pill_photo_path: null,
      voice_path: null,
      window_start_min: 780,
      window_end_min: 900,
      chosen_time_min: 810,
      days_of_week: '1,2,3,4,5,6,7',
      active: true,
      created_at: isoDaysAgo(96),
    },
    {
      id: 'bbbbbbb1-0000-4000-8000-000000000003',
      patient_id: MOCK_PATIENT_IDS.amma,
      name: 'Calcium + D3',
      dose: 'One tablet at night',
      pill_photo_path: null,
      voice_path: null,
      window_start_min: 1200,
      window_end_min: 1320,
      chosen_time_min: 1260,
      days_of_week: '1,3,5',
      active: true,
      created_at: isoDaysAgo(40),
    },
  ],
  [MOCK_PATIENT_IDS.baba]: [],
}

export const mockRoutine: Record<string, RoutineItem[]> = {
  [MOCK_PATIENT_IDS.amma]: [
    {
      id: 'ccccccc1-0000-4000-8000-000000000001',
      patient_id: MOCK_PATIENT_IDS.amma,
      time_min: 420,
      label_key: 'Morning tea',
      icon_asset: 'tea',
      created_at: isoDaysAgo(96),
    },
    {
      id: 'ccccccc1-0000-4000-8000-000000000002',
      patient_id: MOCK_PATIENT_IDS.amma,
      time_min: 1050,
      label_key: 'Walk with Anita',
      icon_asset: 'walk',
      created_at: isoDaysAgo(96),
    },
    {
      id: 'ccccccc1-0000-4000-8000-000000000003',
      patient_id: MOCK_PATIENT_IDS.amma,
      time_min: 1230,
      label_key: 'Call Divya',
      icon_asset: 'phone',
      created_at: isoDaysAgo(50),
    },
  ],
  [MOCK_PATIENT_IDS.baba]: [],
}

export const mockEscalation: Record<string, EscalationConfig> = {
  [MOCK_PATIENT_IDS.amma]: {
    patient_id: MOCK_PATIENT_IDS.amma,
    steps: [
      { step: 1, minutes: 20, channel: 'in_app' },
      { step: 2, minutes: 45, channel: 'call' },
      { step: 3, minutes: 90, channel: 'call' },
    ],
    primary_name: 'Divya Rao',
    primary_phone: '+919876500001',
    secondary_name: 'Anita Kulkarni',
    secondary_phone: '+919876500002',
    updated_at: isoDaysAgo(12),
  },
  [MOCK_PATIENT_IDS.baba]: {
    patient_id: MOCK_PATIENT_IDS.baba,
    steps: [
      { step: 1, minutes: 20, channel: 'in_app' },
      { step: 2, minutes: 45, channel: 'call' },
    ],
    primary_name: 'Divya Rao',
    primary_phone: '+919876500001',
    secondary_name: null,
    secondary_phone: null,
    updated_at: isoDaysAgo(30),
  },
}

export const mockFlags: Record<string, Flag[]> = {
  [MOCK_PATIENT_IDS.amma]: [
    {
      id: 'ddddddd1-0000-4000-8000-000000000001',
      patient_id: MOCK_PATIENT_IDS.amma,
      type: 'engagement_drop',
      domains: ['memory', 'attention'],
      severity: 'moderate',
      changepoint_date: dateDaysAgo(9),
      z_scores: { memory: -2.1, attention: -1.8 },
      evidence_session_ids: [
        'eeeeeee1-0000-4000-8000-000000000001',
        'eeeeeee1-0000-4000-8000-000000000002',
      ],
      baseline_window: `${dateDaysAgo(45)}..${dateDaysAgo(12)}`,
      recent_window: `${dateDaysAgo(9)}..${dateDaysAgo(0)}`,
      confidence: 0.82,
      status: 'active',
      created_at: isoDaysAgo(8),
      acknowledged_by: null,
      acknowledged_at: null,
    },
  ],
  [MOCK_PATIENT_IDS.baba]: [],
}

export const mockMemos: Record<string, Memo[]> = {
  [MOCK_PATIENT_IDS.amma]: [
    {
      id: 'fffffff1-0000-4000-8000-000000000001',
      patient_id: MOCK_PATIENT_IDS.amma,
      storage_path: `${MOCK_PATIENT_IDS.amma}/memo-1.m4a`,
      duration_ms: 24_000,
      recorded_at: Date.now() - 5 * 3_600_000,
      context_tag: 'memory',
      transcript:
        'Your grandfather’s Ambassador, 1974. Cream, with a dent on the left door.',
      read_at: null,
      server_received_at: isoDaysAgo(0),
    },
    {
      id: 'fffffff1-0000-4000-8000-000000000002',
      patient_id: MOCK_PATIENT_IDS.amma,
      storage_path: `${MOCK_PATIENT_IDS.amma}/memo-2.m4a`,
      duration_ms: 11_000,
      recorded_at: Date.now() - 28 * 3_600_000,
      context_tag: 'check_in',
      transcript: 'Slept well. The knee is better today.',
      read_at: null,
      server_received_at: isoDaysAgo(1),
    },
    {
      id: 'fffffff1-0000-4000-8000-000000000003',
      patient_id: MOCK_PATIENT_IDS.amma,
      storage_path: `${MOCK_PATIENT_IDS.amma}/memo-3.m4a`,
      duration_ms: 41_000,
      recorded_at: Date.now() - 3 * DAY,
      context_tag: 'memory',
      transcript:
        'The mango tree behind the Pune house — we planted it the year Divya was born.',
      read_at: isoDaysAgo(2),
      server_received_at: isoDaysAgo(3),
    },
  ],
  [MOCK_PATIENT_IDS.baba]: [],
}

export const mockMembers: Record<string, PatientMember[]> = {
  [MOCK_PATIENT_IDS.amma]: [
    {
      patient_id: MOCK_PATIENT_IDS.amma,
      user_id: MOCK_USER_ID,
      role: 'caregiver',
      invited_by: null,
      created_at: isoDaysAgo(96),
    },
    {
      patient_id: MOCK_PATIENT_IDS.amma,
      user_id: '00000000-0000-4000-8000-000000000002',
      role: 'family_viewer',
      invited_by: MOCK_USER_ID,
      created_at: isoDaysAgo(70),
    },
  ],
  [MOCK_PATIENT_IDS.baba]: [
    {
      patient_id: MOCK_PATIENT_IDS.baba,
      user_id: MOCK_USER_ID,
      role: 'caregiver',
      invited_by: null,
      created_at: isoDaysAgo(30),
    },
  ],
}

/**
 * Ninety days of `daily_report`, shaped like a real one: a solid baseline, a
 * dip starting around day 9 that matches the seeded `engagement_drop` flag's
 * changepoint, and a scattering of days with no play at all.
 */
function buildDailyReport(patientId: string, days: number, engaged: boolean): DailyReportRow[] {
  const rows: DailyReportRow[] = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = dateDaysAgo(i)
    const weekday = new Date(`${day}T12:00:00Z`).getUTCDay()
    const skipped = !engaged || weekday === 0 || i % 11 === 3
    const declining = i < 9
    const wobble = Math.sin(i / 3.1) * 0.03

    if (skipped) {
      rows.push({
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
        scheduled: engaged ? 3 : 2,
        confirmed: engaged ? 2 : 0,
        via_tablet: engaged ? 2 : 0,
        via_call: 0,
        missed: engaged ? 1 : 2,
      })
      continue
    }

    const accuracy = Number((0.79 + wobble - (declining ? 0.09 : 0)).toFixed(3))
    rows.push({
      patient_id: patientId,
      day,
      played: true,
      minutes_played: Number((11 + Math.sin(i / 2.4) * 3 - (declining ? 4 : 0)).toFixed(1)),
      sessions: declining ? 1 : 2,
      abandoned: declining && i % 3 === 0 ? 1 : 0,
      demo_replays: declining ? 2 : 0,
      trials: Math.round(64 + Math.cos(i / 4) * 9 - (declining ? 22 : 0)),
      accuracy,
      mean_rt_ms: Math.round(2180 + Math.sin(i / 5) * 140 + (declining ? 420 : 0)),
      mean_initiation_ms: Math.round(760 + (declining ? 190 : 0)),
      mean_movement_ms: Math.round(1180 + (declining ? 160 : 0)),
      rt_variability: Math.round(640 + (declining ? 230 : 0)),
      mean_hint_level: Number((0.4 + (declining ? 0.5 : 0)).toFixed(2)),
      perseverations: declining ? 3 : 1,
      repeat_errors: declining ? 2 : 1,
      semantic_errors: 1,
      peak_difficulty: Number((1.2 - (declining ? 0.4 : 0)).toFixed(2)),
      games_played: ['faces', 'market', 'pathfinder'],
      scheduled: 3,
      confirmed: declining ? 2 : 3,
      via_tablet: declining ? 1 : 3,
      via_call: declining ? 1 : 0,
      missed: declining ? 1 : 0,
    })
  }
  return rows
}

export const mockDailyReport: Record<string, DailyReportRow[]> = {
  [MOCK_PATIENT_IDS.amma]: buildDailyReport(MOCK_PATIENT_IDS.amma, 90, true),
  [MOCK_PATIENT_IDS.baba]: buildDailyReport(MOCK_PATIENT_IDS.baba, 90, false),
}

const DOMAINS = ['memory', 'attention', 'executive', 'visuospatial', 'language'] as const

export const mockDailyDomain: Record<string, DailyDomainRow[]> = {
  [MOCK_PATIENT_IDS.amma]: mockDailyReport[MOCK_PATIENT_IDS.amma]
    .filter((row) => row.played)
    .flatMap((row, index) =>
      DOMAINS.map((domain, d) => ({
        patient_id: row.patient_id,
        day: row.day,
        domain,
        trials: 12 + d,
        accuracy: Number(
          Math.max(0.4, (row.accuracy ?? 0.75) + Math.sin((index + d) / 4) * 0.06).toFixed(3),
        ),
        mean_theta: Number((0.2 + Math.sin((index + d) / 6) * 0.35).toFixed(3)),
        mean_rt_ms: (row.mean_rt_ms ?? 2200) + d * 60,
        rt_variability: row.rt_variability,
      })),
    ),
  [MOCK_PATIENT_IDS.baba]: [],
}
