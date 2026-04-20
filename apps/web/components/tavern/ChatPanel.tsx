// Bottom-centred chat composer. Hidden by default — press **Tab** to open
// "chat mode". While open, Phaser's keyboard plugin is disabled so WASD
// types letters. Enter / Send submits; Escape discards + closes. Closing
// re-enables Phaser's keyboard so the avatar can move again.
//
// The chat bar is unmounted while closed so it can't accidentally steal
// focus and starve the canvas of keyboard events.

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
  /** Called with `true` when the bar opens, `false` when it closes. */
  readonly onFocusChange?: (focused: boolean) => void;
};

export function ChatPanel({
  realmId,
  memberId,
  displayName,
  onMessageReceived,
  onFocusChange,
}: Props): React.JSX.Element | null {
  const { send } = useTavernChat({ realmId, memberId, onMessageReceived });
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setDraft('');
    setOpen(false);
  }, []);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmed = draft.trim();
      if (!trimmed) {
        close();
        return;
      }
      setDraft('');
      await send(trimmed);
      close();
    },
    [draft, send, close],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
      // Enter is handled by the form's submit.
    },
    [close],
  );

  // Tab-to-open — document-level listener intercepts Tab and opens the bar
  // unless the user is already inside an editable element (preserves
  // accessibility Tab-traversal inside forms).
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
      setOpen(true);
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  // Focus the input the moment the bar opens — one tick later so the input
  // is mounted in the DOM.
  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [open]);

  // Notify the parent so GameTavern can disable Phaser's keyboard plugin
  // while the bar is open. Visibility-driven (not DOM-focus-driven) so
  // there's no window where the scene thinks chat is "focused" while the
  // bar isn't actually showing.
  useEffect(() => {
    onFocusChange?.(open);
  }, [open, onFocusChange]);

  if (!open) return null;

  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 z-30 w-[min(600px,92vw)] -translate-x-1/2">
      <form
        onSubmit={handleSubmit}
        className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-amber-500/60 bg-[rgba(30,20,15,0.92)] px-3 py-2 shadow-xl backdrop-blur"
      >
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
          onKeyDown={handleKeyDown}
          // Blurring the input while the bar is open shouldn't close the
          // bar (user might click elsewhere and come back). Escape + Send
          // are the only close paths.
          placeholder={`${displayName} says…  (Esc to cancel)`}
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
