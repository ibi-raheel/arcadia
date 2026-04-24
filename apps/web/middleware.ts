import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { decideAvatarGate, pathRequiresAvatarGate } from '@/lib/avatar-gate';

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Auth-gate middleware (Phase 0 Step 16, TAD §3.3).
// Every non-public route requires a Supabase session; unauthenticated
// requests are redirected to /login. Authenticated users visiting /login
// or /signup are bounced back to /.
//
// Public paths (no session required):
//   /                 — landing
//   /login, /signup   — auth forms
//   /api/health       — liveness probe
//   /api/stream/webhook — Cloudflare Stream webhook (verified by signature, Phase 3)
//   /_next/*, static assets — handled by the matcher config below

const EXACT_PUBLIC_PATHS = new Set(['/', '/login', '/signup', '/kit']);
const PUBLIC_PREFIXES = ['/api/health', '/api/stream/webhook'];

function isPublicPath(pathname: string): boolean {
  if (EXACT_PUBLIC_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase env vars aren't configured (e.g. in local dev before .env.local
  // is filled), fall through to Next without enforcing auth. Production must
  // have these set; Vercel env vars are wired in Phase 0 Step 14.
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Refreshes the session cookie if expired. Use getUser (not getSession)
  // in middleware — it hits Supabase Auth and is the verified path.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Authenticated user landing on an auth page: bounce to home.
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const dest = request.nextUrl.clone();
    dest.pathname = '/';
    return NextResponse.redirect(dest);
  }

  // Unauthenticated user on a protected page: bounce to /login.
  if (!user && !isPublicPath(pathname)) {
    const dest = request.nextUrl.clone();
    dest.pathname = '/login';
    dest.searchParams.set('next', pathname);
    return NextResponse.redirect(dest);
  }

  // Avatar-picker gate (Phase 1 Step 11). Only the three paths that care
  // about avatar_id trigger the DB lookup — everything else skips it.
  if (user && pathRequiresAvatarGate(pathname)) {
    const { data: membership } = await supabase
      .from('memberships')
      .select('avatar_id')
      .eq('member_id', user.id)
      .maybeSingle();

    const decision = decideAvatarGate({
      pathname,
      hasUser: true,
      avatarId: membership?.avatar_id ?? null,
    });

    if (decision.kind === 'redirect') {
      const dest = request.nextUrl.clone();
      dest.pathname = decision.to;
      dest.search = '';
      return NextResponse.redirect(dest);
    }
  }

  return response;
}

// Match everything except static assets, favicons, and Next internals.
// Keep this in sync with Next.js's static-file conventions.
// `tmj|json` added Phase 1 Step 3 — world.tmj is a public game asset that
// should bypass auth + the avatar gate (Phaser fetches it before the player
// is "in" the world conceptually).
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|tmj|json)$).*)',
  ],
};
