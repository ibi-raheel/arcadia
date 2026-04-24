// The Scribe's Ledger — a scroll-styled modal that opens when the member
// walks up to the central lectern inside the Academy and presses ENTER.
// Replaces the floating "podium" course cards that used to live in the
// Phaser scene (2026-04-24).

'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { DropCap, GhostButton, Hand, Kicker, ScrollCard } from '@/components/scriptorium';

import type { AcademyCoursePodium } from '@/components/game/scenes/academy/AcademyScene';

type Props = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly courses: readonly AcademyCoursePodium[];
};

export function LedgerScroll({ open, onClose, courses }: Props): React.JSX.Element | null {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ledger-title"
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
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={{ position: 'relative', maxWidth: 680, width: '100%', maxHeight: '88vh' }}>
        <ScrollCard style={{ overflowY: 'auto', maxHeight: '88vh' }}>
          <button
            type="button"
            onClick={onClose}
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
            <DropCap letter="L" variant="blue" />
            <div style={{ flex: 1 }}>
              <Kicker>the scribe&rsquo;s ledger</Kicker>
              <h2
                id="ledger-title"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontSize: 34,
                  margin: '4px 0 0',
                  color: 'var(--ink)',
                  lineHeight: 1.1,
                }}
              >
                view your courses
              </h2>
              <Hand>~ pick a tome to step into ~</Hand>
            </div>
          </header>

          {courses.length === 0 ? (
            <p
              className="body-italic"
              style={{ marginTop: 24, color: 'var(--ink-quiet)', textAlign: 'center' }}
            >
              no courses in your library yet.
            </p>
          ) : (
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                marginTop: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {courses.map((c) => (
                <li key={c.id}>
                  <CourseRow course={c} />
                </li>
              ))}
            </ul>
          )}

          <footer
            style={{
              marginTop: 22,
              paddingTop: 16,
              borderTop: '1px dashed rgba(90, 63, 34, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
              flexWrap: 'wrap',
            }}
          >
            <Hand>~ press ESC or click away to close ~</Hand>
            <GhostButton onClick={onClose} size="sm">
              step away
            </GhostButton>
          </footer>
        </ScrollCard>
      </div>
    </div>
  );
}

function CourseRow({ course }: { readonly course: AcademyCoursePodium }): React.JSX.Element {
  const pct =
    course.totalLessons > 0 ? Math.round((course.completedLessons / course.totalLessons) * 100) : 0;
  const letter = course.title.charAt(0).toUpperCase() || 'A';
  return (
    <Link
      href={`/academy/${course.id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 14px',
        borderRadius: 3,
        textDecoration: 'none',
        color: 'var(--ink)',
        border: '1px solid rgba(138, 106, 58, 0.28)',
        background: 'rgba(255, 244, 210, 0.55)',
        transition: 'background 150ms ease, border-color 150ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(201, 138, 58, 0.22)';
        e.currentTarget.style.borderColor = 'var(--bronze)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255, 244, 210, 0.55)';
        e.currentTarget.style.borderColor = 'rgba(138, 106, 58, 0.28)';
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 3,
          background:
            'radial-gradient(circle at 30% 25%, var(--ink-blue) 0%, #183049 55%, #0e1e30 100%)',
          color: 'var(--gilt)',
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 26,
          display: 'grid',
          placeItems: 'center',
          boxShadow: 'inset 0 0 0 1px var(--gilt-deep)',
          flexShrink: 0,
        }}
      >
        {letter}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 19,
            margin: 0,
            color: 'var(--ink)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {course.title}
        </h3>
        <div
          style={{
            marginTop: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              background: 'rgba(90, 63, 34, 0.18)',
              overflow: 'hidden',
              maxWidth: 260,
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                background:
                  'linear-gradient(90deg, var(--bronze) 0%, var(--lantern) 60%, var(--gilt) 100%)',
                transition: 'width 240ms ease',
              }}
            />
          </div>
          <span
            className="mono"
            style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: 0.8 }}
          >
            {course.completedLessons}/{course.totalLessons} · {pct}%
          </span>
        </div>
      </div>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 15,
          color: 'var(--bronze-deep)',
          flexShrink: 0,
        }}
      >
        step inside →
      </span>
    </Link>
  );
}
