// The sage's chat surface. Full-overlay scriptorium ScrollCard with
// a transcript on top and a VellumField + WaxButton input row at
// the bottom. Streams responses from /api/sage/chat token-by-token.
//
// Conversation persists in localStorage under `arcadia.sage.history`
// (see `lib/sage/storage.ts`) so a returning visitor picks up where
// they left off.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  DropCap,
  GhostButton,
  Hand,
  Kicker,
  ScrollCard,
  VellumField,
  WaxButton,
  WaxSeal,
} from '@/components/scriptorium';
import { SAGE_GREETING } from '@/lib/sage/prompts';
import { loadSageHistory, saveSageHistory, type SageMessage } from '@/lib/sage/storage';

type Props = {
  readonly onClose: () => void;
};

export function SageDialogue({ onClose }: Props): React.JSX.Element {
  const [messages, setMessages] = useState<readonly SageMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Hydrate from localStorage on mount; save on every change.
  useEffect(() => {
    setMessages(loadSageHistory());
  }, []);
  useEffect(() => {
    saveSageHistory(messages);
  }, [messages]);

  // Auto-scroll the transcript to the bottom whenever a token lands.
  useEffect(() => {
    const el = transcriptRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, streamText, streaming]);

  // Esc closes; focus the input on mount.
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    inputRef.current?.focus();
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Cancel any in-flight stream on unmount.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const send = useCallback(async (): Promise<void> => {
    const content = input.trim();
    if (content.length === 0 || streaming) return;
    setError(null);
    setInput('');
    const next: SageMessage[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setStreaming(true);
    setStreamText('');

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const resp = await fetch('/api/sage/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
        signal: controller.signal,
      });
      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
        setError(errBody.error ?? `HTTP ${resp.status}`);
        return;
      }
      const reader = resp.body?.getReader();
      if (!reader) {
        setError('the wanderer fell silent');
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
      setMessages((prev) => [...prev, { role: 'assistant', content: acc }]);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setError((err as Error).message);
    } finally {
      setStreaming(false);
      setStreamText('');
    }
  }, [input, messages, streaming]);

  const onClear = (): void => {
    setMessages([]);
    setStreamText('');
    setError(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="speak with the wanderer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'rgba(5, 2, 8, 0.78)',
        backdropFilter: 'blur(18px)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 720 }}>
        <ScrollCard style={{ position: 'relative', padding: '26px 28px' }}>
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
              color: 'var(--ink-soft)',
              padding: 8,
              fontSize: 16,
              lineHeight: 1,
              borderRadius: 3,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--wax)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-soft)')}
          >
            ✕
          </button>

          <header
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 18,
              paddingBottom: 16,
              borderBottom: '1px dashed rgba(90, 63, 34, 0.3)',
            }}
          >
            <DropCap letter="W" variant="blue" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Kicker>the wanderer</Kicker>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontSize: 28,
                  margin: '4px 0 0',
                  color: 'var(--ink)',
                  lineHeight: 1.1,
                }}
              >
                ask anything about Arcadia.
              </h2>
              <Hand>
                ~ I keep the scrolls — realms, academy, tavern, market, the lot. ask plainly. ~
              </Hand>
            </div>
          </header>

          {/* Transcript */}
          <div
            ref={transcriptRef}
            className="scriptorium-prose"
            style={{
              marginTop: 16,
              maxHeight: 420,
              overflowY: 'auto',
              padding: '4px 6px 2px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              scrollBehavior: 'smooth',
            }}
          >
            {messages.length === 0 && !streaming && (
              <SageBubble role="assistant" content={SAGE_GREETING} />
            )}
            {messages.map((m, i) => (
              <SageBubble key={i} role={m.role} content={m.content} />
            ))}
            {streaming && <SageBubble role="assistant" content={streamText || '…'} pending />}
          </div>

          {error && (
            <p
              className="hand"
              role="alert"
              style={{ margin: '12px 0 0', color: 'var(--crimson)' }}
            >
              ~ {error} ~
            </p>
          )}

          {/* Input row */}
          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: '1px dashed rgba(90, 63, 34, 0.25)',
              display: 'flex',
              gap: 10,
              alignItems: 'flex-end',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <VellumField
                ref={inputRef}
                label="~ ask the wanderer ~"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                disabled={streaming}
                placeholder="how do I publish a course?"
                maxLength={2_000}
              />
            </div>
            <WaxButton
              type="button"
              onClick={() => void send()}
              disabled={streaming || input.trim().length === 0}
            >
              {streaming ? 'speaking…' : 'ask'}
            </WaxButton>
          </div>

          {/* Footer actions */}
          {messages.length > 0 && (
            <div
              style={{
                marginTop: 10,
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <GhostButton size="sm" onClick={onClear} disabled={streaming}>
                forget the conversation
              </GhostButton>
            </div>
          )}
        </ScrollCard>
      </div>
    </div>
  );
}

function SageBubble({
  role,
  content,
  pending,
}: {
  readonly role: 'user' | 'assistant';
  readonly content: string;
  readonly pending?: boolean;
}): React.JSX.Element {
  const isSage = role === 'assistant';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isSage ? 'row' : 'row-reverse',
        gap: 10,
        alignItems: 'flex-start',
      }}
    >
      <div style={{ flexShrink: 0 }}>
        {isSage ? (
          <WaxSeal letter="W" style={{ width: 32, height: 32, fontSize: 15 }} />
        ) : (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--bronze), var(--bronze-deep))',
              border: '1.5px solid var(--bronze-deep)',
              color: 'var(--vellum)',
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ?
          </div>
        )}
      </div>
      <div
        style={{
          maxWidth: '78%',
          padding: '10px 14px',
          borderRadius: 4,
          background: isSage ? 'rgba(90, 63, 34, 0.05)' : 'rgba(212, 165, 116, 0.16)',
          border: isSage
            ? '1px solid rgba(90, 63, 34, 0.18)'
            : '1px solid rgba(212, 165, 116, 0.45)',
          fontFamily: 'var(--font-body)',
          fontSize: 15,
          lineHeight: 1.6,
          color: 'var(--ink)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          opacity: pending ? 0.85 : 1,
        }}
      >
        {content}
      </div>
    </div>
  );
}
