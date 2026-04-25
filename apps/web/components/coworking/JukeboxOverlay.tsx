// The jukebox proximity modal. Renders a station picker, a per-tab
// volume slider, and a small "currently playing" pill. Sets the
// shared station via Colyseus (`MSG.SET_JUKEBOX`); volume stays
// per-member (saved to localStorage so it survives reconnects).
//
// Audio plays via a hidden `<audio>` element keyed on the playlist
// id. When the shared state changes (someone else picks a station),
// the audio element swaps src + restarts. `startedAt` lets us align
// playback to the same offset across tabs (best-effort — within a
// few seconds is fine for ambient tracks).

'use client';

import { useEffect, useState } from 'react';

import {
  emitOverlayInputBlur,
  emitOverlayInputFocus,
} from '@/components/game/scenes/shared/overlay-input-events';
import type { ColyseusConnection } from '@/components/game/net/colyseus-client';
import {
  BronzeButton,
  Chip,
  GhostButton,
  Hand,
  Kicker,
  ScrollCard,
} from '@/components/scriptorium';
import { MSG } from '@arcadia/shared';

import { PLAYLISTS, findPlaylist, type PlaylistDescriptor } from './playlists';
import type { JukeboxView } from './CoworkingFeatures';

const VOLUME_STORAGE_KEY = 'arcadia.jukebox.volume';
const DEFAULT_VOLUME = 0.3;

type Props = {
  readonly jukebox: JukeboxView;
  readonly connection: ColyseusConnection | null;
  readonly onClose: () => void;
};

export function JukeboxOverlay({ jukebox, connection, onClose }: Props): React.JSX.Element {
  const [volume, setVolume] = useState<number>(DEFAULT_VOLUME);

  // Hydrate volume from localStorage.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(VOLUME_STORAGE_KEY);
    const v = stored ? Number(stored) : NaN;
    if (Number.isFinite(v) && v >= 0 && v <= 1) setVolume(v);
  }, []);

  // Esc + overlay-input bridge.
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    emitOverlayInputFocus();
    return () => {
      document.removeEventListener('keydown', handler);
      emitOverlayInputBlur();
    };
  }, [onClose]);

  const setStation = (id: string): void => {
    const room = connection?.getCurrentRoom();
    room?.send(MSG.SET_JUKEBOX, { playlist: id });
  };

  const onVolumeChange = (next: number): void => {
    setVolume(next);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(VOLUME_STORAGE_KEY, String(next));
      } catch {
        /* private mode */
      }
    }
  };

  const current = findPlaylist(jukebox.playlist);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="the jukebox"
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
      <div style={{ width: '100%', maxWidth: 540 }}>
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
            }}
          >
            ✕
          </button>

          <header style={{ paddingBottom: 14, borderBottom: '1px dashed rgba(90, 63, 34, 0.3)' }}>
            <Kicker>the jukebox</Kicker>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: 26,
                margin: '4px 0 0',
                color: 'var(--ink)',
              }}
            >
              set the room&rsquo;s station.
            </h2>
            <Hand>~ everyone in this tent hears the same thing — volume is yours alone ~</Hand>
          </header>

          <div
            style={{
              marginTop: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            {PLAYLISTS.map((p) => (
              <StationCard
                key={p.id}
                playlist={p}
                active={p.id === jukebox.playlist}
                onPick={() => setStation(p.id)}
              />
            ))}
          </div>

          {/* Volume + current station */}
          <div
            style={{
              marginTop: 18,
              paddingTop: 14,
              borderTop: '1px dashed rgba(90, 63, 34, 0.25)',
            }}
          >
            <Kicker>your volume</Kicker>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              style={{ width: '100%', marginTop: 6, accentColor: 'var(--lantern)' }}
              aria-label="volume"
            />
            <div
              className="mono"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 10,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                color: 'var(--ink-soft)',
                marginTop: 4,
              }}
            >
              <span>{Math.round(volume * 100)}%</span>
              <span>{current ? `playing · ${current.label}` : 'silent'}</span>
            </div>
          </div>

          <footer
            style={{
              marginTop: 16,
              paddingTop: 12,
              borderTop: '1px dashed rgba(90, 63, 34, 0.25)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Hand>
              {jukebox.playlist
                ? `~ on the air since ${formatStartedAgo(jukebox.startedAt)} ago ~`
                : '~ no one has chosen a station yet ~'}
            </Hand>
            <div style={{ display: 'flex', gap: 8 }}>
              {jukebox.playlist && (
                <GhostButton size="sm" onClick={() => setStation('')}>
                  silence
                </GhostButton>
              )}
              <BronzeButton size="sm" onClick={onClose}>
                done
              </BronzeButton>
            </div>
          </footer>
        </ScrollCard>
      </div>
    </div>
  );
}

function StationCard({
  playlist,
  active,
  onPick,
}: {
  readonly playlist: PlaylistDescriptor;
  readonly active: boolean;
  readonly onPick: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onPick}
      style={{
        textAlign: 'left',
        padding: '14px 16px',
        background: active
          ? 'linear-gradient(135deg, rgba(212, 165, 116, 0.22), rgba(212, 165, 116, 0.08))'
          : 'rgba(255, 244, 210, 0.55)',
        border: active ? '1.5px solid var(--lantern)' : '1px solid rgba(90, 63, 34, 0.18)',
        borderRadius: 4,
        cursor: 'pointer',
        color: 'var(--ink)',
        fontFamily: 'var(--font-body)',
        transition: 'border-color 120ms ease, background 120ms ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 19,
            color: 'var(--ink)',
          }}
        >
          {playlist.label}
        </span>
        {active && <Chip variant="gilt">live</Chip>}
      </div>
      <p
        className="body-italic"
        style={{ margin: '4px 0 0', fontSize: 13, lineHeight: 1.4, color: 'var(--ink-soft)' }}
      >
        {playlist.description}
      </p>
    </button>
  );
}

function formatStartedAgo(startedAt: number): string {
  if (!startedAt) return 'just now';
  const ms = Date.now() - startedAt;
  if (ms < 60_000) return 'just now';
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}
