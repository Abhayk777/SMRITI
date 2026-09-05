import { optionsResponse } from '../_shared/cors.ts';
import {
  errorResponse,
  handleError,
  jsonResponse,
  methodNotAllowedResponse,
} from '../_shared/http.ts';
import { provisionDevice } from '../_shared/pairing.ts';
import { consumeRedeemAttempt } from '../_shared/rate-limit.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { redeemPairingTokenBodySchema } from '../_shared/types.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') return methodNotAllowedResponse();

  try {
    const admin = createAdminClient();
    const limit = await consumeRedeemAttempt(req, admin);
    if (!limit.allowed) {
      const response = errorResponse(429, 'too many attempts');
      response.headers.set('Retry-After', String(limit.retryAfterSeconds));
      return response;
    }

    const parsed = redeemPairingTokenBodySchema.safeParse(
      await req.json().catch(() => null),
    );
    if (!parsed.success) return errorResponse(400, 'invalid request body');

    // One statement performs the claim. Only its RETURNING row authorizes
    // provisioning, so concurrent requests cannot both create a device.
    const { data: claimed, error: claimError } = await admin
      .from('pairing_tokens')
      .update({ consumed: true, consumed_at: 'now' })
      .eq('token', parsed.data.token)
      .eq('consumed', false)
      .gt('expires_at', 'now')
      .select('*');

    if (claimError) {
      console.error('Pairing token claim failed', claimError);
      return errorResponse(500, 'could not redeem pairing token');
    }
    if (claimed.length !== 1) return errorResponse(400, 'invalid or expired');

    return jsonResponse(await provisionDevice(admin, claimed[0].patient_id));
  } catch (error) {
    return handleError(error);
  }
});
