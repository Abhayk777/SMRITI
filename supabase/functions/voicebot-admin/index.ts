import { optionsResponse } from '../_shared/cors.ts';
import { createVoicebotAdminHandler } from '../_shared/voicebot_handlers.ts';
import { createAdminClient, requireCaregiver } from '../_shared/supabase.ts';

const handler = createVoicebotAdminHandler({
  admin: createAdminClient, fetch, env: (name) => Deno.env.get(name),
  now: () => new Date(), random: () => crypto.randomUUID(),
  authorizeCaregiver: requireCaregiver, authorizeWorker: async () => false,
  log: (event, fields) => console.warn(event, fields),
});
Deno.serve((req) => req.method === 'OPTIONS' ? optionsResponse() : handler(req));
