// Hidden audio element driven by the per-tent jukebox state. Volume
// is per-member (read from localStorage every render — cheap, only
// re-reads when the jukebox state changes anyway).
//
// Browser autoplay policy blocks audio until a user gesture, which
// is why the JukeboxOverlay's `onPick` (a click) is the natural
// trigger. Once the user has interacted at least once with the
// page, subsequent station changes propagate without a click on
// any other tab — but the very first track on a fresh tab needs
// the user to have clicked something inside that tab.

'use client';

import { useEffect, useRef } from 'react';

import { findPlaylist } from './playlists';
import type { JukeboxView } from './CoworkingFeatures';

const VOLUME_STORAGE_KEY = 'arcadia.jukebox.volume';
const DEFAULT_VOLUME = 0.3;

type Props = {
  readonly jukebox: JukeboxView;
};

export function JukeboxAudio({ jukebox }: Props): React.JSX.Element {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync src + play/pause when the playlist changes.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const playlist = findPlaylist(jukebox.playlist);
    if (!playlist) {
      el.pause();
      el.removeAttribute('src');
      return;
    }

    if (el.getAttribute('src') !== playlist.src) {
      el.src = playlist.src;
      el.loop = playlist.loop;
    }
    el.volume = readVolume();
    el.play().catch(() => {
      // Autoplay blocked — common before the first user gesture.
      // The next gesture (e.g. picking a station) will start
      // playback. No-op here on purpose.
    });
  }, [jukebox.playlist, jukebox.startedAt]);

  // Keep volume in sync without re-srcing if the user adjusts the
  // slider from another mounted overlay. Reads on every state tick.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = readVolume();
  });

  return <audio ref={audioRef} preload="none" style={{ display: 'none' }} aria-hidden="true" />;
}

function readVolume(): number {
  if (typeof window === 'undefined') return DEFAULT_VOLUME;
  try {
    const stored = window.localStorage.getItem(VOLUME_STORAGE_KEY);
    const v = stored ? Number(stored) : NaN;
    if (Number.isFinite(v) && v >= 0 && v <= 1) return v;
  } catch {
    /* private mode */
  }
  return DEFAULT_VOLUME;
}
