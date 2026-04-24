'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { markLessonCompleted } from '../actions';

const COMPLETION_SCROLL_THRESHOLD = 0.9;
const SENTINEL_ROOT_MARGIN = '0px 0px -10% 0px'; // triggers when last-10% sentinel enters the viewport.

type Props = {
  readonly lessonId: string;
  readonly content: string;
  readonly initiallyCompleted: boolean;
  /** Preview mode (Market stall view): render content but never record
   *  completion / scroll-hit state server-side. */
  readonly previewOnly?: boolean;
};

export function WrittenLessonViewer({
  lessonId,
  content,
  initiallyCompleted,
  previewOnly = false,
}: Props): React.JSX.Element {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [completed, setCompleted] = useState(initiallyCompleted);
  const [error, setError] = useState<string | null>(null);
  const markedRef = useRef(initiallyCompleted);

  // Reset local "marked" flag when switching lessons.
  useEffect(() => {
    markedRef.current = initiallyCompleted;
    setCompleted(initiallyCompleted);
  }, [lessonId, initiallyCompleted]);

  // Intersection observer on a sentinel placed at the end of the
  // content — fires once when the reader has scrolled to >= 90%.
  // Skipped in previewOnly mode.
  useEffect(() => {
    if (previewOnly) return;
    if (markedRef.current) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !markedRef.current) {
            markedRef.current = true;
            void (async () => {
              const res = await markLessonCompleted(lessonId);
              if (!res.ok) {
                setError(res.error);
                markedRef.current = false;
              } else {
                setCompleted(true);
              }
            })();
          }
        }
      },
      { rootMargin: SENTINEL_ROOT_MARGIN, threshold: [0, COMPLETION_SCROLL_THRESHOLD] },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [lessonId, previewOnly]);

  return (
    <div className="scriptorium-prose">
      <article>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </article>
      <div
        ref={sentinelRef}
        style={{
          marginTop: 32,
          textAlign: 'center',
          fontFamily: 'var(--font-caps)',
          fontSize: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: completed ? 'var(--verdigris-2)' : 'var(--ink-quiet)',
        }}
      >
        {completed ? '✓ signed · marked complete' : '— end of lesson —'}
      </div>
      {error && (
        <p className="hand" style={{ marginTop: 8, textAlign: 'center', color: 'var(--crimson)' }}>
          ~ couldn&rsquo;t save progress: {error} ~
        </p>
      )}
    </div>
  );
}
