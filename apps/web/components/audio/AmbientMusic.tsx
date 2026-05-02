// Persistent ambient music — plays on loop everywhere the user is
// post-auth. Mounted as a sibling to `{children}` in the root layout
// (`apps/web/app/layout.tsx`) so the `<audio>` element survives every
// client-side navigation: walking from `/world` → `/dashboard` →
// `/coworking/inside` doesn't restart the track.
//
// Behaviour:
//   - Pauses on /login, /signup, /onboarding/* (the user isn't "in
//     the world" yet).
//   - Tries autoplay; if blocked by the browser (Chrome's policy),
//     starts on the first user gesture anywhere on the page.
//   - localStorage-persisted mute state — the user's choice carries
//     across reloads.
//   - Tiny mute toggle anchored bottom-right at z-index 50 (below
//     modals at 80 but above scenes/HUDs).

'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const TRACK_SRC = '/audio/ambient/woven-paths-at-nightfall.mp3';
const VOLUME = 0.28;
const MUTE_STORAGE_KEY = 'arcadia.ambient.muted';

/** Routes where the music should NOT play (pre-world flows). */
function isMutedRoute(pathname: string): boolean {
  if (pathname === '/login' || pathname === '/signup') return true;
  if (pathname.startsWith('/onboarding')) return true;
  return false;
}

export function AmbientMusic(): React.JSX.Element {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pathname = usePathname() ?? '/';
  const [muted, setMuted] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate user's mute preference from localStorage. Defer to
  // useEffect so SSR + hydration match (mute starts false on server).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(MUTE_STORAGE_KEY);
      if (stored === '1') setMuted(true);
    } catch {
      // localStorage may be blocked (private mode, etc) — fall through.
    }
    setHydrated(true);
  }, []);

  // Persist mute changes.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(MUTE_STORAGE_KEY, muted ? '1' : '0');
    } catch {
      // ignore
    }
  }, [muted, hydrated]);

  // Configure volume + mute attribute on the audio element.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = VOLUME;
    audio.muted = muted;
  }, [muted]);

  // Pause on auth/onboarding routes, play otherwise. Browsers may
  // reject the play() promise (autoplay policy) — listen for the
  // first user gesture and retry.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const shouldPlay = !isMutedRoute(pathname);
    if (!shouldPlay) {
      audio.pause();
      return;
    }
    let cancelled = false;
    const tryPlay = (): void => {
      if (cancelled) return;
      void audio.play().catch(() => {
        // Autoplay blocked — wait for a user gesture and retry once.
        const retry = (): void => {
          window.removeEventListener('pointerdown', retry);
          window.removeEventListener('keydown', retry);
          void audio.play().catch(() => {
            // Still blocked (rare, e.g. iOS Lock Screen) — give up
            // silently. The mute toggle still lets the user start it
            // manually after another gesture.
          });
        };
        window.addEventListener('pointerdown', retry, { once: true });
        window.addEventListener('keydown', retry, { once: true });
      });
    };
    tryPlay();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const toggleMuted = useCallback(() => setMuted((m) => !m), []);

  // The button hides on routes where music doesn't play. No point
  // showing "mute" for silence.
  const showButton = useMemo(() => !isMutedRoute(pathname), [pathname]);

  return (
    <>
      <audio
        ref={audioRef}
        src={TRACK_SRC}
        loop
        // Use `autoPlay` so the browser tries on first mount; the JS
        // retry above handles the autoplay-policy rejection.
        autoPlay
        preload="auto"
        // The login form looks this up by attribute and calls play()
        // synchronously inside its submit handler so the user-gesture
        // grant carries from /login → /. See app/login/page.tsx.
        data-arcadia-ambient="true"
      />
      {showButton && (
        <button
          type="button"
          onClick={toggleMuted}
          aria-label={muted ? 'unmute ambient music' : 'mute ambient music'}
          title={muted ? 'unmute ambient music' : 'mute ambient music'}
          style={{
            position: 'fixed',
            bottom: 14,
            right: 14,
            zIndex: 50,
            width: 36,
            height: 36,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(20, 10, 5, 0.7)',
            border: '1px solid rgba(212, 165, 116, 0.45)',
            borderRadius: 6,
            color: 'var(--bronze-bright, #d4a868)',
            cursor: 'pointer',
            padding: 0,
            opacity: 0.7,
            transition: 'opacity 120ms ease-out, color 120ms ease-out',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
        >
          {muted ? <SpeakerMutedIcon /> : <SpeakerOnIcon />}
        </button>
      )}
    </>
  );
}

function SpeakerOnIcon(): React.JSX.Element {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" aria-hidden>
      <path
        d="M3 7.5H6L10 4V16L6 12.5H3C2.45 12.5 2 12.05 2 11.5V8.5C2 7.95 2.45 7.5 3 7.5Z"
        fill="currentColor"
      />
      <path
        d="M13 7C14.1 8 14.7 9.3 14.7 10C14.7 10.7 14.1 12 13 13"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M15.6 5C17.4 6.5 18.5 8.5 18.5 10C18.5 11.5 17.4 13.5 15.6 15"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function SpeakerMutedIcon(): React.JSX.Element {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" aria-hidden>
      <path
        d="M3 7.5H6L10 4V16L6 12.5H3C2.45 12.5 2 12.05 2 11.5V8.5C2 7.95 2.45 7.5 3 7.5Z"
        fill="currentColor"
      />
      <path
        d="M13 7L18 13M18 7L13 13"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </svg>
  );
}
