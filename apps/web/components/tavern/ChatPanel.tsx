// Bottom-centred chat composer. Full-width pill at the bottom of the
// viewport matching the example UX — users type, press Enter (or the
// SEND button) to post, the message pops as a speech bubble above the
// speaker's avatar via TavernScene, and focus returns to the game canvas
// so WASD immediately moves again.
//
// Focus rules:
//   - Click / tap the input to focus it. While focused, keystrokes type
//     text (including WASD — users can say "wait up").
//   - Enter submits and blurs.
//   - Escape discards the draft and blurs.
//   - On submit, the input is blurred — keyboard returns to the game.
//
// The scrollable message log + reaction pills from the earlier UI are
// gone: chat is now ephemeral (speech-bubble-driven). Persistence of
// `tavern_messages` rows is unchanged; a future polish pass can add a
// toggle-able history viewer.

'use client';

import { useCallback, useRef, useState } from 'react';

import type { TavernMessage } from './types';
import { useTavernChat } from './use-tavern-chat';

const MAX_MESSAGE_LENGTH = 500;

type Props = {
  readonly realmId: string;
  readonly memberId: string;
  readonly displayName: string;
  readonly onMessageReceived?: (message: TavernMessage) => void;
};

export function ChatPanel({
  realmId,
  memberId,
  displayName,
  onMessageReceived,
}: Props): React.JSX.Element {
  const { send } = useTavernChat({ realmId, memberId, onMessageReceived });
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const blurInput = useCallback(() => {
    inputRef.current?.blur();
  }, []);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmed = draft.trim();
      if (!trimmed) return;
      setDraft('');
      await send(trimmed);
      blurInput();
    },
    [draft, send, blurInput],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setDraft('');
        blurInput();
      }
      // Enter is handled by the form submit (native behavior).
    },
    [blurInput],
  );

  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 z-30 w-[min(600px,92vw)] -translate-x-1/2">
      <form
        onSubmit={handleSubmit}
        className={`pointer-events-auto flex items-center gap-2 rounded-2xl border bg-[rgba(30,20,15,0.85)] px-3 py-2 shadow-xl backdrop-blur transition-colors ${
          focused ? 'border-amber-500/60' : 'border-amber-900/40'
        }`}
      >
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={`${displayName} says…`}
          className="flex-1 bg-transparent px-2 py-1 text-neutral-100 placeholder:text-neutral-400 focus:outline-none"
          maxLength={MAX_MESSAGE_LENGTH}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={draft.trim().length === 0}
          className="rounded-xl bg-amber-700 px-4 py-1.5 text-sm font-semibold uppercase tracking-wide text-amber-50 shadow transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
