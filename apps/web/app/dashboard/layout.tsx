// Dashboard route group layout. Every /dashboard/* page inherits this
// auth + role gate so individual pages don't re-check. The shell itself
// (brand header, 6-tab nav, simulation toggle + badge, footer scribe
// line) is applied per-page inside `<DashboardShell>` since each tab
// wants its own title / kicker / tagline / actions props.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: Readonly<{ children: ReactNode }>): Promise<React.JSX.Element> {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/dashboard');

  // Role gate — creators + admins only. Regular members get a readable
  // "not authorised" page rather than a silent redirect so the wrong-
  // account case is discoverable.
  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('member_id', user.id)
    .maybeSingle();
  const role = membership?.role ?? 'member';
  if (role !== 'creator' && role !== 'admin') return <NotAuthorised />;

  return <>{children}</>;
}

function NotAuthorised(): React.JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-night p-8 text-vellum">
      <div className="max-w-md rounded-lg border border-bronze bg-desk p-8 text-center">
        <h1 style={{ color: 'var(--vellum)' }}>not a creator account</h1>
        <p style={{ color: 'var(--vellum-shadow)', marginTop: 10 }}>
          The studio is kept for creators only. If you&rsquo;re expecting access, ask an admin to
          promote your account, or sign in as a creator.
        </p>
        <Link
          href="/world"
          style={{
            display: 'inline-block',
            marginTop: 20,
            padding: '10px 22px',
            borderRadius: 30,
            background:
              'linear-gradient(135deg, var(--bronze-bright), var(--bronze) 45%, var(--bronze-deep))',
            color: 'var(--night)',
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 17,
            textDecoration: 'none',
          }}
        >
          back to the world
        </Link>
      </div>
    </main>
  );
}
