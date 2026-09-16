import { optionsResponse } from '../_shared/cors.ts';
import { secretsEqual } from '../_shared/signatures.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { createVoicebotSyncWorkerHandler } from '../_shared/voicebot_handlers.ts';

const handler = createVoicebotSyncWorkerHandler({
  admin: createAdminClient, fetch, env: (name) => Deno.env.get(name),
  now: () => new Date(), random: () => crypto.randomUUID(),
  authorizeCaregiver: async () => {},
  authorizeWorker: async (req) => { const secret = Deno.env.get('INTERNAL_CRON_SECRET'); return !!secret && await secretsEqual(secret, req.headers.get('x-internal-secret')); },
  log: (event, fields) => console.warn(event, fields),
});
Deno.serve((req) => req.method === 'OPTIONS' ? optionsResponse() : handler(req));
