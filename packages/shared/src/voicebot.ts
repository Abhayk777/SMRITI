import { z } from 'zod';

const uuid = z.string().uuid();
const timestamp = z.string().datetime({ offset: true });
const revision = z.bigint().nonnegative();

export const voicebotErrorCodeSchema = z.enum([
  'NOT_AUTHENTICATED', 'NOT_AUTHORISED', 'PATIENT_MISMATCH', 'DEVICE_REPLACED',
  'VOICEBOT_DISABLED', 'PATIENT_NOT_ENABLED', 'SYNC_NOT_READY', 'UNSUPPORTED_LANGUAGE',
  'INVALID_REQUEST', 'INVALID_WAV', 'PAYLOAD_TOO_LARGE', 'RATE_LIMITED',
  'UPSTREAM_TIMEOUT', 'UPSTREAM_UNAVAILABLE', 'UPSTREAM_CONTRACT_ERROR',
  'SESSION_NOT_FOUND', 'JOB_NOT_FOUND', 'AUDIO_NOT_FOUND', 'JOB_EXPIRED',
  'CONFLICT', 'INTERNAL_ERROR',
]);
export const voicebotIntegrationStatusSchema = z.enum(['disabled', 'pending', 'syncing', 'ready', 'error', 'unavailable']);
export const voicebotCapabilitySchema = z.object({
  smriti_code: z.string().min(1).max(16), voicebot_code: z.string().min(1).max(16),
  text_enabled: z.boolean(), asr_enabled: z.boolean(), tts_enabled: z.boolean(), measured: z.boolean(),
}).strict();
const familyMember = z.object({ external_id: uuid, name: z.string().min(1).max(80), relationship: z.string().min(1).max(40), memory_prompt: z.string().max(500).nullable(), is_deceased: z.boolean() }).strict();
const medicine = z.object({ external_id: uuid, name: z.string().min(1).max(80), dose: z.string().min(1).max(40), active: z.boolean(), days_of_week: z.string().max(20), chosen_time_min: z.number().int().min(0).max(1439), window_start_min: z.number().int().min(0).max(1439), window_end_min: z.number().int().min(0).max(1439) }).strict();
const routine = z.object({ external_id: uuid, time_min: z.number().int().min(0).max(1439), activity: z.string().min(1).max(120) }).strict();
export const voicebotSnapshotV1Schema = z.object({ version: z.literal(1), patient_id: uuid, display_name: z.string().min(1).max(120), language_code: z.string().min(1).max(16), timezone: z.string().min(1).max(64), active: z.boolean(), revision, family_members: z.array(familyMember).max(200), medicines: z.array(medicine).max(200), daily_routines: z.array(routine).max(200) }).strict();
export const voicebotAdminRequestSchema = z.object({ operation: z.enum(['status', 'enable', 'disable', 'retry_sync']), patient_id: uuid }).strict();
export const voicebotAdminResponseSchema = z.object({ ok: z.boolean(), request_id: uuid, data: z.object({ enabled: z.boolean(), status: voicebotIntegrationStatusSchema, desired_revision: revision, applied_revision: revision, last_attempt_at: timestamp.nullable(), last_synced_at: timestamp.nullable(), last_error_code: voicebotErrorCodeSchema.nullable(), retry_allowed: z.boolean(), language: voicebotCapabilitySchema }).strict().optional(), error: z.object({ code: voicebotErrorCodeSchema, message: z.string(), retryable: z.boolean(), retry_after_ms: z.number().int().nonnegative().nullable() }).strict().optional() }).strict();
export const voicebotGatewayRequestSchema = z.object({ operation: z.enum(['welcome', 'conversation_text', 'conversation_voice', 'job_status', 'cancel_job', 'fetch_audio']), patient_id: uuid, client_request_id: uuid }).passthrough();
export const voicebotGatewayResponseSchema = z.object({ ok: z.boolean(), request_id: uuid, data: z.unknown().optional(), error: z.object({ code: voicebotErrorCodeSchema, message: z.string(), retryable: z.boolean(), retry_after_ms: z.number().int().nonnegative().nullable() }).strict().optional() }).strict();
export type VoicebotErrorCode = z.infer<typeof voicebotErrorCodeSchema>;
export type VoicebotIntegrationStatus = z.infer<typeof voicebotIntegrationStatusSchema>;
export type VoicebotCapability = z.infer<typeof voicebotCapabilitySchema>;
export type VoicebotSnapshotV1 = z.infer<typeof voicebotSnapshotV1Schema>;
export type VoicebotAdminRequest = z.infer<typeof voicebotAdminRequestSchema>;
export type VoicebotAdminResponse = z.infer<typeof voicebotAdminResponseSchema>;
export type VoicebotGatewayRequest = z.infer<typeof voicebotGatewayRequestSchema>;
export type VoicebotGatewayResponse = z.infer<typeof voicebotGatewayResponseSchema>;
