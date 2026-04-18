import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

// Server-only Supabase client using the service-role key.
// Never import this file into a client-side module — the service key must
// never reach the browser. Next.js server runtime (API routes, server
// components, middleware) only.
export function getSupabaseAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Supabase admin env vars missing: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY',
    );
  }

  adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}
