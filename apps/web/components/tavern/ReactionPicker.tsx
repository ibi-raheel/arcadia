// Floating emoji picker anchored to a screen coordinate. Opens when the
// user clicks a speech bubble in TavernScene (see TAVERN_BUBBLE_CLICK_EVENT
// in scenes/tavern/TavernScene.ts). Clicking an emoji calls the
// `toggle_reaction` RPC and closes the picker.

'use client';

import { useEffect, useRef } from 'react';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

import { REACTION_EMOJI } from './types';

const PICKER_WIDTH = 180;

type Props = {
  readonly messageId: string;
  readonly x: number;
  readonly y: number;
  readonly onClose: () => void;
};

export function ReactionPicker({ messageId, x, y, onClose }: Props): React.JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleDocDown = (e: MouseEvent): void => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    // Delay attaching mousedown so the same click that opened the picker
    // isn't caught by the outside-click handler.
    const id = window.setTimeout(() => {
      document.addEventListener('mousedown', handleDocDown);
    }, 0);
    document.addEventListener('keydown', handleKey);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('mousedown', handleDocDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const handleReact = async (emoji: string): Promise<void> => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.rpc('toggle_reaction', {
      p_message_id: messageId,
      p_emoji: emoji,
    });
    if (error) {
      console.error('toggle_reaction rpc failed:', error.message);
    }
    onClose();
  };

  // Clamp x so the picker doesn't overflow the viewport horizontally.
  const clampedX = Math.min(
    Math.max(PICKER_WIDTH / 2 + 8, x),
    window.innerWidth - PICKER_WIDTH / 2 - 8,
  );

  return (
    <div
      ref={rootRef}
      style={{ left: clampedX, top: y }}
      className="pointer-events-auto absolute z-40 -translate-x-1/2 -translate-y-[110%] rounded-full border border-neutral-700 bg-neutral-900/95 px-2 py-1.5 shadow-xl backdrop-blur"
    >
      <div className="flex items-center gap-1">
        {REACTION_EMOJI.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => void handleReact(emoji)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg transition hover:bg-neutral-800 hover:scale-110"
            aria-label={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
