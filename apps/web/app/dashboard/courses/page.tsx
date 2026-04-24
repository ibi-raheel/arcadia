// `/dashboard/courses` — creator's course list. The existing
// `/dashboard` route's course CRUD moved here as the `courses` tab of
// the new Keeper's Studio shell. Server component; data read matches
// the pre-Phase-8 query exactly.

import Link from 'next/link';

import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Chip, LedgerCard, Hand, Kicker, WaxSeal } from '@/components/scriptorium';
import { getSupabaseServerClient } from '@/lib/supabase/server';

import { CreateCourseDialog } from '../_components/CreateCourseDialog';

export const dynamic = 'force-dynamic';

type DashboardCourse = {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly published: boolean;
  readonly updated_at: string;
};

export default async function CoursesTab(): Promise<React.JSX.Element> {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Layout already auth-gates, but keep a defensive null check for the
  // type narrowing on `user.id` below.
  if (!user) return <></>;

  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, title, description, published, updated_at')
    .eq('creator_id', user.id)
    .order('updated_at', { ascending: false });

  return (
    <DashboardShell
      kicker="your courses"
      title={
        <>
          the <em style={{ color: 'var(--lantern)', fontStyle: 'italic' }}>kiln</em>.
        </>
      }
      tagline="~ publish what&rsquo;s finished, keep what&rsquo;s drying ~"
      actions={<CreateCourseDialog />}
    >
      {error ? (
        <p style={{ color: 'var(--crimson)' }}>Couldn&rsquo;t load your courses: {error.message}</p>
      ) : !courses || courses.length === 0 ? (
        <EmptyCoursesState />
      ) : (
        <CourseLedger courses={courses} />
      )}
    </DashboardShell>
  );
}

function CourseLedger({
  courses,
}: {
  readonly courses: readonly DashboardCourse[];
}): React.JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {courses.map((c, i) => (
        <Link
          key={c.id}
          href={`/dashboard/courses/${c.id}`}
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <LedgerCard rotate={i % 2 === 0 ? -0.3 : 0.3}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 18,
              }}
            >
              <div style={{ flex: 1 }}>
                <Kicker>{c.published ? 'signed · published' : 'drying · draft'}</Kicker>
                <h3 style={{ marginTop: 6 }}>{c.title}</h3>
                {c.description && (
                  <p
                    className="body-italic"
                    style={{
                      marginTop: 6,
                      color: 'var(--ink-soft)',
                      fontSize: 15,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {c.description}
                  </p>
                )}
                <Hand>~ updated {new Date(c.updated_at).toLocaleDateString()} ~</Hand>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: 10,
                }}
              >
                {c.published ? <WaxSeal letter="P" /> : <Chip>draft</Chip>}
              </div>
            </div>
          </LedgerCard>
        </Link>
      ))}
    </div>
  );
}

function EmptyCoursesState(): React.JSX.Element {
  return (
    <LedgerCard>
      <p className="body-italic" style={{ fontSize: 18, color: 'var(--ink)', textAlign: 'center' }}>
        no courses yet. light the lantern and write the first.
      </p>
      <p className="hand" style={{ marginTop: 8, textAlign: 'center', fontSize: 16 }}>
        ~ the button above opens a fresh scroll ~
      </p>
    </LedgerCard>
  );
}
