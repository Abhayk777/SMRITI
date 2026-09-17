import { optionsResponse } from "../_shared/cors.ts";
import { createAdminClient, requireDevice } from "../_shared/supabase.ts";
import { createVoicebotGatewayHandler } from "../_shared/voicebot_gateway_handler.ts";

const handler = createVoicebotGatewayHandler({
  admin: createAdminClient,
  fetch,
  env: (name) => Deno.env.get(name),
  random: () => crypto.randomUUID(),
  authorizeDevice: async (request, patientId) => ({ id: (await requireDevice(request, patientId)).id }),
  log: (event, fields) => console.error(event, fields),
});

Deno.serve((request) => request.method === "OPTIONS" ? optionsResponse() : handler(request));
