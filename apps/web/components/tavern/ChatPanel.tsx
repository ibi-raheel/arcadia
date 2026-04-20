// Scrollable chat overlay mounted on top of TavernScene. Owns the message
// list, the composer, and the reaction picker UI. State comes from
// useTavernChat — this file is pure presentation.

'use client';

import { useEffect, useRef, useState } from 'react';

import { REACTION_EMOJI, type TavernMessage } from './types';
import { useTavernChat } from './use-tavern-chat';

const MAX_MESSAGE_LENGTH = 500;

type Props = {
  readonly realmId: string;
  readonly memberId: string;
  readonly displayName: string;
};

export function ChatPanel({ realmId, memberId, displayName }: Props): React.JSX.Element {
  const { state, send, toggleReaction } = useTavernChat({ realmId, memberId });
  const [draft, setDraft] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages. Only scroll if user was already near the
  // bottom — otherwise they're reading history and we shouldn't yank them.
  useEffect(() => {
    if (state.status !== 'ready') return;
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [state]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    setDraft('');
    await send(trimmed);
  };

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="pointer-events-auto absolute bottom-4 right-4 z-30 rounded bg-neutral-900/80 px-3 py-2 text-sm text-neutral-100 shadow hover:bg-neutral-900"
      >
        💬 Chat
      </button>
    );
  }

  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 z-30 flex h-80 w-96 flex-col rounded-lg border border-neutral-800 bg-neutral-900/92 text-sm text-neutral-100 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2">
        <span className="font-medium tracking-tight">Tavern chat</span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="text-neutral-500 hover:text-neutral-200"
          aria-label="Collapse chat"
        >
          ×
        </button>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-2">
        {state.status === 'loading' && <p className="text-neutral-500">Loading…</p>}
        {state.status === 'error' && (
          <p className="text-red-400">Couldn&rsquo;t load chat: {state.message}</p>
        )}
        {state.status === 'ready' && state.messages.length === 0 && (
          <p className="text-neutral-500">No messages yet. Be the first.</p>
        )}
        {state.status === 'ready' &&
          state.messages.map((m) => (
            <MessageRow
              key={m.id}
              message={m}
              isOwnMessage={m.sender_id === memberId}
              memberId={memberId}
              onReact={(emoji) => void toggleReaction(m.id, emoji)}
            />
          ))}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-neutral-800 px-3 py-2"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
          placeholder={`Say something as ${displayName}…`}
          className="flex-1 rounded bg-neutral-800 px-2 py-1 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-600"
          maxLength={MAX_MESSAGE_LENGTH}
        />
        <button
          type="submit"
          disabled={draft.trim().length === 0}
          className="rounded bg-neutral-100 px-3 py-1 text-sm font-medium text-neutral-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function MessageRow({
  message,
  isOwnMessage,
  memberId,
  onReact,
}: {
  readonly message: TavernMessage;
  readonly isOwnMessage: boolean;
  readonly memberId: string;
  readonly onReact: (emoji: string) => void;
}): React.JSX.Element {
  const [showPicker, setShowPicker] = useState(false);
  const reactions = Object.entries(message.reactions ?? {});
  return (
    <div
      className={`group mb-2 flex flex-col rounded px-2 py-1 ${isOwnMessage ? 'bg-neutral-800/40' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 break-words">
          <span className="mr-1 text-xs text-neutral-500">
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          <span className="text-neutral-100">{message.content}</span>
        </div>
        <button
          type="button"
          onClick={() => setShowPicker((v) => !v)}
          className="shrink-0 rounded px-1 py-0.5 text-neutral-500 opacity-0 transition group-hover:opacity-100 hover:bg-neutral-700 hover:text-neutral-100"
          aria-label="React to message"
        >
          🙂+
        </button>
      </div>

      {(reactions.length > 0 || showPicker) && (
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {reactions.map(([emoji, userIds]) => {
            const isMine = userIds.includes(memberId);
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(emoji)}
                className={`rounded border px-1.5 py-0.5 text-xs transition ${
                  isMine
                    ? 'border-neutral-500 bg-neutral-700 text-neutral-100'
                    : 'border-neutral-800 bg-neutral-800/60 text-neutral-300 hover:border-neutral-600'
                }`}
              >
                {emoji} {userIds.length}
              </button>
            );
          })}
          {showPicker &&
            REACTION_EMOJI.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onReact(emoji);
                  setShowPicker(false);
                }}
                className="rounded border border-neutral-800 bg-neutral-900 px-1.5 py-0.5 text-xs text-neutral-300 hover:border-neutral-600 hover:text-neutral-100"
              >
                {emoji}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
