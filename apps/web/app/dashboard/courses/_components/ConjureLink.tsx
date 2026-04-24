// Entry-point button for the scribe (AI course maker). Sits next to
// the "ink a new course" button on /dashboard/courses. Routes to
// /dashboard/courses/conjure — the server component on that route
// resumes the creator's current unsealed draft or creates a fresh
// one.

'use client';

import Link from 'next/link';

import { GhostButton } from '@/components/scriptorium';

export function ConjureLink(): React.JSX.Element {
  return (
    <Link href="/dashboard/courses/conjure" style={{ textDecoration: 'none' }}>
      <GhostButton type="button" size="sm" onDark>
        ✦ conjure with the scribe
      </GhostButton>
    </Link>
  );
}
