// Bottom-centred chat composer. Full-width pill at the bottom of the
// viewport matching the example UX — users type, press Enter (or the
// SEND button) to post, the message pops as a speech bubble above the
// speaker's avatar via TavernScene.
//
// Focus handoff to the game canvas:
//   - While the input is focused, Phaser's keyboard plugin is disabled
//     (via the onFocusChange callback → scene event) so WASD types
//     letters instead of also moving the avatar.
//   - Tab (pressed while the input isn't focused) focuses the input —
//     "enter chat mode" shortcut.
//   - Enter submits, Escape blurs + discards draft.
//   - Every blur path re-enables Phaser's keyboard.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { TavernMessage } from './types';
import { useTavernChat } from './use-tavern-chat';

const MAX_MESSAGE_LENGTH = 500;

type Props = {
  readonly realmId: string;
  readonly memberId: string;
  readonly displayName: string;
  readonly onMessageReceived?: (message: TavernMessage) => void;
  /** Called with `true` when the input gains focus, `false` on blur. */
  readonly onFocusChange?: (focused: boolean) => void;
};

export function ChatPanel({
  realmId,
  memberId,
  displayName,
  onMessageReceived,
  onFocusChange,
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
      // Enter is handled by the form's submit.
    },
    [blurInput],
  );

  // Tab-to-focus — document-level listener so the key reaches us even when
  // the canvas has focus. Only intercept when the user is outside any
  // editable element; don't block Tab's normal accessibility traversal
  // when they're already inside a form field.
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab') return;
      const target = e.target as HTMLElement | null;
      const isEditable =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target?.isContentEditable ?? false);
      if (isEditable) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  // Surface focus state changes to the parent so GameTavern can toggle the
  // scene's keyboard plugin. We call onFocusChange on every focused-state
  // flip; the parent handler is expected to be idempotent.
  useEffect(() => {
    onFocusChange?.(focused);
  }, [focused, onFocusChange]);

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
          placeholder={`${displayName} says…  (press Tab to chat)`}
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
