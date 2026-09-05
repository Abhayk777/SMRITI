// Manual, dependency-free runtime mirror of the T12 contracts in
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

type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PAIRING_TOKEN_PATTERN = /^[ACDEFGHJKLMNPQRSTUVWXYZ2345679]{8}$/;

function isStrictObjectWithKeys(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const actualKeys = Object.keys(value);
  return actualKeys.length === keys.length && keys.every((key) => key in value);
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
