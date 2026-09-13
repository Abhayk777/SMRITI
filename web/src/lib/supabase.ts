/**
 * Supabase client initialisation. Nothing else.
 *
 * ── Where the real keys go ────────────────────────────────────────────────
 * `web/.env.local` (git-ignored), two lines:
 *
 *     VITE_SUPABASE_URL=https://<project-ref>.supabase.co
 *     VITE_SUPABASE_ANON_KEY=<the anon / publishable key>
 *
 * The **anon** key only. The service-role key must never appear anywhere under
 * `web/` — it bypasses RLS, and RLS is the entire authorization layer for this
 * product (AGENTS.md non-negotiable 8).
 *
 * If either variable is missing the app does not crash: it drops into mock
 * mode (`isMockMode` below) and `lib/db.ts` answers every query from typed
 * fixtures instead. That keeps the UI demoable on a fresh clone, and it is the
 * only sanctioned reason for a query in this app not to hit the server.
 *
 * This file and `lib/db.ts` are the only two modules in `web/src` permitted to
 * import `@supabase/supabase-js` (frontend.md §1, §15 rule 1).
 */
import { createClient } from '@supabase/supabase-js'

import type { Database } from './database.types.ts'

/**
 * Trimmed, and empty treated as absent.
 *
 * `VITE_SUPABASE_URL=` with nothing after it is far more common than the line
 * being missing altogether — it is what a `.env.local` looks like after someone
 * strips their keys before committing. An empty string is falsy but not
 * nullish, so a `??` fallback would sail straight past it and hand
 * `createClient` an empty URL, which throws at module load and takes the whole
 * app down with a blank white screen. One read, one test, used consistently.
 */
const readEnv = (value: unknown): string | undefined => {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  return trimmed === '' ? undefined : trimmed
}

const url = readEnv(import.meta.env.VITE_SUPABASE_URL)
const anonKey = readEnv(import.meta.env.VITE_SUPABASE_ANON_KEY)

/**
 * True when credentials are absent. `lib/db.ts` branches on this to serve
 * fixtures; no other module should need to know.
 */
export const isMockMode = url === undefined || anonKey === undefined

if (isMockMode) {
  // Loud on purpose. Silently showing invented patient data in an app that
  // manages someone's medication would be the worst possible failure mode.
  console.warn(
    '[smriti] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. ' +
      'Running against local fixtures — nothing you see or save is real.',
  )
}

/**
 * The client. In mock mode this is still a real client object pointed at a
 * placeholder origin, so type-checking and channel plumbing stay identical;
 * `db.ts` simply never reaches it.
 */
export const supabase = createClient<Database>(
  url ?? 'https://mock.invalid',
  anonKey ?? 'mock-anon-key',
  {
    auth: {
      persistSession: !isMockMode,
      autoRefreshToken: !isMockMode,
      // Google returns the browser to `/auth` with the OAuth result. Let the
      // SDK consume it and persist the resulting Supabase session before the
      // route redirects the caregiver into the app.
      detectSessionInUrl: !isMockMode,
    },
  },
)
