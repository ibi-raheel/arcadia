import Link from 'next/link';

import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function Home(): Promise<React.JSX.Element> {
  const supabase = getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Unauthed: classic landing copy + auth links.
  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0a0a0a] p-8 text-center text-neutral-200">
        <h1 className="text-5xl font-semibold tracking-tight">Arcadia</h1>
        <p className="max-w-md text-neutral-400">
          A 2.5D isometric virtual world for creators and their communities.
        </p>
        <div className="mt-2 flex gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-500"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg border border-slate-700 bg-slate-900 px-5 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            Sign up
          </Link>
        </div>
      </main>
    );
  }

  // Authed: read role + display name so the hub can show the right options
  // and greet the user. Both are nullable — gracefully fall back.
  const { data: membership } = await supabase
    .from('memberships')
    .select('role, display_name')
    .eq('member_id', user.id)
    .maybeSingle();

  const role = membership?.role ?? 'member';
  const displayName = membership?.display_name ?? user.email ?? 'friend';
  const isCreator = role === 'creator' || role === 'admin';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0a0a0a] p-8 text-center text-neutral-200">
      <div>
        <h1 className="text-5xl font-semibold tracking-tight">Arcadia</h1>
        <p className="mt-2 text-neutral-400">Welcome back, {displayName}.</p>
      </div>

      <div className="mt-2 grid w-full max-w-md gap-3 sm:grid-cols-2">
        <Link
          href="/world"
          className="group rounded-xl border border-slate-800 bg-slate-900 p-6 text-left transition hover:border-emerald-500 hover:bg-slate-800/60"
        >
          <div className="text-xs font-medium uppercase tracking-wide text-emerald-400">
            Play
          </div>
          <div className="mt-1 text-lg font-semibold text-slate-100">Enter the World</div>
          <p className="mt-1 text-sm text-slate-400">
            Walk around, chat in the Tavern, meet other members.
          </p>
        </Link>

        {isCreator ? (
          <Link
            href="/dashboard"
            className="group rounded-xl border border-slate-800 bg-slate-900 p-6 text-left transition hover:border-amber-500 hover:bg-slate-800/60"
          >
            <div className="text-xs font-medium uppercase tracking-wide text-amber-400">
              Create
            </div>
            <div className="mt-1 text-lg font-semibold text-slate-100">Open the Dashboard</div>
            <p className="mt-1 text-sm text-slate-400">
              Build and publish courses for your realm.
            </p>
          </Link>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-left">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Creator access
            </div>
            <div className="mt-1 text-lg font-semibold text-slate-400">Not available</div>
            <p className="mt-1 text-sm text-slate-500">
              Ask an admin to promote your account to a creator.
            </p>
          </div>
        )}
      </div>

      <form action="/api/auth/signout" method="post" className="mt-2">
        <button
          type="submit"
          className="text-xs text-slate-500 transition hover:text-slate-300"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
