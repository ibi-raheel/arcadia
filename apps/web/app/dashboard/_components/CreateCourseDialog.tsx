// "Create course" trigger + modal. Lives in the keeper-studio actions
// area of /dashboard/courses. Bronze pill button; on click, a ScrollCard
// modal opens over the NightRoom with a drop-cap, VellumField title,
// textarea in the same vellum style, and a WaxButton create CTA.

'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import {
  BronzeButton,
  DropCap,
  GhostButton,
  Hand,
  Kicker,
  ScrollCard,
  VellumField,
  WaxButton,
} from '@/components/scriptorium';

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
    const onKey = (e: KeyboardEvent): void => {
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
      // On success the server action redirects; anything we see back is an error.
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <>
      <BronzeButton type="button" onClick={() => setOpen(true)}>
        ink a new course →
      </BronzeButton>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-course-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            background: 'rgba(5, 2, 8, 0.72)',
            backdropFilter: 'blur(14px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div style={{ width: '100%', maxWidth: 520 }}>
            <ScrollCard style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                style={{
                  position: 'absolute',
                  right: 14,
                  top: 14,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--ink-quiet)',
                  padding: 8,
                  fontSize: 16,
                  lineHeight: 1,
                  borderRadius: 3,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--wax)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-quiet)')}
              >
                ✕
              </button>

              <header
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 18,
                  paddingBottom: 18,
                  borderBottom: '1px dashed rgba(90, 63, 34, 0.3)',
                }}
              >
                <DropCap letter="C" variant="blue" />
                <div style={{ flex: 1 }}>
                  <Kicker>a fresh scroll</Kicker>
                  <h2
                    id="create-course-title"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontStyle: 'italic',
                      fontSize: 30,
                      margin: '4px 0 0',
                      color: 'var(--ink)',
                      lineHeight: 1.1,
                    }}
                  >
                    Name the course.
                  </h2>
                  <Hand>~ you can re-ink everything after ~</Hand>
                </div>
              </header>

              <form
                onSubmit={handleSubmit}
                style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 18 }}
              >
                <VellumField
                  ref={titleInputRef}
                  label="title"
                  name="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, COURSE_TITLE_MAX))}
                  required
                  maxLength={COURSE_TITLE_MAX}
                  placeholder="Intro to Arcadia"
                  disabled={pending}
                />

                <div>
                  <label
                    htmlFor="create-course-description"
                    className="field-label"
                    style={{ display: 'block' }}
                  >
                    description <span style={{ color: 'var(--ink-quiet)' }}>(optional)</span>
                  </label>
                  <textarea
                    id="create-course-description"
                    className="field"
                    value={description}
                    onChange={(e) =>
                      setDescription(e.target.value.slice(0, COURSE_DESCRIPTION_MAX))
                    }
                    maxLength={COURSE_DESCRIPTION_MAX}
                    rows={3}
                    disabled={pending}
                    placeholder="What will members learn?"
                    style={{
                      resize: 'vertical',
                      lineHeight: 1.5,
                      padding: '8px 2px',
                      minHeight: 72,
                    }}
                  />
                  <span
                    className="mono"
                    style={{
                      display: 'block',
                      marginTop: 4,
                      fontSize: 10,
                      letterSpacing: 1.2,
                      color: 'var(--ink-faint)',
                      textAlign: 'right',
                    }}
                  >
                    {description.length}/{COURSE_DESCRIPTION_MAX}
                  </span>
                </div>

                {error && (
                  <p
                    className="hand"
                    style={{ margin: 0, color: 'var(--crimson)' }}
                    role="alert"
                    aria-live="polite"
                  >
                    ~ {error} ~
                  </p>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: 10,
                    paddingTop: 10,
                    borderTop: '1px dashed rgba(90, 63, 34, 0.3)',
                  }}
                >
                  <GhostButton type="button" onClick={close} disabled={pending} size="sm">
                    set aside
                  </GhostButton>
                  <WaxButton type="submit" disabled={pending || title.trim().length === 0}>
                    {pending ? 'sealing…' : 'seal the course'}
                  </WaxButton>
                </div>
              </form>
            </ScrollCard>
          </div>
        </div>
      )}
    </>
  );
}
