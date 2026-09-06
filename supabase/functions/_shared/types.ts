// Manual, dependency-free runtime mirror of the T12-T14 contracts in
// packages/shared/src/schemas.ts. Supabase's local Edge container cannot mount
// that workspace package; changes to either copy must be kept in sync.

export type CreatePairingTokenBody = {
  patient_id: string;
};

export type RedeemPairingTokenBody = {
  token: string;
};

export type PairingResult = {
  refresh_token: string;
  patient_id: string;
  device_user_id: string;
  lang_code: string;
  elder_name: string;
  age: number;
  education_years: number;
};

export type EscalationStatus =
  | 'requested'
  | 'executing'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type EscalationRecord = {
  id: string;
  patient_id: string;
  reminder_event_id: string | null;
  medication_id: string | null;
  step: number;
  status: EscalationStatus;
  reason: string | null;
  twilio_sid: string | null;
  requested_at: number;
  not_before: string;
  executed_at: string | null;
  source: 'device' | 'watchdog';
  created_at: string;
};

export type EscalationWorkerBody =
  | { mode: 'sweep' }
  | {
    type: 'INSERT' | 'UPDATE' | 'DELETE';
    table: 'escalations';
    schema: 'public';
    record: EscalationRecord;
    old_record: EscalationRecord | null;
  };

export type WatchdogBody = Record<string, never>;

export type EscalationCallbackContext = {
  patient_id: string;
  escalation_id: string;
};

export type VapiWebhookBody = {
  message?: {
    artifact?: {
      structuredOutputs?: Record<string, {
        name?: string;
        result?: unknown;
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    };
    analysis?: {
      structuredData?: {
        took_medication?: unknown;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    call?: {
      assistantOverrides?: {
        variableValues?: Record<string, unknown>;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PAIRING_TOKEN_PATTERN = /^[ACDEFGHJKLMNPQRSTUVWXYZ2345679]{8}$/;
const ESCALATION_STATUSES = new Set([
  'requested',
  'executing',
  'completed',
  'cancelled',
  'failed',
]);

function isStrictObjectWithKeys(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const actualKeys = Object.keys(value);
  return actualKeys.length === keys.length && keys.every((key) => key in value);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function parseEscalationRecord(value: unknown): EscalationRecord | null {
  if (!isRecord(value)) return null;
  const expectedKeys = [
    'id',
    'patient_id',
    'reminder_event_id',
    'medication_id',
    'step',
    'status',
    'reason',
    'twilio_sid',
    'requested_at',
    'not_before',
    'executed_at',
    'source',
    'created_at',
  ] as const;
  if (!isStrictObjectWithKeys(value, expectedKeys)) return null;
  if (
    typeof value.id !== 'string'
    || typeof value.patient_id !== 'string'
    || !UUID_PATTERN.test(value.patient_id)
    || (value.reminder_event_id !== null
      && (typeof value.reminder_event_id !== 'string'
        || !UUID_PATTERN.test(value.reminder_event_id)))
    || (value.medication_id !== null
      && (typeof value.medication_id !== 'string' || !UUID_PATTERN.test(value.medication_id)))
    || !Number.isInteger(value.step)
    || typeof value.status !== 'string'
    || !ESCALATION_STATUSES.has(value.status)
    || (value.reason !== null && typeof value.reason !== 'string')
    || (value.twilio_sid !== null && typeof value.twilio_sid !== 'string')
    || !Number.isInteger(value.requested_at)
    || !isTimestamp(value.not_before)
    || (value.executed_at !== null && !isTimestamp(value.executed_at))
    || (value.source !== 'device' && value.source !== 'watchdog')
    || !isTimestamp(value.created_at)
  ) return null;

  return value as EscalationRecord;
}

export const createPairingTokenBodySchema = {
  safeParse(value: unknown): SafeParseResult<CreatePairingTokenBody> {
    if (
      !isStrictObjectWithKeys(value, ['patient_id'])
      || typeof value.patient_id !== 'string'
      || !UUID_PATTERN.test(value.patient_id)
    ) {
      return { success: false, error: 'invalid request body' };
    }
    return { success: true, data: { patient_id: value.patient_id } };
  },
};

export const pairDeviceAuthenticatedBodySchema = createPairingTokenBodySchema;

export const redeemPairingTokenBodySchema = {
  safeParse(value: unknown): SafeParseResult<RedeemPairingTokenBody> {
    if (!isStrictObjectWithKeys(value, ['token']) || typeof value.token !== 'string') {
      return { success: false, error: 'invalid request body' };
    }

    const token = value.token.toUpperCase().replace(/-/g, '');
    if (!PAIRING_TOKEN_PATTERN.test(token)) {
      return { success: false, error: 'invalid request body' };
    }
    return { success: true, data: { token } };
  },
};

export const escalationWorkerBodySchema = {
  safeParse(value: unknown): SafeParseResult<EscalationWorkerBody> {
    if (isStrictObjectWithKeys(value, ['mode']) && value.mode === 'sweep') {
      return { success: true, data: { mode: 'sweep' } };
    }
    if (!isStrictObjectWithKeys(
      value,
      ['type', 'table', 'schema', 'record', 'old_record'],
    )) return { success: false, error: 'invalid request body' };
    if (
      value.type !== 'INSERT'
      && value.type !== 'UPDATE'
      && value.type !== 'DELETE'
    ) return { success: false, error: 'invalid request body' };
    if (value.table !== 'escalations' || value.schema !== 'public') {
      return { success: false, error: 'invalid request body' };
    }
    const record = parseEscalationRecord(value.record);
    const oldRecord = value.old_record === null
      ? null
      : parseEscalationRecord(value.old_record);
    if (!record || (value.old_record !== null && !oldRecord)) {
      return { success: false, error: 'invalid request body' };
    }
    return {
      success: true,
      data: {
        type: value.type,
        table: 'escalations',
        schema: 'public',
        record,
        old_record: oldRecord,
      },
    };
  },
};

export const watchdogBodySchema = {
  safeParse(value: unknown): SafeParseResult<WatchdogBody> {
    if (!isStrictObjectWithKeys(value, [])) {
      return { success: false, error: 'invalid request body' };
    }
    return { success: true, data: {} };
  },
};

export const escalationCallbackContextSchema = {
  safeParse(value: unknown): SafeParseResult<EscalationCallbackContext> {
    if (
      !isStrictObjectWithKeys(value, ['patient_id', 'escalation_id'])
      || typeof value.patient_id !== 'string'
      || !UUID_PATTERN.test(value.patient_id)
      || typeof value.escalation_id !== 'string'
      || value.escalation_id.length < 1
      || value.escalation_id.length > 512
    ) return { success: false, error: 'invalid callback context' };
    return {
      success: true,
      data: {
        patient_id: value.patient_id,
        escalation_id: value.escalation_id,
      },
    };
  },
};

export const vapiWebhookBodySchema = {
  safeParse(value: unknown): SafeParseResult<VapiWebhookBody> {
    if (!isRecord(value)) return { success: false, error: 'invalid request body' };
    if ('message' in value && value.message !== undefined && !isRecord(value.message)) {
      return { success: false, error: 'invalid request body' };
    }
    return { success: true, data: value as VapiWebhookBody };
  },
};
