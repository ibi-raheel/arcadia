// Service-role Supabase client. Server-only — never import from any module
// that ships to a browser. Throws at import time if either required env var
// is missing so misconfigured deploys fail fast (vs. producing mysterious
// onAuth rejects at runtime).
//
// Env:
//   NEXT_PUBLIC_SUPABASE_URL — Supabase project URL (re-used on server as
//     the admin client's base URL).
//   SUPABASE_SERVICE_KEY — service-role key. Bypasses RLS. Treat as secret.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL) {
  throw new Error('supabase-admin: NEXT_PUBLIC_SUPABASE_URL is not set');
}
if (!/^https?:\/\//i.test(SUPABASE_URL)) {
  throw new Error(
    `supabase-admin: NEXT_PUBLIC_SUPABASE_URL must start with http(s):// — got "${SUPABASE_URL}"`,
  );
}
if (!SUPABASE_SERVICE_KEY) {
  throw new Error('supabase-admin: SUPABASE_SERVICE_KEY is not set');
}

export const supabaseAdmin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
