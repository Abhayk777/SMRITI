import { z } from 'zod';

import type { Json } from './database.ts';

const uuidSchema = z.string().uuid();
const timestampSchema = z.string().datetime({ offset: true });
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const integerSchema = z.number().int();
const minuteOfDaySchema = integerSchema.min(0).max(1439);

export const jsonValueSchema: z.ZodType<Json> = z.lazy(() => z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(jsonValueSchema),
  z.record(jsonValueSchema),
]));

export const patientRoleSchema = z.enum([
  'caregiver',
  'family_viewer',
  'health_worker',
]);
export const cognitiveDomainSchema = z.enum([
  'memory',
  'attention',
  'executive',
  'visuospatial',
  'language',
]);
export const reminderOutcomeSchema = z.enum([
  'confirmed',
  'declined',
  'no_response',
]);
export const reminderChannelSchema = z.enum([
  'in_app',
  'call',
  'sms',
  'watchdog',
]);
export const escalationStatusSchema = z.enum([
  'requested',
  'executing',
  'completed',
  'cancelled',
  'failed',
]);
export const escalationSourceSchema = z.enum(['device', 'watchdog']);
export const flagTypeSchema = z.enum([
  'decline',
  'engagement_drop',
  'adherence_drop',
  'device_offline',
  'pattern_mismatch',
]);
export const flagSeveritySchema = z.enum(['info', 'moderate', 'high']);
export const flagStatusSchema = z.enum(['active', 'acknowledged', 'resolved']);

export const patientRowSchema = z.object({
  id: uuidSchema,
  display_name: z.string(),
  age: integerSchema.min(30).max(120),
  education_years: integerSchema.min(0).max(25),
  lang_code: z.string(),
  script: z.string(),
  timezone: z.string(),
  content_version: integerSchema,
  lang_pack_version: integerSchema,
  device_user_id: uuidSchema.nullable(),
  device_last_seen_at: timestampSchema.nullable(),
  device_pending_events: integerSchema.nullable(),
  device_app_version: z.string().nullable(),
  clock_skew_ms: integerSchema.nullable(),
  consent_given_at: timestampSchema.nullable(),
  active_flag_count: integerSchema,
  created_by: uuidSchema.nullable(),
  created_at: timestampSchema,
  archived_at: timestampSchema.nullable(),
}).strict();

export const patientMemberRowSchema = z.object({
  patient_id: uuidSchema,
  user_id: uuidSchema,
  role: patientRoleSchema,
  invited_by: uuidSchema.nullable(),
  created_at: timestampSchema,
}).strict();

export const pairingTokenRowSchema = z.object({
  token: z.string(),
  patient_id: uuidSchema,
  created_by: uuidSchema,
  expires_at: timestampSchema,
  consumed: z.boolean(),
  consumed_at: timestampSchema.nullable(),
  attempts: integerSchema,
  created_at: timestampSchema,
}).strict();

export const auditLogRowSchema = z.object({
  id: integerSchema,
  patient_id: uuidSchema.nullable(),
  actor: uuidSchema.nullable(),
  action: z.string(),
  detail: jsonValueSchema.nullable(),
  created_at: timestampSchema,
}).strict();

export const peopleRowSchema = z.object({
  id: uuidSchema,
  patient_id: uuidSchema,
  name: z.string(),
  relationship: z.string(),
  photo_path: z.string(),
  voice_path: z.string().nullable(),
  memory_prompt: z.string().nullable(),
  is_deceased: z.boolean(),
  sort_order: integerSchema,
  created_at: timestampSchema,
}).strict();

export const medicationRowSchema = z.object({
  id: uuidSchema,
  patient_id: uuidSchema,
  name: z.string(),
  dose: z.string(),
  pill_photo_path: z.string().nullable(),
  voice_path: z.string().nullable(),
  window_start_min: minuteOfDaySchema,
  window_end_min: minuteOfDaySchema,
  chosen_time_min: minuteOfDaySchema,
  days_of_week: z.string(),
  active: z.boolean(),
  created_at: timestampSchema,
}).strict().refine(
  (value) => value.chosen_time_min >= value.window_start_min
    && value.chosen_time_min <= value.window_end_min,
  { message: 'chosen_time_min must be within the medication window' },
);

export const routineItemRowSchema = z.object({
  id: uuidSchema,
  patient_id: uuidSchema,
  time_min: minuteOfDaySchema,
  label_key: z.string(),
  icon_asset: z.string(),
  created_at: timestampSchema,
}).strict();

export const escalationStepSchema = z.object({
  step: integerSchema,
  minutes: integerSchema,
  channel: z.string(),
}).strict();

export const escalationConfigRowSchema = z.object({
  patient_id: uuidSchema,
  steps: jsonValueSchema,
  primary_name: z.string(),
  primary_phone: z.string(),
  secondary_name: z.string().nullable(),
  secondary_phone: z.string().nullable(),
  updated_at: timestampSchema,
}).strict();

export const sessionRowSchema = z.object({
  id: uuidSchema,
  patient_id: uuidSchema,
  started_at: integerSchema,
  ended_at: integerSchema.nullable(),
  game_ids: z.string(),
  completed: z.boolean(),
  abandoned_at_ms: integerSchema.nullable(),
  demo_replays: integerSchema,
  server_received_at: timestampSchema,
}).strict();

export const eventRowSchema = z.object({
  id: uuidSchema,
  patient_id: uuidSchema,
  session_id: uuidSchema,
  game_id: z.string(),
  domain: cognitiveDomainSchema,
  item_id: z.string(),
  item_difficulty: z.number(),
  theta_before: z.number(),
  correct: z.boolean(),
  initiation_ms: integerSchema,
  movement_ms: integerSchema,
  response_time_ms: integerSchema,
  chosen_id: z.string().nullable(),
  error_class: z.string().nullable(),
  trial_index: integerSchema,
  trial_context: z.string().nullable(),
  hint_level: integerSchema,
  metrics: jsonValueSchema.nullable(),
  ts: integerSchema,
  hour_of_day: integerSchema,
  tz_offset_min: integerSchema,
  server_received_at: timestampSchema,
}).strict();

export const reminderEventRowSchema = z.object({
  id: uuidSchema,
  patient_id: uuidSchema,
  medication_id: uuidSchema,
  scheduled_at: integerSchema,
  fired_at: integerSchema.nullable(),
  responded_at: integerSchema.nullable(),
  outcome: reminderOutcomeSchema.nullable(),
  channel: reminderChannelSchema,
  ladder_step: integerSchema,
  server_received_at: timestampSchema,
}).strict();

export const memoRowSchema = z.object({
  id: uuidSchema,
  patient_id: uuidSchema,
  storage_path: z.string(),
  duration_ms: integerSchema,
  recorded_at: integerSchema,
  context_tag: z.string().nullable(),
  transcript: z.string().nullable(),
  read_at: timestampSchema.nullable(),
  server_received_at: timestampSchema,
}).strict();

export const escalationRowSchema = z.object({
  id: z.string(),
  patient_id: uuidSchema,
  reminder_event_id: uuidSchema.nullable(),
  medication_id: uuidSchema.nullable(),
  step: integerSchema,
  status: escalationStatusSchema,
  reason: z.string().nullable(),
  twilio_sid: z.string().nullable(),
  requested_at: integerSchema,
  not_before: timestampSchema,
  executed_at: timestampSchema.nullable(),
  source: escalationSourceSchema,
  created_at: timestampSchema,
}).strict();

export const abilityMirrorRowSchema = z.object({
  patient_id: uuidSchema,
  domain: z.string(),
  theta: z.number(),
  n_trials: integerSchema,
  rt_mean_log: z.number().nullable(),
  rt_var: z.number().nullable(),
  updated_at: timestampSchema,
}).strict();

export const flagRowSchema = z.object({
  id: uuidSchema,
  patient_id: uuidSchema,
  type: flagTypeSchema,
  domains: z.array(z.string()),
  severity: flagSeveritySchema,
  changepoint_date: dateSchema.nullable(),
  z_scores: jsonValueSchema.nullable(),
  evidence_session_ids: z.array(uuidSchema).nullable(),
  baseline_window: z.string().nullable(),
  recent_window: z.string().nullable(),
  confidence: z.number().nullable(),
  status: flagStatusSchema,
  created_at: timestampSchema,
  acknowledged_by: uuidSchema.nullable(),
  acknowledged_at: timestampSchema.nullable(),
}).strict();

export const banditStateRowSchema = z.object({
  medication_id: uuidSchema,
  patient_id: uuidSchema,
  posteriors: jsonValueSchema,
  last_decay_at: timestampSchema,
  updated_at: timestampSchema,
}).strict();

export const reportRowSchema = z.object({
  id: uuidSchema,
  patient_id: uuidSchema,
  storage_path: z.string(),
  months: integerSchema,
  generated_by: uuidSchema.nullable(),
  created_at: timestampSchema,
}).strict();

// RPC arguments use the exact Postgres argument names from 0008_rpcs.sql.
export const getPatientContentArgsSchema = z.object({
  p_patient_id: uuidSchema,
}).strict();

export const deviceHeartbeatArgsSchema = z.object({
  p_patient_id: uuidSchema,
  p_app_version: z.string(),
  p_pending_events: integerSchema,
  p_device_time_ms: integerSchema,
}).strict();

export const createPatientArgsSchema = z.object({
  p_name: z.string(),
  p_age: integerSchema.min(30).max(120),
  p_education: integerSchema.min(0).max(25),
  p_lang: z.string(),
  p_timezone: z.string().optional(),
  p_primary_name: z.string().nullable().optional(),
  p_primary_phone: z.string().nullable().optional(),
}).strict();

export const myPatientsOverviewArgsSchema = z.object({}).strict();

export const inviteMemberArgsSchema = z.object({
  p_patient_id: uuidSchema,
  p_phone: z.string(),
  p_role: z.enum(['family_viewer', 'caregiver']),
}).strict();

const contentPersonSchema = peopleRowSchema.pick({
  id: true,
  name: true,
  relationship: true,
  photo_path: true,
  voice_path: true,
  memory_prompt: true,
  is_deceased: true,
  sort_order: true,
});

const contentMedicationSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  dose: z.string(),
  pill_photo_path: z.string().nullable(),
  voice_path: z.string().nullable(),
  window_start_min: minuteOfDaySchema,
  window_end_min: minuteOfDaySchema,
  chosen_time_min: minuteOfDaySchema,
  days_of_week: z.string(),
  active: z.boolean(),
}).strict();

const contentRoutineItemSchema = routineItemRowSchema.pick({
  id: true,
  time_min: true,
  label_key: true,
  icon_asset: true,
});

const contentEscalationSchema = escalationConfigRowSchema.pick({
  steps: true,
  primary_name: true,
  primary_phone: true,
  secondary_name: true,
  secondary_phone: true,
});

export const patientContentSchema = z.object({
  version: integerSchema,
  lang_code: z.string(),
  script: z.string(),
  timezone: z.string(),
  lang_pack_version: integerSchema,
  elder_name: z.string(),
  age: integerSchema,
  education_years: integerSchema,
  people: z.array(contentPersonSchema),
  medications: z.array(contentMedicationSchema),
  routine: z.array(contentRoutineItemSchema),
  escalation: contentEscalationSchema.nullable(),
}).strict();

export const deviceHeartbeatResultSchema = z.object({
  server_time_ms: integerSchema,
  clock_skew_ms: integerSchema,
}).strict();

export const patientOverviewSchema = z.object({
  patient_id: uuidSchema,
  display_name: z.string(),
  role: patientRoleSchema,
  played_today: z.boolean(),
  session_minutes: z.number(),
  meds_scheduled: integerSchema,
  meds_confirmed: integerSchema,
  active_flags: integerSchema,
  unread_memos: integerSchema,
  device_last_seen_at: timestampSchema.nullable(),
  device_status: z.enum(['never', 'offline', 'stale', 'ok']),
}).strict();

export const inviteMemberResultSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('added') }).strict(),
  z.object({
    status: z.literal('pending'),
    message: z.string(),
  }).strict(),
]);

// JSON request bodies for the Edge Functions specified in backend-spec §8.
export const createPairingTokenBodySchema = z.object({
  patient_id: uuidSchema,
}).strict();

export const redeemPairingTokenBodySchema = z.object({
  token: z.string()
    .transform((token) => token.toUpperCase().replace(/-/g, ''))
    .refine((token) => /^[ACDEFGHJKLMNPQRSTUVWXYZ2345679]{8}$/.test(token), {
      message: 'token must be an eight-character Smriti pairing code',
    }),
}).strict();

export const pairDeviceAuthenticatedBodySchema = createPairingTokenBodySchema;

export const databaseWebhookOperationSchema = z.enum(['INSERT', 'UPDATE', 'DELETE']);

export const escalationWebhookBodySchema = z.object({
  type: databaseWebhookOperationSchema,
  table: z.literal('escalations'),
  schema: z.literal('public'),
  record: escalationRowSchema,
  old_record: escalationRowSchema.nullable(),
}).strict();

export const escalationSweepBodySchema = z.object({
  mode: z.literal('sweep'),
}).strict();

export const escalationWorkerBodySchema = z.union([
  escalationWebhookBodySchema,
  escalationSweepBodySchema,
]);

export const watchdogBodySchema = z.object({}).strict();

export const twilioFormBodySchema = z.record(z.string());

export const escalationCallbackContextSchema = z.object({
  patient_id: uuidSchema,
  escalation_id: z.string().min(1).max(512),
}).strict();

export const vapiWebhookBodySchema = z.object({
  message: z.object({
    artifact: z.object({
      structuredOutputs: z.record(z.object({
        name: z.string().optional(),
        result: z.unknown().optional(),
      }).passthrough()).optional(),
    }).passthrough().optional(),
    analysis: z.object({
      structuredData: z.object({
        took_medication: z.unknown().optional(),
      }).passthrough().optional(),
    }).passthrough().optional(),
    call: z.object({
      assistantOverrides: z.object({
        variableValues: z.record(z.unknown()).optional(),
      }).passthrough().optional(),
    }).passthrough().optional(),
  }).passthrough().optional(),
}).passthrough();

export const twilioWebhookBodySchema = z.union([
  twilioFormBodySchema,
  vapiWebhookBodySchema,
]);

export const ocrPrescriptionBodySchema = z.object({
  image_base64: z.string().min(1),
  patient_id: uuidSchema,
}).strict();

export const ocrMedicationCandidateSchema = z.object({
  name: z.string(),
  dose: z.string(),
  frequency: z.string(),
  confidence: z.number(),
  raw_text: z.string(),
}).strict();

export const ocrPrescriptionResultSchema = z.object({
  medications: z.array(ocrMedicationCandidateSchema),
}).strict();

export const generateReportBodySchema = z.object({
  patient_id: uuidSchema,
  months: integerSchema,
}).strict();

export const pairingResultSchema = z.object({
  refresh_token: z.string(),
  patient_id: uuidSchema,
  device_user_id: uuidSchema,
  lang_code: z.string(),
  elder_name: z.string(),
  age: integerSchema,
  education_years: integerSchema,
}).strict();

export const createPairingTokenResultSchema = z.object({
  token: z.string(),
  expires_at: timestampSchema,
}).strict();

export const generateReportResultSchema = z.object({
  signed_url: z.string(),
  report_id: uuidSchema,
}).strict();

export type GetPatientContentArgs = z.infer<typeof getPatientContentArgsSchema>;
export type DeviceHeartbeatArgs = z.infer<typeof deviceHeartbeatArgsSchema>;
export type CreatePatientArgs = z.infer<typeof createPatientArgsSchema>;
export type MyPatientsOverviewArgs = z.infer<typeof myPatientsOverviewArgsSchema>;
export type InviteMemberArgs = z.infer<typeof inviteMemberArgsSchema>;
export type CreatePairingTokenBody = z.infer<typeof createPairingTokenBodySchema>;
export type RedeemPairingTokenBody = z.input<typeof redeemPairingTokenBodySchema>;
export type RedeemPairingTokenBodyParsed = z.output<typeof redeemPairingTokenBodySchema>;
export type PairDeviceAuthenticatedBody = z.infer<typeof pairDeviceAuthenticatedBodySchema>;
export type EscalationWorkerBody = z.infer<typeof escalationWorkerBodySchema>;
export type WatchdogBody = z.infer<typeof watchdogBodySchema>;
export type TwilioFormBody = z.infer<typeof twilioFormBodySchema>;
export type EscalationCallbackContext = z.infer<typeof escalationCallbackContextSchema>;
export type VapiWebhookBody = z.infer<typeof vapiWebhookBodySchema>;
export type TwilioWebhookBody = z.infer<typeof twilioWebhookBodySchema>;
export type OcrPrescriptionBody = z.infer<typeof ocrPrescriptionBodySchema>;
export type OcrMedicationCandidate = z.infer<typeof ocrMedicationCandidateSchema>;
export type GenerateReportBody = z.infer<typeof generateReportBodySchema>;
export type PairingResult = z.infer<typeof pairingResultSchema>;
