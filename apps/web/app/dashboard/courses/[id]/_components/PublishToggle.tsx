'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { BronzeButton, GhostButton, Hand } from '@/components/scriptorium';

import { setCoursePublished } from '../actions';

type Props = {
  readonly courseId: string;
  readonly published: boolean;
};

export function PublishToggle({ courseId, published }: Props): React.JSX.Element {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = (): void => {
    const next = !published;
    if (!next && !window.confirm('Unpublish this course? Members will lose access.')) return;

    startTransition(async () => {
      const result = await setCoursePublished(courseId, next);
      if (!result.ok) setError(result.error);
      else {
        setError(null);
        router.refresh();
      }
    });
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {error && (
        <Hand>
          <span style={{ color: 'var(--crimson)' }}>~ {error} ~</span>
        </Hand>
      )}
      {published ? (
        <GhostButton onClick={toggle} disabled={pending} size="sm" onDark>
          {pending ? '…' : 'unpublish'}
        </GhostButton>
      ) : (
        <BronzeButton onClick={toggle} disabled={pending} size="sm">
          {pending ? '…' : 'publish'}
        </BronzeButton>
      )}
    </div>
  );
}
