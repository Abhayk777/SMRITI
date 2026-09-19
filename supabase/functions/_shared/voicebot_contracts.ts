// Manual Deno mirror of packages/shared/src/voicebot.ts. Keep in sync.
export type VoicebotErrorCode = 'NOT_AUTHENTICATED' | 'NOT_AUTHORISED' | 'PATIENT_MISMATCH' | 'DEVICE_REPLACED' | 'VOICEBOT_DISABLED' | 'PATIENT_NOT_ENABLED' | 'SYNC_NOT_READY' | 'UNSUPPORTED_LANGUAGE' | 'INVALID_REQUEST' | 'INVALID_WAV' | 'PAYLOAD_TOO_LARGE' | 'RATE_LIMITED' | 'UPSTREAM_TIMEOUT' | 'UPSTREAM_UNAVAILABLE' | 'UPSTREAM_CONTRACT_ERROR' | 'SESSION_NOT_FOUND' | 'JOB_NOT_FOUND' | 'AUDIO_NOT_FOUND' | 'JOB_EXPIRED' | 'CONFLICT' | 'INTERNAL_ERROR' | 'METHOD_NOT_ALLOWED' | 'PATIENT_NOT_FOUND' | 'CONSENT_REQUIRED';
export type VoicebotIntegrationStatus = 'disabled' | 'pending' | 'syncing' | 'ready' | 'error' | 'unavailable';
export type VoicebotCapability = { smriti_code: string; voicebot_code: string; text_enabled: boolean; asr_enabled: boolean; tts_enabled: boolean; measured: boolean };
export type VoicebotSnapshotV1 = { version: 1; patient_id: string; display_name: string; language_code: string; timezone: string; active: boolean; revision: number; family_members: Array<{ external_id: string; name: string; relationship: string; memory_prompt: string | null; is_deceased: boolean }>; medicines: Array<{ external_id: string; name: string; dose: string; active: boolean; days_of_week: string; chosen_time_min: number; window_start_min: number; window_end_min: number }>; daily_routines: Array<{ external_id: string; time_min: number; activity: string }> };
export type VoicebotAdminRequest = { operation: 'status' | 'enable' | 'disable' | 'retry_sync'; patient_id: string };
export type VoicebotGatewayRequest = { operation: 'welcome' | 'conversation_text' | 'conversation_voice' | 'job_status' | 'cancel_job' | 'fetch_audio'; patient_id: string; client_request_id: string };
export function isVoicebotAdminRequest(value: unknown): value is VoicebotAdminRequest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const input = value as Record<string, unknown>;
  return typeof input.patient_id === 'string' && ['status', 'enable', 'disable', 'retry_sync'].includes(String(input.operation));
}
