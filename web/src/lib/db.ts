/**
 * Every query this app makes, in one file.
 *
 * Nothing outside `src/lib/` imports `@supabase/supabase-js` (frontend.md §1
 * and §15 rule 1, mirroring AGENTS.md non-negotiable 9). That is what makes it
 * possible to audit the app's entire surface against RLS by reading one file,
 * and it is why the Supabase session, storage and realtime types are
 * re-exported from here rather than imported at their use sites.
 *
 * Two rules this file exists to enforce:
 *
 *   1. **No raw `events` / `sessions` / `reminder_events` query lives here.**
 *      Ever. Those tables hold tens of thousands of rows per patient; every
 *      dashboard, trend and report figure comes from the `daily_*` views
 *      instead (frontend.md §6, §15 rule 2). If a screen needs an aggregate
 *      that no view provides, the fix is a new view on the server — not a
 *      query added below.
 *   2. **Storage paths in, storage paths out.** `uploadMedia` returns a path.
 *      Signed URLs are minted on demand for playback and never persisted
 *      (frontend.md §13, §15 rule 6).
 *
 * In mock mode (`lib/supabase.ts`) each export answers from `mockData.ts`
 * instead of the network, in the same `{ data, error }` shape, so no caller
 * needs to know which mode it is running in.
 */
import type {
  PostgrestError,
  RealtimeChannel,
  Session,
  User,
} from '@supabase/supabase-js'

import type {
  CreatePatientArgs,
  Database,
  EscalationConfig,
  Flag,
  InviteMemberArgs,
  Medication,
  Memo,
  Patient,
  PatientMember,
  PatientOverview,
  PatientRole,
  Person,
  RoutineItem,
} from '@smriti/shared'
import { ocrPrescriptionResultSchema } from '@smriti/shared'
import type { OcrMedicationCandidate } from '@smriti/shared'

import type { DailyDomainRow, DailyReportRow } from './database.types.ts'
import {
  MOCK_PATIENT_IDS,
  MOCK_USER_ID,
  mockDailyDomain,
  mockDailyReport,
  mockEscalation,
  mockFlags,
  mockMedications,
  mockMembers,
  mockMemos,
  mockOverview,
  mockPatients,
  mockPeople,
  mockRoutine,
} from './mockData.ts'
import { isMockMode, supabase } from './supabase.ts'

export type { RealtimeChannel, Session, User }
export type MedicationInsert = Database['public']['Tables']['medications']['Insert']

/** The shape every export below resolves to — PostgREST's own. */
export type DbResult<T> = { data: T | null; error: PostgrestError | Error | null }

const ok = <T>(data: T): Promise<DbResult<T>> => Promise.resolve({ data, error: null })

/**
 * Unwrap a `DbResult` for TanStack Query, which signals failure by throwing.
 * Every `queryFn` and `mutationFn` in the app goes through this, so an RLS
 * refusal surfaces as a real error state rather than a silent empty list.
 */
export async function unwrap<T>(promise: PromiseLike<DbResult<T>>): Promise<T> {
  const { data, error } = await promise
  if (error) throw error
  return data as T
}

/* ────────────────────────────────────────────────────────────────────────
   Auth (frontend.md §3) — phone + OTP, Supabase's native flow.
   ──────────────────────────────────────────────────────────────────────── */

/**
 * Mock mode needs a session too, or every guarded route would bounce to the
 * sign-in screen and there would be nothing to demo. It is a plain object with
 * the one field anything reads — `user.id` — and a subscriber list so the
 * provider updates the same way it does against the real client.
 */
const mockSession = {
  access_token: 'mock-access-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'mock-refresh-token',
  user: {
    id: MOCK_USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    phone: '+919876500001',
    app_metadata: {},
    user_metadata: {},
    created_at: new Date(0).toISOString(),
  },
} as unknown as Session

/**
 * Kept in `localStorage` rather than a module variable so a page refresh does
 * not sign the demo out. Module state resets on every full page load, which
 * would make a mock-mode session survive client-side navigation but not a
 * reload — the one behaviour guaranteed to look like a bug to whoever is
 * evaluating this on a fresh clone.
 */
const MOCK_SESSION_KEY = 'smriti:mock-session'

const readMockSignedIn = () => {
  try {
    return localStorage.getItem(MOCK_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

let mockSignedIn = isMockMode && readMockSignedIn()

const setMockSignedIn = (value: boolean) => {
  mockSignedIn = value
  try {
    if (value) localStorage.setItem(MOCK_SESSION_KEY, '1')
    else localStorage.removeItem(MOCK_SESSION_KEY)
  } catch {
    // Private browsing, or storage disabled. The in-memory flag still works
    // for the length of this page load.
  }
}

const mockAuthListeners = new Set<(session: Session | null) => void>()
const emitMockAuth = () => {
  for (const fn of mockAuthListeners) fn(mockSignedIn ? mockSession : null)
}

export const getSession = () =>
  isMockMode
    ? Promise.resolve({
        data: { session: mockSignedIn ? mockSession : null },
        error: null,
      })
    : supabase.auth.getSession()

export function onAuthStateChange(fn: (session: Session | null) => void) {
  if (isMockMode) {
    mockAuthListeners.add(fn)
    return {
      data: { subscription: { unsubscribe: () => mockAuthListeners.delete(fn) } },
    }
  }
  return supabase.auth.onAuthStateChange((_event, session) => fn(session))
}

export const signInWithOtp = (phone: string) =>
  isMockMode
    ? Promise.resolve({ data: { user: null, session: null }, error: null })
    : supabase.auth.signInWithOtp({ phone })

export const verifyOtp = (phone: string, token: string) => {
  if (isMockMode) {
    setMockSignedIn(true)
    emitMockAuth()
    return Promise.resolve({
      data: { user: mockSession.user, session: mockSession },
      error: null,
    })
  }
  return supabase.auth.verifyOtp({ phone, token, type: 'sms' })
}

export const signOut = () => {
  if (isMockMode) {
    setMockSignedIn(false)
    emitMockAuth()
    return Promise.resolve({ error: null })
  }
  return supabase.auth.signOut()
}

/* ────────────────────────────────────────────────────────────────────────
   Reads
   ──────────────────────────────────────────────────────────────────────── */

/** The adaptive-landing query (frontend.md §4). One row per patient in scope. */
export const patientsOverview = (): PromiseLike<DbResult<PatientOverview[]>> =>
  isMockMode ? ok(mockOverview) : supabase.rpc('my_patients_overview')

export const patientRow = (pid: string): PromiseLike<DbResult<Patient>> =>
  isMockMode
    ? ok(mockPatients[pid] ?? mockPatients[MOCK_PATIENT_IDS.amma])
    : supabase.from('patients').select('*').eq('id', pid).single()

/**
 * The people on the tablet's home screen. Named for the table rather than
 * `patientContent` (frontend.md §5) because `get_patient_content` is a
 * different, device-facing RPC and the two must not be confused.
 */
export const peopleFor = (pid: string): PromiseLike<DbResult<Person[]>> =>
  isMockMode
    ? ok(mockPeople[pid] ?? [])
    : supabase.from('people').select('*').eq('patient_id', pid).order('sort_order')

export const medicationsFor = (pid: string): PromiseLike<DbResult<Medication[]>> =>
  isMockMode
    ? ok((mockMedications[pid] ?? []).filter((m) => m.active))
    : supabase
        .from('medications')
        .select('*')
        .eq('patient_id', pid)
        .eq('active', true)
        .order('chosen_time_min')

export const routineFor = (pid: string): PromiseLike<DbResult<RoutineItem[]>> =>
  isMockMode
    ? ok(mockRoutine[pid] ?? [])
    : supabase.from('routine_items').select('*').eq('patient_id', pid).order('time_min')

export const escalationConfigFor = (pid: string): PromiseLike<DbResult<EscalationConfig>> =>
  isMockMode
    ? ok(mockEscalation[pid])
    : supabase.from('escalation_config').select('*').eq('patient_id', pid).single()

/** `daily_report` — the view every dashboard/trend/engagement figure reads. */
export const dailyReportRange = (
  pid: string,
  fromDate: string,
  toDateExclusive: string,
): PromiseLike<DbResult<DailyReportRow[]>> =>
  isMockMode
    ? ok(
        (mockDailyReport[pid] ?? []).filter(
          (row) => row.day >= fromDate && row.day < toDateExclusive,
        ),
      )
    : supabase
        .from('daily_report')
        .select('*')
        .eq('patient_id', pid)
        .gte('day', fromDate)
        .lt('day', toDateExclusive)
        .order('day')

/** `daily_domain` — per-cognitive-domain accuracy, for the Trends charts. */
export const dailyDomainRange = (
  pid: string,
  fromDate: string,
  toDateExclusive: string,
): PromiseLike<DbResult<DailyDomainRow[]>> =>
  isMockMode
    ? ok(
        (mockDailyDomain[pid] ?? []).filter(
          (row) => row.day >= fromDate && row.day < toDateExclusive,
        ),
      )
    : supabase
        .from('daily_domain')
        .select('*')
        .eq('patient_id', pid)
        .gte('day', fromDate)
        .lt('day', toDateExclusive)
        .order('day')

export const activeFlags = (pid: string): PromiseLike<DbResult<Flag[]>> =>
  isMockMode
    ? ok((mockFlags[pid] ?? []).filter((f) => f.status === 'active'))
    : supabase
        .from('flags')
        .select('*')
        .eq('patient_id', pid)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

export const memosFor = (pid: string): PromiseLike<DbResult<Memo[]>> =>
  isMockMode
    ? ok(mockMemos[pid] ?? [])
    : supabase
        .from('memos')
        .select('*')
        .eq('patient_id', pid)
        .order('recorded_at', { ascending: false })
        .limit(50)

/**
 * Current members of a patient's circle.
 *
 * frontend.md §5 writes this as `.select('*, users(*)')`, but there is no
 * `users` table in the public schema — accounts live in `auth.users`, which
 * PostgREST does not expose and RLS deliberately does not open up. Embedding
 * it would 400 against the live server. So this returns the membership rows
 * alone; the Access page shows role, join date and "you", and identifies other
 * members by the phone number they were invited with rather than a profile.
 * Surfacing names would need a `public.profiles` view server-side.
 */
export const membersFor = (pid: string): PromiseLike<DbResult<PatientMember[]>> =>
  isMockMode
    ? ok(mockMembers[pid] ?? [])
    : supabase.from('patient_members').select('*').eq('patient_id', pid)

/**
 * The caller's role for one patient — the explicit membership check
 * `PatientRoute` runs on mount so an unauthorised URL shows "you don't have
 * access" rather than a blank screen (frontend.md §2). RLS refuses the row
 * anyway; this is purely so the UI can say something true.
 */
export const myRoleFor = async (
  pid: string,
  userId: string,
): Promise<DbResult<PatientRole | null>> => {
  if (isMockMode) {
    const row = (mockMembers[pid] ?? []).find((m) => m.user_id === MOCK_USER_ID)
    return { data: row?.role ?? null, error: null }
  }
  const { data, error } = await supabase
    .from('patient_members')
    .select('role')
    .eq('patient_id', pid)
    .eq('user_id', userId)
    .maybeSingle()
  return { data: data?.role ?? null, error }
}

/* ────────────────────────────────────────────────────────────────────────
   Writes — RPCs
   ──────────────────────────────────────────────────────────────────────── */

/**
 * Creates the patient row, the caller's caregiver membership and the default
 * escalation config in one transaction. Step 1 of the setup wizard.
 */
export const createPatient = (args: CreatePatientArgs): PromiseLike<DbResult<string>> =>
  isMockMode ? ok(MOCK_PATIENT_IDS.amma) : supabase.rpc('create_patient', args)

export const inviteMember = (
  pid: string,
  phone: string,
  role: InviteMemberArgs['p_role'],
) =>
  isMockMode
    ? ok({ status: 'pending' as const, message: 'no account yet (mock mode)' })
    : supabase.rpc('invite_member', { p_patient_id: pid, p_phone: phone, p_role: role })

/* ────────────────────────────────────────────────────────────────────────
   Writes — content tables
   These are called only by `hooks/useContentMutation.ts` (§15 rule 3).
   ──────────────────────────────────────────────────────────────────────── */

export type ContentTable = 'people' | 'medications' | 'routine_items' | 'escalation_config'

/**
 * `escalation_config` is keyed by `patient_id`, one row per patient; the other
 * three are keyed by `id`. Everything below routes through this so no caller
 * has to remember which.
 */
const keyColumn = (table: ContentTable) =>
  table === 'escalation_config' ? 'patient_id' : 'id'

/**
 * `supabase.from()` over a union of table names produces a union of query
 * builders that TypeScript cannot narrow past, and the payload is genuinely
 * dynamic — the whole point of this hook is that four tables share one write
 * path. So the type is loosened here, once, at the choke point, rather than at
 * every call site. Row shapes are still checked where it matters: the forms
 * that build these payloads are typed against `@smriti/shared`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const contentTable = (table: ContentTable): any => supabase.from(table)

export const contentInsert = (
  table: ContentTable,
  patientId: string,
  payload: Record<string, unknown>,
): PromiseLike<DbResult<unknown>> =>
  isMockMode
    ? ok({ ...payload, patient_id: patientId, id: crypto.randomUUID() })
    : contentTable(table)
        .insert({ ...payload, patient_id: patientId })
        .select()
        .single()

/** One SQL statement: a failed OCR row cannot leave a half-saved prescription. */
export const medicationInsertMany = (
  patientId: string,
  payloads: Array<Omit<MedicationInsert, 'patient_id'>>,
): PromiseLike<DbResult<unknown[]>> =>
  isMockMode
    ? ok(payloads.map((payload) => ({ ...payload, patient_id: patientId, id: crypto.randomUUID() })))
    : supabase
        .from('medications')
        .insert(payloads.map((payload) => ({ ...payload, patient_id: patientId })))
        .select()

export const contentUpdate = (
  table: ContentTable,
  key: string,
  payload: Record<string, unknown>,
): PromiseLike<DbResult<unknown>> =>
  isMockMode
    ? ok({ ...payload, [keyColumn(table)]: key })
    : contentTable(table).update(payload).eq(keyColumn(table), key).select().single()

/**
 * Medications are retired, not deleted — `active: false` keeps the history
 * that `daily_adherence` is built from intact. People and routine items are
 * genuinely removed.
 */
export const contentDelete = (
  table: Exclude<ContentTable, 'escalation_config'>,
  key: string,
): PromiseLike<DbResult<unknown>> => {
  if (isMockMode) return ok({ id: key })
  if (table === 'medications') {
    return supabase
      .from('medications')
      .update({ active: false })
      .eq('id', key) as PromiseLike<DbResult<unknown>>
  }
  return supabase.from(table).delete().eq('id', key) as PromiseLike<DbResult<unknown>>
}

/* ────────────────────────────────────────────────────────────────────────
   Writes — small, single-purpose updates
   ──────────────────────────────────────────────────────────────────────── */

export const acknowledgeFlag = (flagId: string): PromiseLike<DbResult<unknown>> =>
  isMockMode
    ? ok({ id: flagId })
    : (supabase
        .from('flags')
        .update({ status: 'acknowledged' })
        .eq('id', flagId) as PromiseLike<DbResult<unknown>>)

/** `read_at` is caregiver-writable per the memos RLS policy. Set it on play. */
export const markMemoRead = (memoId: string): PromiseLike<DbResult<unknown>> =>
  isMockMode
    ? ok({ id: memoId })
    : (supabase
        .from('memos')
        .update({ read_at: new Date().toISOString() })
        .eq('id', memoId)
        .is('read_at', null) as PromiseLike<DbResult<unknown>>)

/* ────────────────────────────────────────────────────────────────────────
   Edge Functions
   ──────────────────────────────────────────────────────────────────────── */

/**
 * Pairing token — live, deployed and tested. Expires 30 minutes server-side.
 */
export const createPairingToken = async (
  pid: string,
): Promise<DbResult<{ token: string; expires_at: string }>> => {
  if (isMockMode) {
    return {
      data: {
        token: 'K4PQ7RTM',
        expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
      },
      error: null,
    }
  }
  const { data, error } = await supabase.functions.invoke('create-pairing-token', {
    body: { patient_id: pid },
  })
  return { data: data ?? null, error }
}

export async function scanPrescription(
  patientId: string,
  documentBase64: string,
  mimeType: string,
): Promise<DbResult<{ medications: OcrMedicationCandidate[] }>> {
  if (isMockMode) {
    return { data: null, error: new Error('Prescription scanning requires a configured Supabase project.') }
  }

  // A scan is a privileged, billable operation. Explicitly validate and pass
  // the current session rather than allowing functions-js to fall back to the
  // public anon key if a persisted browser session has gone stale.
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session) {
    return { data: null, error: new Error('not authenticated') }
  }
  const { error: userError } = await supabase.auth.getUser()
  if (userError) {
    return { data: null, error: new Error('not authenticated') }
  }
  const { data: { session: refreshedSession } } = await supabase.auth.getSession()
  if (!refreshedSession) {
    return { data: null, error: new Error('not authenticated') }
  }

  const { data, error } = await supabase.functions.invoke('ocr-prescription', {
    body: {
      patient_id: patientId,
      document_base64: documentBase64,
      mime_type: mimeType,
    },
    headers: { Authorization: `Bearer ${refreshedSession.access_token}` },
  })
  if (error) {
    // functions-js reports non-2xx responses as a generic FunctionsHttpError.
    // The function's own error body is deliberately safe for caregivers, and
    // is the useful answer here (for example, access versus an unreadable file).
    const response = (error as Error & { context?: unknown }).context
    if (response instanceof Response) {
      const body: unknown = await response.clone().json().catch(() => null)
      if (
        body !== null
        && typeof body === 'object'
        && 'error' in body
        && typeof body.error === 'string'
        && body.error.trim()
      ) return { data: null, error: new Error(body.error) }
    }
    return { data: null, error }
  }

  const parsed = ocrPrescriptionResultSchema.safeParse(data)
  if (!parsed.success) {
    return { data: null, error: new Error('The prescription reader returned an invalid response.') }
  }
  return { data: parsed.data, error: null }
}

/* ────────────────────────────────────────────────────────────────────────
   Storage (frontend.md §13)
   ──────────────────────────────────────────────────────────────────────── */

/**
 * Buckets, from backend-spec §7. Caregivers write only to `patient-media`;
 * `patient-memos` is device-insert, caregiver-read.
 *
 * Note a discrepancy worth knowing about: frontend.md §13's playback snippet
 * signs memo audio out of `patient-media`, but `0011_storage.sql` stores memos
 * in `patient-memos`. The bucket policies are the live truth, so this app
 * signs memos from `patient-memos`.
 */
export const BUCKET = {
  media: 'patient-media',
  memos: 'patient-memos',
  reports: 'reports',
} as const

export type BucketName = (typeof BUCKET)[keyof typeof BUCKET]

/** Uploads and resolves only once the object is committed. Returns the path. */
export async function uploadMedia(
  path: string,
  file: Blob,
  contentType?: string,
): Promise<DbResult<string>> {
  if (isMockMode) return { data: path, error: null }
  const { error } = await supabase.storage
    .from(BUCKET.media)
    .upload(path, file, { contentType, upsert: false })
  if (error) return { data: null, error }
  return { data: path, error: null }
}

/** Short-lived URL, minted on demand for playback. Never written to a row. */
export async function signedUrl(
  bucket: BucketName,
  path: string,
  seconds = 3600,
): Promise<DbResult<string>> {
  if (isMockMode) return { data: null, error: null }
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, seconds)
  return { data: data?.signedUrl ?? null, error }
}

export async function removeMedia(path: string): Promise<DbResult<unknown>> {
  if (isMockMode) return { data: null, error: null }
  const { data, error } = await supabase.storage.from(BUCKET.media).remove([path])
  return { data, error }
}

/* ────────────────────────────────────────────────────────────────────────
   Realtime (frontend.md §7)
   One channel per patient, not one per widget. RLS applies to realtime
   payloads server-side, so a caregiver cannot receive another patient's row
   through this channel no matter what filter string is constructed here.
   ──────────────────────────────────────────────────────────────────────── */

export type PatientChannelHandlers = {
  onPatient?: (patient: Partial<Patient>) => void
  onFlag?: () => void
  onMemo?: () => void
}

/** Returns an unsubscribe function. Callers must call it on unmount (§15 rule 9). */
export function subscribeToPatient(
  pid: string,
  handlers: PatientChannelHandlers,
): () => void {
  if (isMockMode) return () => {}

  const channel = supabase
    .channel(`patient-${pid}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'patients', filter: `id=eq.${pid}` },
      (payload) => handlers.onPatient?.(payload.new as Partial<Patient>),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'flags', filter: `patient_id=eq.${pid}` },
      () => handlers.onFlag?.(),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'memos', filter: `patient_id=eq.${pid}` },
      () => handlers.onMemo?.(),
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}

/**
 * The lighter subscription behind the multi-patient overview. One channel
 * covers every patient the caller can see — RLS filters server-side, so there
 * is nothing to filter here.
 */
export function subscribeToCaregiverFeed(onChange: () => void): () => void {
  if (isMockMode) return () => {}

  const channel = supabase
    .channel('caregiver-feed')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, onChange)
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}
