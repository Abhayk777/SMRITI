import { optionsResponse } from '../_shared/cors.ts';
import {
  errorResponse,
  handleError,
  jsonResponse,
  methodNotAllowedResponse,
} from '../_shared/http.ts';
import { provisionDevice } from '../_shared/pairing.ts';
import { createAdminClient, requireCaregiver } from '../_shared/supabase.ts';
import { pairDeviceAuthenticatedBodySchema } from '../_shared/types.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') return methodNotAllowedResponse();

  try {
    const parsed = pairDeviceAuthenticatedBodySchema.safeParse(
      await req.json().catch(() => null),
    );
    if (!parsed.success) return errorResponse(400, 'invalid request body');

    await requireCaregiver(req, parsed.data.patient_id);

    return jsonResponse(
      await provisionDevice(createAdminClient(), parsed.data.patient_id),
    );
  } catch (error) {
    return handleError(error);
  }
});
