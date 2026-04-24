// Stage 3 of the scribe ritual — images. One thumbnail card for the
// whole course + one card per lesson. Each card has three modes:
//
//   empty      — no image yet; "generate" button
//   pending    — request in flight, woodcut-texture shimmer
//   ready      — image visible with approve / re-roll controls
//
// All images flow through a fixed style preamble so a single course
// reads as one bookshelf.

'use client';

import { useCallback, useState, useTransition } from 'react';

import { deleteDraftImage, reloadDraft, setImageApproved } from '@/app/_actions/scribe';
import {
  BronzeButton,
  Chip,
  GhostButton,
  Hand,
  Kicker,
  ScrollCard,
  VellumCard,
  WaxButton,
  WaxSeal,
} from '@/components/scriptorium';
import type {
  CourseDraft,
  DraftImage,
  DraftImageTarget,
  DraftOutlineLesson,
} from '@/lib/types/course-drafts';

type Props = {
  readonly draft: CourseDraft;
  readonly onDraftChanged: (draft: CourseDraft) => void;
};

function isSameTarget(a: DraftImageTarget, lessonId: string | null): boolean {
  if (a === 'thumbnail') return lessonId === null;
  return lessonId !== null && a.lesson_id === lessonId;
}

export function ImagesStage({ draft, onDraftChanged }: Props): React.JSX.Element {
  const [generatingFor, setGeneratingFor] = useState<string | null>(null); // 'thumbnail' | lessonId
  const [error, setError] = useState<string | null>(null);

  const imageFor = (lessonId: string | null): DraftImage | undefined =>
    draft.images.find((i) => isSameTarget(i.target, lessonId));

  const runGenerate = useCallback(
    async (lessonId: string | null, sectionId: string | null, feedback?: string): Promise<void> => {
      setError(null);
      setGeneratingFor(lessonId ?? 'thumbnail');
      try {
        const resp = await fetch('/api/scribe/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            draftId: draft.id,
            target: lessonId && sectionId ? { sectionId, lessonId } : 'thumbnail',
            feedback,
          }),
        });
        if (!resp.ok) {
          const errBody = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
          setError(errBody.error ?? `HTTP ${resp.status}`);
          return;
        }
        const refreshed = await reloadDraft(draft.id);
        if (refreshed.ok) onDraftChanged(refreshed.value);
        else setError(refreshed.error);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setGeneratingFor(null);
      }
    },
    [draft.id, onDraftChanged],
  );

  return (
    <ScrollCard style={{ padding: '24px 26px' }}>
      <header
        style={{
          paddingBottom: 14,
          borderBottom: '1px dashed rgba(90, 63, 34, 0.28)',
        }}
      >
        <Kicker>stage 3 · the illustrations</Kicker>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 24,
            color: 'var(--ink)',
            margin: '4px 0 0',
          }}
        >
          paint the shelf.
        </h3>
        <Hand>
          ~ every image shares the same style preamble, so a course reads as one bookshelf ~
        </Hand>
      </header>

      {error && (
        <p className="hand" role="alert" style={{ margin: '12px 0 0', color: 'var(--crimson)' }}>
          ~ {error} ~
        </p>
      )}

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <ImageCard
          draftId={draft.id}
          title="course thumbnail"
          kicker="cover"
          image={imageFor(null)}
          pending={generatingFor === 'thumbnail'}
          disabledWhileOthers={generatingFor !== null && generatingFor !== 'thumbnail'}
          onGenerate={(feedback) => runGenerate(null, null, feedback)}
          onApproveChanged={(ok, approved) => {
            if (!ok) return;
            const target = imageFor(null);
            if (!target) return;
            onDraftChanged({
              ...draft,
              images: draft.images.map((i) => (i.id === target.id ? { ...i, approved } : i)),
            });
          }}
          onDelete={async () => {
            const target = imageFor(null);
            if (!target) return;
            await deleteDraftImage(draft.id, target.id);
            const refreshed = await reloadDraft(draft.id);
            if (refreshed.ok) onDraftChanged(refreshed.value);
          }}
        />

        {draft.outline.map((section, si) => (
          <section key={section.id}>
            <Kicker>section {si + 1}</Kicker>
            <h4
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: 19,
                color: 'var(--ink)',
                margin: '4px 0 10px',
              }}
            >
              {section.title}
            </h4>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 12,
              }}
            >
              {section.lessons.map((lesson) => (
                <LessonImageCard
                  key={lesson.id}
                  draftId={draft.id}
                  lesson={lesson}
                  image={imageFor(lesson.id)}
                  pending={generatingFor === lesson.id}
                  disabledWhileOthers={generatingFor !== null && generatingFor !== lesson.id}
                  onGenerate={(feedback) => runGenerate(lesson.id, section.id, feedback)}
                  onApproveChanged={(ok, approved) => {
                    if (!ok) return;
                    const target = imageFor(lesson.id);
                    if (!target) return;
                    onDraftChanged({
                      ...draft,
                      images: draft.images.map((i) =>
                        i.id === target.id ? { ...i, approved } : i,
                      ),
                    });
                  }}
                  onDelete={async () => {
                    const target = imageFor(lesson.id);
                    if (!target) return;
                    await deleteDraftImage(draft.id, target.id);
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

function ImageCard({
  draftId,
  title,
  kicker,
  image,
  pending,
  disabledWhileOthers,
  onGenerate,
  onApproveChanged,
  onDelete,
}: {
  readonly draftId: string;
  readonly title: string;
  readonly kicker: string;
  readonly image: DraftImage | undefined;
  readonly pending: boolean;
  readonly disabledWhileOthers: boolean;
  readonly onGenerate: (feedback?: string) => Promise<void>;
  readonly onApproveChanged: (ok: boolean, approved: boolean) => void;
  readonly onDelete: () => Promise<void>;
}): React.JSX.Element {
  const [approving, startApprove] = useTransition();
  const approved = image?.approved === true;

  const approveToggle = (): void => {
    if (!image) return;
    startApprove(async () => {
      const r = await setImageApproved(draftId, image.id, !approved);
      onApproveChanged(r.ok, !approved);
    });
  };

  return (
    <VellumCard
      style={{
        padding: 18,
        borderLeft: approved
          ? '3px solid var(--verdigris)'
          : image
            ? '3px solid var(--lantern)'
            : '3px dashed var(--bronze)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <Kicker>{kicker}</Kicker>
          <h5
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 19,
              color: 'var(--ink)',
              margin: '4px 0 0',
            }}
          >
            {title}
          </h5>
        </div>
        {approved ? (
          <Chip variant="verdigris">approved</Chip>
        ) : pending ? (
          <Chip variant="gilt">painting</Chip>
        ) : image ? (
          <Chip variant="gilt">ready</Chip>
        ) : (
          <Chip>empty</Chip>
        )}
      </header>

      <ImagePreview image={image} pending={pending} large />

      <footer
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          paddingTop: 10,
          borderTop: '1px dashed rgba(90, 63, 34, 0.2)',
        }}
      >
        {image ? (
          <>
            <GhostButton size="sm" onClick={() => void onDelete()} disabled={disabledWhileOthers}>
              re-roll
            </GhostButton>
            <WaxButton onClick={approveToggle} disabled={approving || disabledWhileOthers}>
              {approved ? 'un-approve' : 'approve'}
            </WaxButton>
          </>
        ) : (
          <BronzeButton
            size="sm"
            onClick={() => void onGenerate()}
            disabled={pending || disabledWhileOthers}
          >
            {pending ? 'the scribe is painting…' : 'generate'}
          </BronzeButton>
        )}
      </footer>
    </VellumCard>
  );
}

function LessonImageCard({
  draftId,
  lesson,
  image,
  pending,
  disabledWhileOthers,
  onGenerate,
  onApproveChanged,
  onDelete,
}: {
  readonly draftId: string;
  readonly lesson: DraftOutlineLesson;
  readonly image: DraftImage | undefined;
  readonly pending: boolean;
  readonly disabledWhileOthers: boolean;
  readonly onGenerate: (feedback?: string) => Promise<void>;
  readonly onApproveChanged: (ok: boolean, approved: boolean) => void;
  readonly onDelete: () => Promise<void>;
}): React.JSX.Element {
  const [approving, startApprove] = useTransition();
  const approved = image?.approved === true;

  const approveToggle = (): void => {
    if (!image) return;
    startApprove(async () => {
      const r = await setImageApproved(draftId, image.id, !approved);
      onApproveChanged(r.ok, !approved);
    });
  };

  return (
    <VellumCard
      style={{
        padding: 14,
        borderLeft: approved
          ? '3px solid var(--verdigris)'
          : image
            ? '3px solid var(--lantern)'
            : '3px dashed var(--bronze)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {approved && <WaxSeal letter="✓" style={{ width: 22, height: 22, fontSize: 12 }} />}
          <h6
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 15,
              color: 'var(--ink)',
              margin: 0,
            }}
          >
            {lesson.title}
          </h6>
        </div>
      </header>
      <ImagePreview image={image} pending={pending} />
      <footer
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
          paddingTop: 8,
          borderTop: '1px dashed rgba(90, 63, 34, 0.2)',
        }}
      >
        {image ? (
          <>
            <GhostButton size="sm" onClick={() => void onDelete()} disabled={disabledWhileOthers}>
              re-roll
            </GhostButton>
            <WaxButton
              size="sm"
              onClick={approveToggle}
              disabled={approving || disabledWhileOthers}
            >
              {approved ? 'un-approve' : 'approve'}
            </WaxButton>
          </>
        ) : (
          <BronzeButton
            size="sm"
            onClick={() => void onGenerate()}
            disabled={pending || disabledWhileOthers}
          >
            {pending ? 'painting…' : 'generate'}
          </BronzeButton>
        )}
      </footer>
    </VellumCard>
  );
}

function ImagePreview({
  image,
  pending,
  large,
}: {
  readonly image: DraftImage | undefined;
  readonly pending: boolean;
  readonly large?: boolean;
}): React.JSX.Element {
  const height = large ? 260 : 160;
  if (image) {
    return (
      <div
        style={{
          borderRadius: 3,
          overflow: 'hidden',
          height,
          background: 'rgba(90, 63, 34, 0.04)',
          border: '1px solid rgba(90, 63, 34, 0.18)',
        }}
      >
        {/* Generated image from Supabase Storage — using a plain <img>
            because Next Image doesn't benefit from optimization on an
            already-sized AI-generated asset. */}
        <img
          src={image.url}
          alt={image.prompt}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
    );
  }
  return (
    <div
      style={{
        height,
        borderRadius: 3,
        background: pending
          ? 'linear-gradient(90deg, rgba(90,63,34,0.07), rgba(90,63,34,0.16), rgba(90,63,34,0.07))'
          : 'rgba(90, 63, 34, 0.05)',
        backgroundSize: pending ? '200% 100%' : undefined,
        animation: pending ? 'scribe-shimmer 1.8s linear infinite' : undefined,
        border: '1px dashed rgba(90, 63, 34, 0.22)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--ink-faint)',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
      }}
    >
      {pending ? '~ warming the ink ~' : '~ unpainted ~'}
      <style>{`@keyframes scribe-shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }`}</style>
    </div>
  );
}
