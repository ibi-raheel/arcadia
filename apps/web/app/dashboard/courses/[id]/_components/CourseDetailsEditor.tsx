// Inline editor for the course's title + description (subtitle).
// Replaces the read-only `DashboardShell.title` / `tagline` props on
// the course-edit page so creators can rename a course or refine its
// blurb without a separate route.
//
// Design: the title still reads as the page heading (italic display,
// large) but is now an editable `contentEditable`-shaped `<input>`
// with a transparent background — same vibe as the static heading.
// The description is a multi-line `<textarea>` styled to match the
// `~ tagline ~` Hand line (italic body, vellum-shadow). Both rows
// are dirty-tracked together; the action bar appears only when
// something has changed and offers Save + Discard.
//
// Validation mirrors the server-side `validateCourseTitle` /
// `validateCourseDescription` (same trim + max-length rules).

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';

import { BronzeButton, GhostButton, Hand } from '@/components/scriptorium';

import { updateCourseDetails } from '../actions';
import {
  COURSE_DESCRIPTION_MAX,
  COURSE_TITLE_MAX,
  validateCourseDescription,
  validateCourseTitle,
} from '../validation';

type Props = {
  readonly courseId: string;
  readonly initialTitle: string;
  readonly initialDescription: string | null;
};

export function CourseDetailsEditor({
  courseId,
  initialTitle,
  initialDescription,
}: Props): React.JSX.Element {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? '');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const descRef = useRef<HTMLTextAreaElement | null>(null);

  // Reset local state when the page re-renders with fresh server
  // values (e.g. after `router.refresh()` post-save). Without this
  // the dirty banner sticks around because local state stays equal
  // to the *previous* server value.
  useEffect(() => {
    setTitle(initialTitle);
    setDescription(initialDescription ?? '');
  }, [initialTitle, initialDescription]);

  // Auto-grow the description textarea so it reads as a tagline,
  // not a chunky form field. Re-runs whenever the value changes.
  useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [description]);

  const dirty = useMemo(
    () => title !== initialTitle || description !== (initialDescription ?? ''),
    [title, description, initialTitle, initialDescription],
  );

  const save = (): void => {
    setError(null);
    const titleCheck = validateCourseTitle(title);
    if (!titleCheck.ok) {
      setError(titleCheck.error);
      return;
    }
    const descCheck = validateCourseDescription(description);
    if (!descCheck.ok) {
      setError(descCheck.error);
      return;
    }
    startTransition(async () => {
      const result = await updateCourseDetails(courseId, title, description);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  };

  const discard = (): void => {
    setTitle(initialTitle);
    setDescription(initialDescription ?? '');
    setError(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={COURSE_TITLE_MAX + 20}
        placeholder="course title"
        aria-label="Course title"
        spellCheck
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 48,
          margin: 0,
          lineHeight: 1.05,
          color: 'var(--vellum)',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          padding: 0,
          width: '100%',
          letterSpacing: '-0.5px',
        }}
        onFocus={(e) => (e.currentTarget.style.background = 'rgba(255, 244, 210, 0.05)')}
        onBlur={(e) => (e.currentTarget.style.background = 'transparent')}
      />
      <textarea
        ref={descRef}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={COURSE_DESCRIPTION_MAX + 20}
        placeholder="add a short tagline · what is this course about?"
        aria-label="Course description"
        spellCheck
        rows={1}
        style={{
          fontFamily: 'var(--font-hand)',
          fontStyle: 'italic',
          fontSize: 16,
          color: 'var(--vellum-shadow)',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          padding: 0,
          margin: '4px 0 0',
          width: '100%',
          maxWidth: 720,
          resize: 'none',
          lineHeight: 1.5,
          overflow: 'hidden',
        }}
        onFocus={(e) => (e.currentTarget.style.background = 'rgba(255, 244, 210, 0.05)')}
        onBlur={(e) => (e.currentTarget.style.background = 'transparent')}
      />

      {(dirty || error) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 8,
            paddingTop: 8,
            borderTop: '1px dashed var(--bronze)',
            flexWrap: 'wrap',
          }}
        >
          {error ? (
            <Hand>
              <span style={{ color: 'var(--crimson)' }}>~ {error} ~</span>
            </Hand>
          ) : (
            <Hand onDark>~ unsaved ~</Hand>
          )}
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <GhostButton onClick={discard} disabled={pending} size="sm" onDark>
              discard
            </GhostButton>
            <BronzeButton onClick={save} disabled={pending} size="sm">
              {pending ? 'saving…' : 'save'}
            </BronzeButton>
          </div>
        </div>
      )}
    </div>
  );
}
