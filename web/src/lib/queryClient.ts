import { QueryClient } from '@tanstack/react-query'

/**
 * TanStack Query configuration (frontend.md §7).
 *
 * Defaults are set for the *live* data - patients, content, flags, memos,
 * device status - all of which carry a realtime subscription that invalidates
 * them, so a short `staleTime` costs nothing and keeps a cold tab honest.
 * Historical view data (`daily_report` and friends) opts into a five-minute
 * `staleTime` at its own `useQuery` call site instead: once a day has passed
 * its row cannot change.
 *
 * `retry` is deliberately low. An RLS refusal is not a transient failure, and
 * retrying it three times just delays the "you don't have access" message the
 * caregiver actually needs to see.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
})

/** Historical view data: cached hard, per frontend.md §7. */
export const HISTORICAL_STALE_TIME = 5 * 60_000
