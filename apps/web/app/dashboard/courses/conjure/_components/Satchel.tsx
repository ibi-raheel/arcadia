// The satchel — where the creator drops source documents and writes
// the brief. Produces the grounding context for every downstream
// stage. Upload is sequential (one file at a time) per ADR 0012 to
// keep rate-limit pressure predictable. Each uploaded file shows as
// a WaxSeal chip; removal is instant.

'use client';

import { useCallback, useRef, useState, useTransition } from 'react';

import { removeDraftSource, updateDraftPrompt, uploadDraftSource } from '@/app/_actions/scribe';
import { BronzeButton, Hand, Kicker, VellumCard, WaxSeal } from '@/components/scriptorium';
import type { DraftSource } from '@/lib/types/course-drafts';
import { totalSourceChars } from '@/lib/types/course-drafts';

const MAX_FILES = 5;
const MAX_TOTAL_CHARS = 600_000;
const ACCEPT_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
].join(',');
const ACCEPT_HINT = 'PDF · DOCX · TXT · MD';

type Props = {
  readonly draftId: string;
  readonly sources: readonly DraftSource[];
  readonly userPrompt: string;
  readonly onSourcesChanged: (sources: readonly DraftSource[]) => void;
  readonly onPromptChanged: (prompt: string) => void;
};

export function Satchel({
  draftId,
  sources,
  userPrompt,
  onSourcesChanged,
  onPromptChanged,
}: Props): React.JSX.Element {
  const [uploading, setUploading] = useState(false);
  const [dragHover, setDragHover] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(userPrompt);
  const [, startPromptTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const promptDebounce = useRef<number | null>(null);

  const totalChars = totalSourceChars(sources);

  const ingestFiles = useCallback(
    async (files: readonly File[]) => {
      if (files.length === 0) return;
      setError(null);

      const remainingSlots = MAX_FILES - sources.length;
      if (remainingSlots <= 0) {
        setError(`the satchel holds ${MAX_FILES} at most — remove one first`);
        return;
      }
      const batch = files.slice(0, remainingSlots);

      setUploading(true);
      let nextSources: readonly DraftSource[] = sources;
      try {
        for (const file of batch) {
          const formData = new FormData();
          formData.set('file', file);
          const result = await uploadDraftSource(draftId, formData);
          if (!result.ok) {
            setError(result.error);
            break;
          }
          nextSources = [...nextSources, result.value.source];
          onSourcesChanged(nextSources);
        }
      } finally {
        setUploading(false);
      }
    },
    [draftId, sources, onSourcesChanged],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragHover(false);
      const files = Array.from(e.dataTransfer.files).filter((f) => ACCEPT_MIME.includes(f.type));
      void ingestFiles(files);
    },
    [ingestFiles],
  );

  const onPickFiles = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      void ingestFiles(files);
      e.target.value = '';
    },
    [ingestFiles],
  );

  const onRemove = useCallback(
    async (sourceId: string) => {
      const result = await removeDraftSource(draftId, sourceId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSourcesChanged(sources.filter((s) => s.id !== sourceId));
    },
    [draftId, sources, onSourcesChanged],
  );

  const onPromptInput = useCallback(
    (value: string): void => {
      setPrompt(value);
      onPromptChanged(value);
      if (promptDebounce.current != null) window.clearTimeout(promptDebounce.current);
      promptDebounce.current = window.setTimeout(() => {
        startPromptTransition(async () => {
          await updateDraftPrompt(draftId, value);
        });
      }, 450);
    },
    [draftId, onPromptChanged],
  );

  const charsPct = Math.min(100, (totalChars / MAX_TOTAL_CHARS) * 100);

  return (
    <VellumCard style={{ padding: '22px 26px' }}>
      <header style={{ marginBottom: 14 }}>
        <Kicker>the satchel · grounding context</Kicker>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 26,
            color: 'var(--ink)',
            margin: '4px 0 0',
            lineHeight: 1.15,
          }}
        >
          what should the scribe read first?
        </h2>
        <Hand>~ drop in notes, transcripts, outlines — the scribe weaves them through ~</Hand>
      </header>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragHover(true);
        }}
        onDragLeave={() => setDragHover(false)}
        onDrop={onDrop}
        style={{
          border: dragHover ? '2px dashed var(--lantern)' : '1.5px dashed var(--bronze)',
          borderRadius: 4,
          padding: '26px 18px',
          textAlign: 'center',
          background: dragHover ? 'rgba(212, 165, 116, 0.08)' : 'rgba(90, 63, 34, 0.03)',
          transition: 'background 120ms ease, border-color 120ms ease',
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
            color: 'var(--ink-soft)',
            marginBottom: 10,
          }}
        >
          {dragHover ? 'let go — the scribe will catch it' : 'drag · drop · release'}
        </div>
        <p
          className="body-italic"
          style={{ fontSize: 14, color: 'var(--ink-soft)', margin: '0 0 12px' }}
        >
          or —
        </p>
        <BronzeButton
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || sources.length >= MAX_FILES}
        >
          {uploading ? 'the scribe is reading…' : '+ add parchment'}
        </BronzeButton>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_MIME}
          onChange={onPickFiles}
          style={{ display: 'none' }}
        />
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            color: 'var(--ink-faint)',
            marginTop: 10,
          }}
        >
          {ACCEPT_HINT} · 10 MB each · up to {MAX_FILES} files
        </div>
      </div>

      {/* File chips */}
      {sources.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            marginTop: 16,
          }}
        >
          {sources.map((s) => (
            <div
              key={s.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px 6px 6px',
                borderRadius: 24,
                background: 'rgba(125, 90, 58, 0.08)',
                border: '1px solid rgba(90, 63, 34, 0.18)',
                maxWidth: 280,
              }}
            >
              <WaxSeal
                letter={s.filename.charAt(0).toUpperCase()}
                style={{
                  width: 22,
                  height: 22,
                  fontSize: 12,
                  flex: '0 0 auto',
                }}
              />
              <span
                className="mono"
                style={{
                  fontSize: 11,
                  letterSpacing: 0.8,
                  color: 'var(--ink)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={`${s.filename} · ${s.char_count.toLocaleString()} chars`}
              >
                {s.filename}
              </span>
              <button
                type="button"
                onClick={() => void onRemove(s.id)}
                aria-label={`remove ${s.filename}`}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--ink-faint)',
                  fontSize: 14,
                  lineHeight: 1,
                  padding: '2px 4px',
                  borderRadius: 2,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--crimson)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-faint)')}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Char budget */}
      {sources.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              height: 6,
              borderRadius: 3,
              background: 'rgba(90, 63, 34, 0.1)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${charsPct}%`,
                height: '100%',
                background:
                  charsPct > 85
                    ? 'var(--crimson)'
                    : charsPct > 60
                      ? 'var(--lantern)'
                      : 'var(--verdigris)',
                transition: 'width 180ms ease',
              }}
            />
          </div>
          <div
            className="mono"
            style={{
              marginTop: 4,
              fontSize: 10,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: 'var(--ink-faint)',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>
              {totalChars.toLocaleString()} / {MAX_TOTAL_CHARS.toLocaleString()} chars
            </span>
            <span>
              {sources.length} / {MAX_FILES} files
            </span>
          </div>
        </div>
      )}

      {error && (
        <p className="hand" role="alert" style={{ margin: '14px 0 0', color: 'var(--crimson)' }}>
          ~ {error} ~
        </p>
      )}

      {/* The brief */}
      <div
        style={{ marginTop: 24, paddingTop: 20, borderTop: '1px dashed rgba(90, 63, 34, 0.25)' }}
      >
        <Kicker>the brief · what course do you want?</Kicker>
        <div style={{ marginTop: 6 }}>
          <textarea
            id="conjure-prompt"
            className="field"
            value={prompt}
            onChange={(e) => onPromptInput(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="A course on beekeeping for beginners — 8 lessons, hands-on, assumes zero prior experience."
            style={{
              resize: 'vertical',
              minHeight: 96,
              lineHeight: 1.5,
              padding: '8px 2px',
              fontFamily: 'var(--font-body)',
              fontSize: 15,
            }}
          />
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: 'var(--ink-faint)',
              textAlign: 'right',
              marginTop: 4,
            }}
          >
            {prompt.length} / 2,000
          </div>
        </div>
      </div>
    </VellumCard>
  );
}
