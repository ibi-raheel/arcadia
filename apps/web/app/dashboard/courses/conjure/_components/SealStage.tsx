// Stage 4 of the scribe ritual — seal. Shows a final summary and one
// big WaxButton. Clicking seals the draft (materializes into
// courses / sections / lessons rows) and navigates to the regular
// course builder for polish.

'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { sealDraft } from '@/app/_actions/scribe';
import { DropCap, Hand, Kicker, ScrollCard, Stat, WaxButton } from '@/components/scriptorium';
import type { CourseDraft } from '@/lib/types/course-drafts';

type Props = {
  readonly draft: CourseDraft;
};

export function SealStage({ draft }: Props): React.JSX.Element {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sectionCount = draft.outline.length;
  const lessonCount = draft.outline.reduce((n, s) => n + s.lessons.length, 0);
  const imageCount = draft.images.filter((i) => i.approved).length;
  const thumbnailReady = draft.images.some((i) => i.target === 'thumbnail' && i.approved);

  const onSeal = (): void => {
    setError(null);
    startTransition(async () => {
      const result = await sealDraft(draft.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/dashboard/courses/${result.value.courseId}`);
    });
  };

  return (
    <ScrollCard style={{ padding: '26px 28px' }}>
      <header
        style={{
          display: 'flex',
          gap: 18,
          alignItems: 'flex-start',
          paddingBottom: 16,
          borderBottom: '1px dashed rgba(90, 63, 34, 0.28)',
        }}
      >
        <DropCap letter="S" variant="wax" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Kicker>stage 4 · seal</Kicker>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 30,
              color: 'var(--ink)',
              margin: '4px 0 0',
              lineHeight: 1.1,
            }}
          >
            {draft.title ?? 'untitled'}
          </h2>
          <Hand>~ ready to put the wax on ~</Hand>
        </div>
      </header>

      <div
        style={{
          marginTop: 18,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
        }}
      >
        <Stat label="sections" value={`${sectionCount}`} />
        <Stat label="lessons" value={`${lessonCount}`} />
        <Stat label="images" value={`${imageCount}`} />
        <Stat
          label="thumbnail"
          value={thumbnailReady ? 'ready' : 'missing'}
          style={{ color: thumbnailReady ? undefined : 'var(--crimson)' }}
        />
      </div>

      <p
        className="body-italic"
        style={{
          marginTop: 20,
          fontSize: 15,
          lineHeight: 1.6,
          color: 'var(--ink)',
        }}
      >
        Sealing materializes the draft into real <em>courses</em>, <em>sections</em>, and{' '}
        <em>lessons</em> rows. You&rsquo;ll land on the regular course builder where you can polish,
        set a price, and publish when it&rsquo;s ready.
      </p>

      {error && (
        <p className="hand" role="alert" style={{ margin: '14px 0 0', color: 'var(--crimson)' }}>
          ~ {error} ~
        </p>
      )}

      <div
        style={{
          marginTop: 22,
          paddingTop: 14,
          borderTop: '1px dashed rgba(90, 63, 34, 0.25)',
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <WaxButton type="button" onClick={onSeal} disabled={pending}>
          {pending ? 'pressing the wax…' : 'seal the course'}
        </WaxButton>
      </div>
    </ScrollCard>
  );
}
