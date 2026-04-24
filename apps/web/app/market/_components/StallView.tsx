'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { VideoLessonViewer } from '@/app/academy/[courseId]/_components/VideoLessonViewer';
import { WrittenLessonViewer } from '@/app/academy/[courseId]/_components/WrittenLessonViewer';
import {
  BronzeButton,
  Chip,
  DropCap,
  GhostButton,
  Hand,
  Kicker,
  MapCard,
  WaxButton,
  WaxSeal,
} from '@/components/scriptorium';

import { enrolInCourse } from '../actions';

export type StallLesson = {
  readonly id: string;
  readonly sectionId: string;
  readonly title: string;
  readonly type: 'video' | 'written' | null;
  readonly isPreview: boolean;
  readonly youtubeVideoId: string | null;
  readonly content: string | null;
  readonly durationSec: number | null;
};

export type StallSection = {
  readonly id: string;
  readonly title: string;
  readonly lessons: readonly StallLesson[];
};

export type StallData = {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly creatorName: string;
  readonly enrolmentCount: number;
  readonly enrolled: boolean;
  readonly sections: readonly StallSection[];
};

type Props = {
  readonly stall: StallData;
  readonly onClose: () => void;
  /**
   * Called after a successful enrolment. The parent tracks session-local
   * enrolment so re-opening the modal still reads as enrolled (Phase 7
   * item M6). `stall.enrolled` only updates on a full page reload.
   */
  readonly onEnrolled?: (courseId: string) => void;
};

export function StallView({ stall, onClose, onEnrolled }: Props): React.JSX.Element {
  const router = useRouter();
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const [enrolError, setEnrolError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isEnrolled = stall.enrolled;

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const activePreview = stall.sections
    .flatMap((s) => s.lessons)
    .find((l) => l.id === activePreviewId);

  const handleEnrol = (): void => {
    setEnrolError(null);
    startTransition(async () => {
      const result = await enrolInCourse(stall.id);
      if (!result.ok) {
        setEnrolError(result.error);
      } else {
        onEnrolled?.(stall.id);
      }
    });
  };

  const totalLessons = stall.sections.reduce((sum, s) => sum + s.lessons.length, 0);
  const firstLetter = stall.title.charAt(0).toUpperCase() || 'A';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="stall-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'rgba(5, 2, 8, 0.7)',
        backdropFilter: 'blur(16px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={{ position: 'relative', maxWidth: 820, width: '100%', maxHeight: '90vh' }}>
        <MapCard style={{ overflowY: 'auto', maxHeight: '90vh', padding: 28 }}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute',
              right: 12,
              top: 12,
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
              paddingBottom: 20,
              borderBottom: '1px dashed rgba(90, 63, 34, 0.3)',
            }}
          >
            <DropCap letter={firstLetter} variant={isEnrolled ? 'verdigris' : 'wax'} />
            <div style={{ flex: 1, paddingTop: 2 }}>
              <Kicker>a stall in the market</Kicker>
              <h2
                id="stall-title"
                style={{
                  fontSize: 34,
                  margin: '4px 0 0',
                  color: 'var(--ink)',
                  lineHeight: 1.1,
                }}
              >
                {stall.title}
              </h2>
              <Hand>{`~ by ${stall.creatorName} ~`}</Hand>
              {stall.description && (
                <p
                  className="body-italic"
                  style={{ marginTop: 12, color: 'var(--ink-soft)', fontSize: 15 }}
                >
                  {stall.description}
                </p>
              )}
              <p
                className="mono"
                style={{
                  marginTop: 12,
                  color: 'var(--ink-faint)',
                  fontSize: 10,
                  letterSpacing: 1.5,
                }}
              >
                {stall.enrolmentCount} ENROLLED · {totalLessons} LESSONS
              </p>
            </div>
            {isEnrolled && <WaxSeal letter="E" />}
          </header>

          <section style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {stall.sections.length === 0 ? (
              <p className="body-italic" style={{ color: 'var(--ink-quiet)' }}>
                this stall is still being set out — come back by lamplight.
              </p>
            ) : (
              stall.sections.map((s) => (
                <div key={s.id}>
                  <h3 style={{ margin: 0, fontSize: 20, color: 'var(--ink)' }}>{s.title}</h3>
                  <ul
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      marginTop: 8,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    {s.lessons.map((l) => (
                      <li
                        key={l.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '6px 8px',
                          borderRadius: 3,
                          border: '1px solid rgba(138, 106, 58, 0.22)',
                          background: 'rgba(255, 244, 210, 0.4)',
                        }}
                      >
                        <span style={{ color: 'var(--bronze-deep)', fontSize: 13 }}>
                          {l.type === 'video' ? '▶' : '✎'}
                        </span>
                        <span style={{ flex: 1, color: 'var(--ink)', fontSize: 14 }}>
                          {l.title}
                        </span>
                        {l.isPreview ? (
                          <button
                            type="button"
                            onClick={() =>
                              setActivePreviewId(activePreviewId === l.id ? null : l.id)
                            }
                            style={{
                              background: 'transparent',
                              border: '1px dashed var(--verdigris-2)',
                              color: 'var(--verdigris)',
                              padding: '3px 8px',
                              borderRadius: 12,
                              fontFamily: 'var(--font-mono)',
                              fontSize: 10,
                              letterSpacing: 1.2,
                              textTransform: 'uppercase',
                              cursor: 'pointer',
                            }}
                          >
                            {activePreviewId === l.id ? 'hide' : '✓ preview'}
                          </button>
                        ) : (
                          <Chip>locked</Chip>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </section>

          {activePreview && (
            <section
              style={{
                marginTop: 20,
                padding: 16,
                borderRadius: 3,
                border: '1px solid var(--verdigris-2)',
                background: 'rgba(90, 122, 92, 0.08)',
              }}
            >
              <Kicker>preview · {activePreview.title}</Kicker>
              <div style={{ marginTop: 12 }}>
                {activePreview.type === 'video' && activePreview.youtubeVideoId ? (
                  <VideoLessonViewer
                    previewOnly
                    initial={{
                      lessonId: activePreview.id,
                      videoId: activePreview.youtubeVideoId,
                      startSec: 0,
                      durationSec: activePreview.durationSec,
                    }}
                  />
                ) : activePreview.content ? (
                  <WrittenLessonViewer
                    previewOnly
                    lessonId={activePreview.id}
                    content={activePreview.content}
                    initiallyCompleted={false}
                  />
                ) : (
                  <p className="body-italic" style={{ color: 'var(--ink-quiet)' }}>
                    nothing to show yet.
                  </p>
                )}
              </div>
            </section>
          )}

          <footer
            style={{
              marginTop: 22,
              paddingTop: 18,
              borderTop: '1px dashed rgba(90, 63, 34, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
              flexWrap: 'wrap',
            }}
          >
            <Hand>~ free while in beta · no payment today ~</Hand>
            {isEnrolled ? (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <GhostButton onClick={onClose} size="sm">
                  keep browsing
                </GhostButton>
                <BronzeButton onClick={() => router.push(`/academy/${stall.id}`)}>
                  step inside →
                </BronzeButton>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {enrolError && (
                  <span style={{ color: 'var(--crimson)', fontSize: 13 }}>{enrolError}</span>
                )}
                <WaxButton onClick={handleEnrol} disabled={pending}>
                  {pending ? 'sealing…' : 'seal the pact'}
                </WaxButton>
              </div>
            )}
          </footer>
        </MapCard>
      </div>
    </div>
  );
}
