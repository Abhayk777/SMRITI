import type { SupabaseClient } from '@supabase/supabase-js';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function sourceIp(req: Request): string {
  return req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-real-ip')
    ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown';
}

async function hashSourceIp(ip: string): Promise<string> {
  const bytes = new TextEncoder().encode(ip);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Distributed pre-lookup stopgap using the existing audit log. A dedicated,
 * atomic rate-limit store is a post-hackathon hardening item; audit_log is
 * intentionally reused here so T12 does not add schema.
 */
export async function consumeRedeemAttempt(
  req: Request,
  admin: SupabaseClient,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const sourceIpHash = await hashSourceIp(sourceIp(req));
  const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();

  const { count, error: countError } = await admin
    .from('audit_log')
    .select('id', { count: 'exact', head: true })
    .eq('action', 'pairing_attempt')
    .eq('detail->>source_ip_hash', sourceIpHash)
    .gte('created_at', windowStart);

  if (countError) {
    console.error('Pairing rate-limit count failed', countError);
    throw new Error('rate limit unavailable');
  }

  if ((count ?? 0) >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSeconds: WINDOW_MS / 1000 };
  }

  const { error: insertError } = await admin.from('audit_log').insert({
    action: 'pairing_attempt',
    detail: { source_ip_hash: sourceIpHash },
  });
  if (insertError) {
    console.error('Pairing rate-limit audit insert failed', insertError);
    throw new Error('rate limit unavailable');
  }

  return { allowed: true, retryAfterSeconds: 0 };
}
