// Stage 1 of the scribe ritual — the outline. Two modes:
//
//   streaming  — the scribe is drafting right now. We show a live
//                ScrollCard with the raw JSON-ish text rolling in
//                and no approve/revise buttons until the stream
//                closes.
//   ready      — the draft row has an outline + title. We render
//                section + lesson titles in editable fields,
//                approve advances to `lessons`, revise re-streams.

'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { reloadDraft, setDraftStage, updateDraftOutline } from '@/app/_actions/scribe';
import {
  BronzeButton,
  DropCap,
  GhostButton,
  Hand,
  Kicker,
  ScrollCard,
  VellumCard,
  VellumField,
  WaxButton,
} from '@/components/scriptorium';
import type { CourseDraft, DraftOutlineSection } from '@/lib/types/course-drafts';

type Props = {
  readonly draft: CourseDraft;
  readonly onDraftChanged: (draft: CourseDraft) => void;
};

export function OutlineStage({ draft, onDraftChanged }: Props): React.JSX.Element {
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [revising, setRevising] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);

  const hasOutline = draft.outline.length > 0;

  const runOutlineStream = useCallback(
    async (withFeedback?: string): Promise<void> => {
      setError(null);
      setStreamText('');
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const resp = await fetch('/api/scribe/outline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draftId: draft.id, feedback: withFeedback }),
          signal: controller.signal,
        });
        if (!resp.ok) {
          const errBody = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
          setError(errBody.error ?? `HTTP ${resp.status}`);
          setStreaming(false);
          return;
        }
        const reader = resp.body?.getReader();
        if (!reader) {
          setError('no stream body');
          setStreaming(false);
          return;
        }
        const decoder = new TextDecoder();
        let acc = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setStreamText(acc);
        }
        acc += decoder.decode();
        setStreamText(acc);

        const refreshed = await reloadDraft(draft.id);
        if (refreshed.ok) {
          onDraftChanged(refreshed.value);
          setRevising(false);
          setFeedback('');
        } else {
          setError(refreshed.error);
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError((err as Error).message);
        }
      } finally {
        setStreaming(false);
      }
    },
    [draft.id, onDraftChanged],
  );

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Auto-start streaming on first entry if we're on stage 'satchel'
  // and the user clicks "ask the scribe." The Satchel exposes that
  // click via a ref — but to keep this component self-contained, we
  // render our own "ask the scribe" button that kicks off the first
  // stream. The Satchel's button was a placeholder.

  if (streaming) {
    return <StreamingCard text={streamText} />;
  }

  if (!hasOutline) {
    return (
      <VellumCard style={{ padding: '22px 26px' }}>
        <Kicker>stage 1 · the outline</Kicker>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 24,
            color: 'var(--ink)',
            margin: '6px 0 4px',
            lineHeight: 1.2,
          }}
        >
          ready when you are.
        </h3>
        <Hand>
          ~ the scribe will read the satchel and draft a section / lesson tree — takes about ten
          seconds ~
        </Hand>
        {error && (
          <p className="hand" role="alert" style={{ margin: '12px 0 0', color: 'var(--crimson)' }}>
            ~ {error} ~
          </p>
        )}
        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: '1px dashed rgba(90, 63, 34, 0.25)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <WaxButton type="button" onClick={() => void runOutlineStream()}>
            ask the scribe →
          </WaxButton>
        </div>
      </VellumCard>
    );
  }

  // hasOutline — render the editable + approvable outline
  const approved = draft.stage !== 'satchel' && draft.stage !== 'outline';

  const onApprove = (): void => {
    setError(null);
    startTransition(async () => {
      // If the outline stream already set stage='lessons', setDraftStage
      // is a no-op we silently skip so the user still gets the happy
      // reload path + the stage-2 card appearing.
      if (draft.stage === 'satchel' || draft.stage === 'outline') {
        const advance = await setDraftStage(draft.id, 'lessons');
        if (!advance.ok) {
          setError(advance.error);
          return;
        }
      }
      const refreshed = await reloadDraft(draft.id);
      if (refreshed.ok) onDraftChanged(refreshed.value);
      else setError(refreshed.error);
    });
  };

  const onSectionTitleChange = (sectionId: string, title: string): void => {
    const next = draft.outline.map((s) => (s.id === sectionId ? { ...s, title } : s));
    onDraftChanged({ ...draft, outline: next });
    debounceOutlineSave(draft.id, next, draft.title ?? '');
  };

  const onLessonTitleChange = (sectionId: string, lessonId: string, title: string): void => {
    const next = draft.outline.map((s) =>
      s.id === sectionId
        ? { ...s, lessons: s.lessons.map((l) => (l.id === lessonId ? { ...l, title } : l)) }
        : s,
    );
    onDraftChanged({ ...draft, outline: next });
    debounceOutlineSave(draft.id, next, draft.title ?? '');
  };

  const onTitleChange = (title: string): void => {
    onDraftChanged({ ...draft, title });
    debounceOutlineSave(draft.id, draft.outline, title);
  };

  return (
    <ScrollCard style={{ padding: '24px 26px' }}>
      <header
        style={{
          display: 'flex',
          gap: 16,
          alignItems: 'flex-start',
          paddingBottom: 14,
          borderBottom: '1px dashed rgba(90, 63, 34, 0.28)',
        }}
      >
        <DropCap letter={(draft.title ?? 'C').charAt(0).toUpperCase()} variant="blue" size="sm" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Kicker>stage 1 · the outline</Kicker>
          <div style={{ marginTop: 6 }}>
            <input
              className="field"
              value={draft.title ?? ''}
              onChange={(e) => onTitleChange(e.target.value)}
              disabled={approved}
              placeholder="course title"
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: 24,
                color: 'var(--ink)',
                width: '100%',
                lineHeight: 1.1,
                padding: '4px 2px',
              }}
            />
          </div>
          <Hand>
            {approved
              ? '~ approved — the scribe is moving on ~'
              : '~ edit titles inline, approve when the shape is right ~'}
          </Hand>
        </div>
      </header>

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {draft.outline.map((section, i) => (
          <SectionBlock
            key={section.id}
            section={section}
            index={i}
            disabled={approved}
            onSectionTitleChange={(title) => onSectionTitleChange(section.id, title)}
            onLessonTitleChange={(lessonId, title) =>
              onLessonTitleChange(section.id, lessonId, title)
            }
          />
        ))}
      </div>

      {error && (
        <p className="hand" role="alert" style={{ margin: '12px 0 0', color: 'var(--crimson)' }}>
          ~ {error} ~
        </p>
      )}

      {!approved && (
        <>
          {revising ? (
            <div
              style={{
                marginTop: 16,
                paddingTop: 14,
                borderTop: '1px dashed rgba(90, 63, 34, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <VellumField
                label="~ what should change? ~"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="more hands-on lessons, merge sections 2 and 3, …"
                disabled={streaming}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <GhostButton
                  type="button"
                  size="sm"
                  onClick={() => {
                    setRevising(false);
                    setFeedback('');
                  }}
                  disabled={streaming}
                >
                  set aside
                </GhostButton>
                <BronzeButton
                  size="sm"
                  onClick={() => void runOutlineStream(feedback)}
                  disabled={streaming || feedback.trim().length === 0}
                >
                  re-draft
                </BronzeButton>
              </div>
            </div>
          ) : (
            <div
              style={{
                marginTop: 16,
                paddingTop: 14,
                borderTop: '1px dashed rgba(90, 63, 34, 0.25)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              <GhostButton size="sm" onClick={() => setRevising(true)}>
                revise
              </GhostButton>
              <WaxButton type="button" onClick={onApprove}>
                approve · on to the lessons →
              </WaxButton>
            </div>
          )}
        </>
      )}
    </ScrollCard>
  );
}

function StreamingCard({ text }: { readonly text: string }): React.JSX.Element {
  return (
    <ScrollCard style={{ padding: '24px 26px' }}>
      <Kicker>the scribe is drafting…</Kicker>
      <Hand>~ watch the outline form — don&rsquo;t worry, the JSON tidies up at the end ~</Hand>
      <pre
        className="mono"
        style={{
          marginTop: 12,
          padding: 14,
          borderRadius: 3,
          background: 'rgba(16, 10, 5, 0.08)',
          border: '1px dashed rgba(90, 63, 34, 0.22)',
          fontSize: 12,
          lineHeight: 1.55,
          color: 'var(--ink)',
          maxHeight: 360,
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {text || '~ ink warming ~'}
      </pre>
    </ScrollCard>
  );
}

function SectionBlock({
  section,
  index,
  disabled,
  onSectionTitleChange,
  onLessonTitleChange,
}: {
  readonly section: DraftOutlineSection;
  readonly index: number;
  readonly disabled: boolean;
  readonly onSectionTitleChange: (title: string) => void;
  readonly onLessonTitleChange: (lessonId: string, title: string) => void;
}): React.JSX.Element {
  return (
    <div
      style={{
        padding: '14px 16px',
        borderLeft: '2.5px solid var(--wax)',
        background: 'rgba(90, 63, 34, 0.035)',
        borderRadius: '0 3px 3px 0',
      }}
    >
      <Kicker>section {index + 1}</Kicker>
      <input
        className="field"
        value={section.title}
        onChange={(e) => onSectionTitleChange(e.target.value)}
        disabled={disabled}
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 19,
          color: 'var(--ink)',
          width: '100%',
          lineHeight: 1.1,
          padding: '2px 2px',
          marginTop: 4,
        }}
      />
      <ul
        style={{
          listStyle: 'none',
          margin: '8px 0 0',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {section.lessons.map((lesson, i) => (
          <li key={lesson.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                color: 'var(--ink-faint)',
                minWidth: 28,
              }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <input
              className="field"
              value={lesson.title}
              onChange={(e) => onLessonTitleChange(lesson.id, e.target.value)}
              disabled={disabled}
              style={{
                flex: 1,
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                color: 'var(--ink)',
                padding: '4px 2px',
                lineHeight: 1.4,
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- Debounced outline saver ---
//
// Edits to the outline fire on every keystroke. A module-scoped
// debounce keeps us from beating on the server — 600 ms after the
// last edit we send one update.

type SaveKey = string;
const savers = new Map<SaveKey, ReturnType<typeof setTimeout>>();

function debounceOutlineSave(
  draftId: string,
  outline: readonly DraftOutlineSection[],
  title: string,
): void {
  const key: SaveKey = draftId;
  const existing = savers.get(key);
  if (existing) clearTimeout(existing);
  savers.set(
    key,
    setTimeout(() => {
      void updateDraftOutline(draftId, outline, title);
      savers.delete(key);
    }, 600),
  );
}
