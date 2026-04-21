'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

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
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-300">{error}</span>}
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={
          published
            ? 'rounded-md border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300 transition hover:border-red-500 hover:text-red-300 disabled:opacity-50'
            : 'rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50'
        }
      >
        {pending ? '…' : published ? 'Unpublish' : 'Publish'}
      </button>
    </div>
  );
}
