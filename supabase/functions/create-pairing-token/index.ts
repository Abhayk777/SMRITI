import { optionsResponse } from '../_shared/cors.ts';
import {
  errorResponse,
  handleError,
  jsonResponse,
  methodNotAllowedResponse,
} from '../_shared/http.ts';
import { createAdminClient, requireCaregiver } from '../_shared/supabase.ts';
import { createPairingTokenBodySchema } from '../_shared/types.ts';

const ALPHABET = 'ACDEFGHJKLMNPQRSTUVWXYZ2345679';
const TOKEN_LENGTH = 8;
const TOKEN_TTL_MS = 30 * 60 * 1000;
const MAX_COLLISION_RETRIES = 5;

function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_LENGTH));
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') return methodNotAllowedResponse();

  try {
    const parsed = createPairingTokenBodySchema.safeParse(
      await req.json().catch(() => null),
    );
    if (!parsed.success) return errorResponse(400, 'invalid request body');

    const user = await requireCaregiver(req, parsed.data.patient_id);

    const admin = createAdminClient();
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
    for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt += 1) {
      const token = generateCode();
      const { error } = await admin.from('pairing_tokens').insert({
        token,
        patient_id: parsed.data.patient_id,
        created_by: user.id,
        expires_at: expiresAt,
      });

      if (!error) return jsonResponse({ token, expires_at: expiresAt });
      if (error.code !== '23505') {
        console.error('Pairing token insert failed', error);
        return errorResponse(500, 'could not create pairing token');
      }
    }

    return errorResponse(503, 'could not allocate pairing token');
  } catch (error) {
    return handleError(error);
  }
});
