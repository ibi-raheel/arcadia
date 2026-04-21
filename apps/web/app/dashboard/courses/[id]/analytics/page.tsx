import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { getSupabaseServerClient } from '@/lib/supabase/server';

import { fetchCourseAnalytics } from './fetch';

export const dynamic = 'force-dynamic';

type Params = { readonly params: { readonly id: string } };

export default async function CourseAnalyticsPage({ params }: Params): Promise<React.JSX.Element> {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/dashboard/courses/${params.id}/analytics`);

  const { data: course } = await supabase
    .from('courses')
    .select('id, title')
    .eq('id', params.id)
    .maybeSingle<{ id: string; title: string }>();

  const result = await fetchCourseAnalytics(params.id);
  if (!result.ok) {
    if (result.status === 'unauthorized' || result.status === 'not-found') notFound();
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
        <p className="text-red-400">Couldn&rsquo;t load analytics: {result.error}</p>
      </main>
    );
  }
  const { enrolmentCount, completionRate, activeInLastWeek, recentActivity } = result.data;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/courses/${params.id}`}
              className="text-sm text-slate-400 transition hover:text-slate-200"
            >
              ← Editor
            </Link>
            <span className="text-slate-700">/</span>
            <h1 className="text-lg font-semibold">{course?.title ?? 'Course'} — Analytics</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl p-8">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Enrolments" value={String(enrolmentCount)} hint="total members" />
          <StatCard
            label="Completion rate"
            value={`${Math.round(completionRate * 100)}%`}
            hint="finished every lesson"
          />
          <StatCard label="Active this week" value={String(activeInLastWeek)} hint="last 7 days" />
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Recent activity
          </h2>
          {recentActivity.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-500">
              No progress events yet. Once members start watching lessons, their activity appears
              here.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2 text-left">Member</th>
                    <th className="px-4 py-2 text-left">Lesson</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">When</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((row) => (
                    <tr
                      key={`${row.memberId}-${row.lessonId}-${row.updatedAt}`}
                      className="border-t border-slate-800"
                    >
                      <td className="px-4 py-2 text-slate-200">{row.displayName}</td>
                      <td className="px-4 py-2 text-slate-300">{row.lessonTitle}</td>
                      <td className="px-4 py-2">
                        {row.completed ? (
                          <span className="rounded-full bg-emerald-900/60 px-2 py-0.5 text-xs text-emerald-300">
                            Completed
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                            In progress
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-500">
                        {new Date(row.updatedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  readonly label: string;
  readonly value: string;
  readonly hint: string;
}): React.JSX.Element {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-100">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}
