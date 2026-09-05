import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

import { HttpError } from './http.ts';

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function createAdminClient(): SupabaseClient {
  return createClient(
    requiredEnv('SUPABASE_URL'),
    requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export function createAnonClient(): SupabaseClient {
  return createClient(
    requiredEnv('SUPABASE_URL'),
    requiredEnv('SUPABASE_ANON_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function createCallerClient(req: Request): SupabaseClient {
  const authorization = req.headers.get('Authorization');
  if (!authorization) throw new HttpError(401, 'not authenticated');

  return createClient(
    requiredEnv('SUPABASE_URL'),
    requiredEnv('SUPABASE_ANON_KEY'),
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authorization } },
    },
  );
}

export async function requireCaregiver(req: Request, patientId: string): Promise<User> {
  const caller = createCallerClient(req);
  const { data: { user }, error: userError } = await caller.auth.getUser();
  if (userError || !user) throw new HttpError(401, 'not authenticated');

  const { data: isCaregiver, error: caregiverError } = await caller.rpc(
    'is_caregiver',
    { p: patientId },
  );
  if (caregiverError) {
    console.error('Caregiver membership check failed', caregiverError);
    throw new HttpError(500, 'authorization check failed');
  }
  if (isCaregiver !== true) throw new HttpError(403, 'caregiver only');

  return user;
}
