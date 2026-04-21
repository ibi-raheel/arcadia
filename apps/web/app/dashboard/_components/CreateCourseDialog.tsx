'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { createCourseAndRedirect } from '../actions';
import { COURSE_DESCRIPTION_MAX, COURSE_TITLE_MAX } from '../validation';

export function CreateCourseDialog(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const titleInputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setError(null);
    setTitle('');
    setDescription('');
  }, []);

  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => titleInputRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createCourseAndRedirect({ title, description });
      // If we get here, the redirect didn't happen — that means an error
      // was returned. (On success, the server action redirects and the
      // client never sees a response.)
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
      >
        Create course
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-course-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <h2 id="create-course-title" className="text-xl font-semibold text-slate-100">
              Create a course
            </h2>
            <p className="mt-1 text-sm text-slate-400">You can edit everything after creating.</p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-300">Title</span>
                <input
                  ref={titleInputRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, COURSE_TITLE_MAX))}
                  required
                  maxLength={COURSE_TITLE_MAX}
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Intro to Arcadia"
                  disabled={pending}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-300">
                  Description <span className="text-slate-500">(optional)</span>
                </span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, COURSE_DESCRIPTION_MAX))}
                  maxLength={COURSE_DESCRIPTION_MAX}
                  rows={3}
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="What will members learn?"
                  disabled={pending}
                />
                <span className="mt-1 block text-right text-xs text-slate-500">
                  {description.length}/{COURSE_DESCRIPTION_MAX}
                </span>
              </label>

              {error && (
                <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={close}
                  disabled={pending}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending || title.trim().length === 0}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pending ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
