// Persistent ambient music — plays on loop everywhere the user is
// post-auth. Mounted as a sibling to `{children}` in the root layout
// (`apps/web/app/layout.tsx`) so the `<audio>` element survives every
// client-side navigation: walking from `/world` → `/dashboard` →
// `/coworking/inside` doesn't restart the track.
//
// **Algorithm (rewritten 2026-05-02 after a "starts paused / mute
// doesn't toggle / autoplays on its own" round of bugs):**
//
// We follow the **YouTube pattern**: muted-autoplay is universally
// allowed by browsers, audible-autoplay is not. So we always start
// the audio element muted-and-playing. The user's *intent* is the
// `userMuted` state (persisted in localStorage). The actual audible
// output is gated on two things:
//   1. The browser has user activation (the user has interacted with
//      the page at least once — required by Chrome/Safari autoplay
//      policy to start audible playback).
//   2. `userMuted === false` (the user has not toggled mute off).
//
// `effectiveMuted = userMuted || !activated`. The `<audio>` element's
// `muted` property tracks this; it flips to `false` only when both
// conditions hold. One useEffect drives play/pause + mute together so
// state can't desync.
//
// **Why the previous version misbehaved:**
//   - `<audio autoPlay>` and a JS `play()` retry both raced; the
//     retry's `{ once: true }` listener could miss an iframe-only
//     click and never fire again.
//   - `userMuted` defaulted to `false` and was hydrated from
//     localStorage in a separate effect — there was a render frame
//     where the audio was unmuted, briefly playing loud, before the
//     mute kicked in.
//   - Multiple useEffects updated `audio.muted` from different deps
//     and could fight each other when the mute button was clicked
//     during the autoplay-retry window.
//
// **Behaviour now:**
//   - Pauses on /login, /signup, /onboarding/* (pre-world flows).
//   - Always starts muted on first mount (no audible flash).
//   - First user click anywhere → unmutes, if `userMuted === false`.
//   - Mute button toggles `userMuted`; the audio element follows
//     synchronously via the unified effect.
//   - localStorage-persisted mute preference; carries across reloads.
//   - Tiny mute toggle anchored bottom-right at z-index 95 (above
//     the DashboardOverlay + MarketOverlay at 80 + their action
//     clusters at 90; also above scenes/HUDs).

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

export function AmbientMusic(): React.JSX.Element | null {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pathname = usePathname() ?? '/';

  /** True when this component is mounted inside an iframe — the
   *  in-world `DashboardOverlay` loads `/dashboard` in an iframe,
   *  which means root-layout components like AmbientMusic mount a
   *  *second* time inside the iframe. The parent page already owns
   *  the audio element + the mute button, so we bail entirely
   *  inside iframes to avoid (a) two audio elements both trying
   *  to play and (b) a duplicate mute button at the iframe's
   *  bottom-right. Mirrors the same iframe-bail in
   *  `<SimulationPill />`. */
  const [inIframe, setInIframe] = useState(false);

  /** User's mute *intent*. Hydrated from localStorage post-mount.
   *  Initial `false` means "the user wants music" — but the audio
   *  stays silent until `activated` flips, so there's no audible
   *  flash if their stored preference is actually muted. */
  const [userMuted, setUserMuted] = useState(false);

  /** True once the page has received its first user gesture
   *  (Chrome's "user activation"). Required for audible playback. */
  const [activated, setActivated] = useState(false);

  // Detect iframe context on mount. Runs once; if true, the
  // component returns null below and skips every other effect.
  useEffect(() => {
    try {
      setInIframe(window.parent !== window);
    } catch {
      // Cross-origin parent access throws — that's still an iframe.
      setInIframe(true);
    }
  }, []);

  // Hydrate userMuted from localStorage. Deferred to useEffect
  // because SSR can't read localStorage; the audio element starts
  // muted regardless, so a stale `false` here is harmless.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(MUTE_STORAGE_KEY);
      if (stored === '1') setUserMuted(true);
    } catch {
      // localStorage may be blocked (private mode, etc) — fall through.
    }
  }, []);

  // Persist userMuted changes. No-op on the initial false → false
  // hydration pass; only writes when the user actually toggles.
  useEffect(() => {
    try {
      window.localStorage.setItem(MUTE_STORAGE_KEY, userMuted ? '1' : '0');
    } catch {
      // ignore
    }
  }, [userMuted]);

  // Detect first user gesture. After it fires, audible playback is
  // allowed. We listen at the capture phase on `document` so even
  // clicks inside iframes-from-the-same-origin fire it (the only
  // real edge case here is the dashboard overlay iframe, where a
  // click inside doesn't bubble to window — capture-on-document does
  // catch it). One-shot.
  useEffect(() => {
    if (activated) return;
    const handler = (): void => {
      setActivated(true);
    };
    document.addEventListener('pointerdown', handler, { once: true, capture: true });
    document.addEventListener('keydown', handler, { once: true, capture: true });
    return () => {
      document.removeEventListener('pointerdown', handler, true);
      document.removeEventListener('keydown', handler, true);
    };
  }, [activated]);

  const shouldPlayRoute = !isMutedRoute(pathname);
  // Audio is silent unless the user wants sound AND the page has
  // received user activation. This matches what browsers will
  // actually allow.
  const effectiveMuted = userMuted || !activated;

  // Single effect drives the audio element. Re-runs whenever the
  // route's play-eligibility, the effective mute state, or the
  // element ref change. No racing with the `<audio autoPlay>` HTML
  // attribute because we don't use one — JS owns the state.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = VOLUME;
    audio.muted = effectiveMuted;
    if (!shouldPlayRoute) {
      audio.pause();
      return;
    }
    // play() on a muted element is always allowed. play() on an
    // audible element requires user activation — we already gate
    // `effectiveMuted` on that, so by the time we ever call play()
    // unmuted, the page has activation.
    void audio.play().catch(() => {
      // Extremely rare: even muted play() rejected (iOS Lock
      // Screen, certain Safari edge cases). Don't loop — when the
      // user gestures next, `activated` flips and this effect
      // re-runs.
    });
  }, [shouldPlayRoute, effectiveMuted]);

  const toggleMuted = useCallback((): void => {
    // Toggling counts as a user gesture, so flip both state slots
    // in one go. `setActivated(true)` is idempotent if already true.
    setActivated(true);
    setUserMuted((m) => !m);
  }, []);

  // The button hides on routes where music doesn't play. No point
  // showing "mute" for silence.
  const showButton = useMemo(() => !isMutedRoute(pathname), [pathname]);

  // Iframe bail (parent page already owns the audio + button).
  if (inIframe) return null;

  return (
    <>
      <audio
        ref={audioRef}
        src={TRACK_SRC}
        loop
        preload="auto"
        // Start muted via the HTML attribute too, so the very first
        // paint is muted even before our effect runs. Our effect
        // overrides it once it commits — but having it muted in JSX
        // means we never hit the "unmuted-during-hydration" flash
        // even if the effect schedules late.
        muted
        // The login form looks this up by attribute and calls play()
        // synchronously inside its submit handler so the user-gesture
        // grant carries from /login → /. See app/login/page.tsx.
        data-arcadia-ambient="true"
      />
      {showButton && (
        <button
          type="button"
          onClick={toggleMuted}
          aria-label={userMuted ? 'unmute ambient music' : 'mute ambient music'}
          title={userMuted ? 'unmute ambient music' : 'mute ambient music'}
          style={{
            position: 'fixed',
            bottom: 14,
            right: 14,
            zIndex: 95,
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
          {userMuted ? <SpeakerMutedIcon /> : <SpeakerOnIcon />}
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
