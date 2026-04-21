import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@/lib/supabase/server';

// POST /api/auth/signout — signs the user out and redirects to home.
// The form on / uses this so sign-out works without a client component.
export async function POST(request: Request): Promise<NextResponse> {
  const supabase = getSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
