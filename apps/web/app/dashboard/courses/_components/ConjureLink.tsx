// Entry-point button for the scribe (AI course maker). Sits next to
// the "ink a new course" button on /dashboard/courses. Routes to
// /dashboard/courses/conjure — the server component on that route
// resumes the creator's current unsealed draft or creates a fresh
// one.
//
// When a draft is in progress, the button gets a small "~ resume ~"
// hint showing the current stage so the creator knows they'll pick
// up where they left off.

'use client';

import Link from 'next/link';

import { GhostButton } from '@/components/scriptorium';
import type { DraftStage } from '@/lib/types/course-drafts';

type Props = {
  readonly resumeStage?: DraftStage | null;
};

const STAGE_LABEL: Record<DraftStage, string> = {
  satchel: 'in the satchel',
  outline: 'on the outline',
  lessons: 'on the lessons',
  images: 'on the images',
  ready: 'ready to seal',
  sealed: 'sealed',
};

export function ConjureLink({ resumeStage }: Props = {}): React.JSX.Element {
  const resuming = resumeStage && resumeStage !== 'sealed';
  return (
    <Link
      href="/dashboard/courses/conjure"
      style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}
    >
      <GhostButton type="button" size="sm" onDark>
        ✦ {resuming ? 'resume the scribe' : 'conjure with the scribe'}
      </GhostButton>
      {resuming && (
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            color: 'var(--lantern)',
            borderLeft: '1px dashed var(--bronze)',
            paddingLeft: 8,
          }}
        >
          ~ {STAGE_LABEL[resumeStage]} ~
        </span>
      )}
    </Link>
  );
}
