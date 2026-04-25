// Top-left screen-anchored "what are you working on" pill.
// Click to expand into an editable input, type focus, ENTER to
// commit. The committed value rides the avatar's `currentFocus`
// field (Colyseus state) and shows above the avatar's nameplate
// to every member in the tent.
//
// Empty state shows a hand-script "~ what are you working on? ~"
// affordance the keeper can tap into.

'use client';

import { useEffect, useRef, useState } from 'react';

import {
  emitOverlayInputBlur,
  emitOverlayInputFocus,
} from '@/components/game/scenes/shared/overlay-input-events';
import type { ColyseusConnection } from '@/components/game/net/colyseus-client';
import { MSG } from '@arcadia/shared';

const FOCUS_MAX_CHARS = 60;

type Props = {
  readonly currentFocus: string;
  readonly connection: ColyseusConnection | null;
};

export function FocusPill({ currentFocus, connection }: Props): React.JSX.Element {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentFocus);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep draft in sync when the source value changes from elsewhere.
  useEffect(() => {
    if (!editing) setDraft(currentFocus);
  }, [currentFocus, editing]);

  useEffect(() => {
    if (editing) {
      emitOverlayInputFocus();
      const id = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => {
        window.clearTimeout(id);
        emitOverlayInputBlur();
      };
    }
    return undefined;
  }, [editing]);

  const commit = (text: string): void => {
    const room = connection?.getCurrentRoom();
    room?.send(MSG.SET_FOCUS, { text });
  };

  const onSave = (): void => {
    commit(draft.trim());
    setEditing(false);
  };

  const onCancel = (): void => {
    setDraft(currentFocus);
    setEditing(false);
  };

  const onClear = (): void => {
    commit('');
    setDraft('');
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 70,
          padding: '8px 14px',
          borderRadius: 20,
          background: 'rgba(5, 2, 8, 0.78)',
          border: '1.5px solid var(--bronze-deep)',
          color: 'var(--vellum)',
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 13,
          letterSpacing: 0.3,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.45)',
          cursor: 'pointer',
          maxWidth: 320,
          textAlign: 'left',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        aria-label="set what you're working on"
      >
        {currentFocus.length > 0 ? (
          <>
            <span style={{ color: 'var(--lantern)', fontStyle: 'normal' }}>◈</span>{' '}
            <span>{currentFocus}</span>
          </>
        ) : (
          <span style={{ color: 'var(--vellum-shadow)' }}>~ what are you working on? ~</span>
        )}
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        left: 16,
        zIndex: 70,
        padding: '10px 12px',
        borderRadius: 8,
        background: 'rgba(5, 2, 8, 0.92)',
        border: '1.5px solid var(--lantern)',
        boxShadow: '0 8px 22px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        minWidth: 320,
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={draft}
        maxLength={FOCUS_MAX_CHARS}
        placeholder="writing thesis ch.4 · killing inbox zero · …"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onSave();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          }
        }}
        style={{
          flex: 1,
          padding: '6px 10px',
          borderRadius: 4,
          border: '1px solid var(--bronze)',
          background: 'rgba(255, 244, 210, 0.08)',
          color: 'var(--vellum)',
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 14,
          outline: 'none',
        }}
      />
      <button
        type="button"
        onClick={onSave}
        style={{
          padding: '6px 12px',
          borderRadius: 4,
          border: '1px solid var(--lantern)',
          background: 'linear-gradient(135deg, var(--lantern), var(--lantern-deep))',
          color: 'var(--night)',
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        save
      </button>
      {currentFocus.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          title="clear focus"
          style={{
            padding: '6px 10px',
            borderRadius: 4,
            border: '1px solid var(--bronze-deep)',
            background: 'transparent',
            color: 'var(--vellum-shadow)',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      )}
      <button
        type="button"
        onClick={onCancel}
        style={{
          padding: '6px 10px',
          borderRadius: 4,
          border: 'none',
          background: 'transparent',
          color: 'var(--vellum-shadow)',
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        cancel
      </button>
    </div>
  );
}
