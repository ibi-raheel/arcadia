// Hidden audio element driven by the per-tent jukebox state.
// Volume is passed in by the parent (CoworkingFeatures) so the
// slider in JukeboxOverlay updates audio in real time — both
// components share the same volume state at the parent level.
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

type Props = {
  readonly jukebox: JukeboxView;
  readonly volume: number;
};

export function JukeboxAudio({ jukebox, volume }: Props): React.JSX.Element {
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
    el.volume = volume;
    el.play().catch(() => {
      // Autoplay blocked — common before the first user gesture.
      // The next gesture (e.g. picking a station) will start
      // playback. No-op here on purpose.
    });
  }, [jukebox.playlist, jukebox.startedAt, volume]);

  // Live-update volume on every change (separate effect so it
  // doesn't re-src the audio).
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = volume;
  }, [volume]);

  return <audio ref={audioRef} preload="none" style={{ display: 'none' }} aria-hidden="true" />;
}
