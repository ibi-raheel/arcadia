import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getSupabaseServerClient } from '@/lib/supabase/server';

import { CreateCourseDialog } from './_components/CreateCourseDialog';

export const dynamic = 'force-dynamic';

type DashboardCourse = {
  id: string;
  title: string;
  description: string | null;
  published: boolean;
  updated_at: string;
};

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const supabase = getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/dashboard');

  // Role gate — only creators + admins can see /dashboard (decision A,
  // revised 2026-04-20). Regular members get a 403-style page rather
  // than a silent redirect, so the "wrong account?" case is discoverable.
  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('member_id', user.id)
    .maybeSingle();
  const role = membership?.role ?? 'member';
  if (role !== 'creator' && role !== 'admin') {
    return <NotAuthorised />;
  }

  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, title, description, published, updated_at')
    .eq('creator_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
        <p className="text-red-400">Couldn&rsquo;t load your courses: {error.message}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl p-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Your courses</h1>
            <p className="mt-1 text-sm text-slate-400">
              Build, edit, and publish courses for your realm.
            </p>
          </div>
          <CreateCourseDialog />
        </header>

        {courses && courses.length > 0 ? <CourseGrid courses={courses} /> : <EmptyState />}
      </div>
    </main>
  );
}

function CourseGrid({ courses }: { readonly courses: DashboardCourse[] }): React.JSX.Element {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((c) => (
        <li key={c.id}>
          <Link
            href={`/dashboard/courses/${c.id}`}
            className="block rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-600 hover:bg-slate-800/60"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-medium text-slate-100">{c.title}</h2>
              <PublishedBadge published={c.published} />
            </div>
            {c.description && (
              <p className="mt-2 line-clamp-3 text-sm text-slate-400">{c.description}</p>
            )}
            <p className="mt-4 text-xs text-slate-500">
              Updated {new Date(c.updated_at).toLocaleDateString()}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function PublishedBadge({ published }: { readonly published: boolean }): React.JSX.Element {
  return published ? (
    <span className="rounded-full bg-emerald-900/60 px-2 py-0.5 text-xs font-medium text-emerald-300">
      Published
    </span>
  ) : (
    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-400">
      Draft
    </span>
  );
}

function NotAuthorised(): React.JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-8 text-slate-100">
      <div className="max-w-md rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
        <h1 className="text-2xl font-semibold">Not a creator account</h1>
        <p className="mt-2 text-sm text-slate-400">
          The dashboard is for creators only. If you&rsquo;re expecting access, ask an admin to
          promote your account, or switch to a creator account.
        </p>
        <Link
          href="/world"
          className="mt-6 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          Back to the world
        </Link>
      </div>
    </main>
  );
}

function EmptyState(): React.JSX.Element {
  return (
    <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center">
      <p className="text-lg text-slate-300">You haven&rsquo;t created a course yet.</p>
      <p className="mt-2 text-sm text-slate-500">
        Click <span className="font-medium text-slate-300">Create course</span> above to get
        started.
      </p>
    </div>
  );
}
