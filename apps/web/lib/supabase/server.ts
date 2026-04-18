import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Server-side Supabase client bound to the incoming request's cookies.
// Use inside server components, route handlers, and server actions.
// Anon-key scoped; RLS applies. For admin / service-role operations
// import `getSupabaseAdminClient` from './admin' instead — server-only.
export function getSupabaseServerClient(): SupabaseClient {
  const cookieStore = cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase server env vars missing: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY',
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a server component where cookie writes aren't allowed.
          // Safe to ignore — middleware handles session refresh on the next request.
        }
      },
    },
  });
}
