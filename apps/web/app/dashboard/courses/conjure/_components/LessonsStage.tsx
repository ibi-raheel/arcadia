// Stage 2 of the scribe ritual — lesson bodies. One card per lesson
// from the outline. Each card has four states:
//
//   queued      — no body yet; show "compose" button
//   streaming   — body is being drafted right now, mono scroller
//                 rolls the tokens in
//   ready       — body exists but not yet approved; show
//                 approve / revise controls
//   approved    — locked + wax-sealed; revise re-opens ready state
//
// "Compose all queued" sequentially fires streams for every queued
// lesson. Single-concurrent — keeps the scribe's voice consistent
// and doesn't fight rate limits.
//
// When every lesson is approved, the backend auto-advances stage to
// `images` (see setLessonApproved in app/_actions/scribe.ts).

'use client';

import { useCallback, useRef, useState, useTransition } from 'react';

import { reloadDraft, setLessonApproved } from '@/app/_actions/scribe';
import {
  BronzeButton,
  Chip,
  GhostButton,
  Hand,
  Kicker,
  ScrollCard,
  VellumCard,
  VellumField,
  WaxButton,
  WaxSeal,
} from '@/components/scriptorium';
import type {
  CourseDraft,
  DraftLessonBody,
  DraftOutlineLesson,
  DraftOutlineSection,
} from '@/lib/types/course-drafts';

type Props = {
  readonly draft: CourseDraft;
  readonly onDraftChanged: (draft: CourseDraft) => void;
};

type LessonKey = string; // `${sectionId}:${lessonId}`

function key(sectionId: string, lessonId: string): LessonKey {
  return `${sectionId}:${lessonId}`;
}

export function LessonsStage({ draft, onDraftChanged }: Props): React.JSX.Element {
  const [streamingKey, setStreamingKey] = useState<LessonKey | null>(null);
  const [liveText, setLiveText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [composeAllRunning, setComposeAllRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const bodyByKey = new Map<LessonKey, DraftLessonBody>();
  for (const l of draft.lessons) bodyByKey.set(key(l.section_id, l.lesson_id), l);

  const queued: Array<{ sectionId: string; lessonId: string }> = [];
  for (const section of draft.outline) {
    for (const lesson of section.lessons) {
      if (!bodyByKey.has(key(section.id, lesson.id))) {
        queued.push({ sectionId: section.id, lessonId: lesson.id });
      }
    }
  }

  const runLessonStream = useCallback(
    async (sectionId: string, lessonId: string, feedback?: string): Promise<boolean> => {
      setError(null);
      setLiveText('');
      setStreamingKey(key(sectionId, lessonId));
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const resp = await fetch('/api/scribe/lesson', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draftId: draft.id, sectionId, lessonId, feedback }),
          signal: controller.signal,
        });
        if (!resp.ok) {
          const errBody = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
          setError(errBody.error ?? `HTTP ${resp.status}`);
          return false;
        }
        const reader = resp.body?.getReader();
        if (!reader) {
          setError('no stream body');
          return false;
        }
        const decoder = new TextDecoder();
        let acc = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setLiveText(acc);
        }
        acc += decoder.decode();

        const refreshed = await reloadDraft(draft.id);
        if (refreshed.ok) onDraftChanged(refreshed.value);
        else setError(refreshed.error);
        return true;
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setError((err as Error).message);
        return false;
      } finally {
        setStreamingKey(null);
        setLiveText('');
      }
    },
    [draft.id, onDraftChanged],
  );

  const onComposeAll = useCallback(async () => {
    setComposeAllRunning(true);
    try {
      // Capture the queue up front so we don't re-read during iteration.
      const toCompose = [...queued];
      for (const next of toCompose) {
        const ok = await runLessonStream(next.sectionId, next.lessonId);
        if (!ok) break;
      }
    } finally {
      setComposeAllRunning(false);
    }
  }, [queued, runLessonStream]);

  return (
    <ScrollCard style={{ padding: '24px 26px' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          paddingBottom: 14,
          borderBottom: '1px dashed rgba(90, 63, 34, 0.28)',
          gap: 16,
        }}
      >
        <div>
          <Kicker>stage 2 · the lessons</Kicker>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 24,
              color: 'var(--ink)',
              margin: '4px 0 0',
            }}
          >
            compose the bodies.
          </h3>
          <Hand>~ approve each lesson when the voice reads right ~</Hand>
        </div>
        {queued.length > 0 && (
          <BronzeButton
            size="sm"
            onClick={() => void onComposeAll()}
            disabled={composeAllRunning || streamingKey !== null}
          >
            {composeAllRunning ? 'the scribe is composing…' : `compose all · ${queued.length} left`}
          </BronzeButton>
        )}
      </header>

      {error && (
        <p className="hand" role="alert" style={{ margin: '12px 0 0', color: 'var(--crimson)' }}>
          ~ {error} ~
        </p>
      )}

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 22 }}>
        {draft.outline.map((section, si) => (
          <section key={section.id}>
            <Kicker>section {si + 1}</Kicker>
            <h4
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: 20,
                color: 'var(--ink)',
                margin: '4px 0 12px',
              }}
            >
              {section.title}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {section.lessons.map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  draft={draft}
                  section={section}
                  lesson={lesson}
                  body={bodyByKey.get(key(section.id, lesson.id)) ?? null}
                  streaming={streamingKey === key(section.id, lesson.id)}
                  liveText={streamingKey === key(section.id, lesson.id) ? liveText : ''}
                  otherStreaming={
                    streamingKey !== null && streamingKey !== key(section.id, lesson.id)
                  }
                  onCompose={(feedback) => runLessonStream(section.id, lesson.id, feedback)}
                  onApproveChanged={async (ok) => {
                    if (!ok) return;
                    // Server auto-advances stage to 'images' when every
                    // lesson is approved — pull the fresh draft so the
                    // client picks up the stage bump and ImagesStage
                    // takes the floor.
                    const refreshed = await reloadDraft(draft.id);
                    if (refreshed.ok) onDraftChanged(refreshed.value);
                  }}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </ScrollCard>
  );
}

function LessonCard({
  draft,
  section,
  lesson,
  body,
  streaming,
  liveText,
  otherStreaming,
  onCompose,
  onApproveChanged,
}: {
  readonly draft: CourseDraft;
  readonly section: DraftOutlineSection;
  readonly lesson: DraftOutlineLesson;
  readonly body: DraftLessonBody | null;
  readonly streaming: boolean;
  readonly liveText: string;
  readonly otherStreaming: boolean;
  readonly onCompose: (feedback?: string) => Promise<boolean>;
  readonly onApproveChanged: (ok: boolean) => void | Promise<void>;
}): React.JSX.Element {
  const [revising, setRevising] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [approving, startApprove] = useTransition();
  const [cardError, setCardError] = useState<string | null>(null);

  const approved = body?.approved === true;
  const composed = body !== null;

  const approveToggle = (): void => {
    setCardError(null);
    startApprove(async () => {
      const result = await setLessonApproved(draft.id, section.id, lesson.id, !approved);
      if (!result.ok) setCardError(result.error);
      await onApproveChanged(result.ok);
    });
  };

  return (
    <VellumCard
      style={{
        padding: '16px 18px',
        borderLeft: approved
          ? '3px solid var(--verdigris)'
          : composed
            ? '3px solid var(--lantern)'
            : '3px dashed var(--bronze)',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {approved ? (
            <WaxSeal letter="✓" style={{ width: 26, height: 26, fontSize: 14 }} />
          ) : (
            <span
              className="mono"
              style={{
                fontSize: 11,
                letterSpacing: 1.2,
                color: 'var(--ink-soft)',
                width: 26,
                textAlign: 'center',
              }}
            >
              {composed ? '·' : '○'}
            </span>
          )}
          <h5
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 17,
              color: 'var(--ink)',
              margin: 0,
            }}
          >
            {lesson.title}
          </h5>
        </div>
        <StatusChip approved={approved} composed={composed} streaming={streaming} />
      </header>

      {cardError && (
        <p className="hand" role="alert" style={{ margin: '8px 0 0', color: 'var(--crimson)' }}>
          ~ {cardError} ~
        </p>
      )}

      {streaming && (
        <pre
          className="mono"
          style={{
            marginTop: 10,
            padding: 12,
            borderRadius: 3,
            background: 'rgba(16, 10, 5, 0.05)',
            border: '1px dashed rgba(90, 63, 34, 0.22)',
            fontSize: 12,
            lineHeight: 1.55,
            color: 'var(--ink)',
            maxHeight: 300,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {liveText || '~ ink warming ~'}
        </pre>
      )}

      {!streaming && composed && (
        <div
          style={{
            marginTop: 10,
            padding: '12px 14px',
            borderRadius: 3,
            background: 'rgba(90, 63, 34, 0.04)',
            border: '1px solid rgba(90, 63, 34, 0.12)',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            lineHeight: 1.55,
            color: 'var(--ink)',
            maxHeight: 260,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            opacity: approved ? 0.85 : 1,
          }}
        >
          {body?.body_markdown}
        </div>
      )}

      {!streaming && (
        <footer
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: '1px dashed rgba(90, 63, 34, 0.2)',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {revising ? (
            <ReviseRow
              value={feedback}
              onChange={setFeedback}
              onCancel={() => {
                setRevising(false);
                setFeedback('');
              }}
              onSubmit={async () => {
                const ok = await onCompose(feedback);
                if (ok) {
                  setRevising(false);
                  setFeedback('');
                }
              }}
              disabled={otherStreaming}
            />
          ) : !composed ? (
            <BronzeButton size="sm" onClick={() => void onCompose()} disabled={otherStreaming}>
              compose
            </BronzeButton>
          ) : (
            <>
              <GhostButton size="sm" onClick={() => setRevising(true)} disabled={otherStreaming}>
                revise
              </GhostButton>
              <WaxButton
                size={approved ? 'sm' : undefined}
                onClick={approveToggle}
                disabled={approving || otherStreaming}
              >
                {approved ? 'un-approve' : 'approve'}
              </WaxButton>
            </>
          )}
        </footer>
      )}
    </VellumCard>
  );
}

function StatusChip({
  approved,
  composed,
  streaming,
}: {
  readonly approved: boolean;
  readonly composed: boolean;
  readonly streaming: boolean;
}): React.JSX.Element {
  if (streaming) return <Chip variant="gilt">streaming</Chip>;
  if (approved) return <Chip variant="verdigris">approved</Chip>;
  if (composed) return <Chip variant="gilt">ready</Chip>;
  return <Chip>queued</Chip>;
}

function ReviseRow({
  value,
  onChange,
  onCancel,
  onSubmit,
  disabled,
}: {
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly onCancel: () => void;
  readonly onSubmit: () => void;
  readonly disabled: boolean;
}): React.JSX.Element {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      <VellumField
        label="~ what should change? ~"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="shorter opening, concrete example in the middle, …"
        disabled={disabled}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <GhostButton type="button" size="sm" onClick={onCancel} disabled={disabled}>
          set aside
        </GhostButton>
        <BronzeButton size="sm" onClick={onSubmit} disabled={disabled || value.trim().length === 0}>
          re-draft
        </BronzeButton>
      </div>
    </div>
  );
}
