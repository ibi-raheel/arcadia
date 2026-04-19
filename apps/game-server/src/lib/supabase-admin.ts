// Service-role Supabase client. Server-only — never import from any module
// that ships to a browser. Throws at import time if either required env var
// is missing so misconfigured deploys fail fast (vs. producing mysterious
// onAuth rejects at runtime).
//
// Env — accepts either name (the NEXT_PUBLIC_ prefix is a Next.js
// convention and doesn't belong on the game-server; Railway-side the
// unprefixed name is more natural):
//   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL — Supabase project URL
//   SUPABASE_SERVICE_KEY — service-role key. Bypasses RLS. Treat as secret.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Strip whitespace + a stray leading `=` that Railway's value field can
// capture when a KEY=VALUE line is pasted into the value box. Pure normalisation.
function sanitiseEnv(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const trimmed = raw.trim().replace(/^=+\s*/, '');
  return trimmed.length > 0 ? trimmed : undefined;
}

const SUPABASE_URL = sanitiseEnv(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL);
const SUPABASE_SERVICE_KEY = sanitiseEnv(process.env.SUPABASE_SERVICE_KEY);

// Boot-time diagnostic. Both names are logged so Railway's crash message
// shows which env var actually reached the process.
console.log(
  `[supabase-admin] env presence — SUPABASE_URL=${process.env.SUPABASE_URL ? 'set' : 'unset'} NEXT_PUBLIC_SUPABASE_URL=${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'unset'} SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY ? 'set' : 'unset'}`,
);

if (!SUPABASE_URL) {
  throw new Error('supabase-admin: neither SUPABASE_URL nor NEXT_PUBLIC_SUPABASE_URL is set');
}
if (!/^https?:\/\//i.test(SUPABASE_URL)) {
  throw new Error(
    `supabase-admin: SUPABASE_URL must start with http(s):// — got "${SUPABASE_URL}"`,
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
