// Simulation mode — every data-fetching surface in Phase 8 reads through
// a `fetchOrMock` / `useFetchOrMock` helper that returns mock fixtures
// when sim is ON and real data when OFF. Toggle persistence is hybrid:
//
//   • localStorage is the client source of truth.
//   • `?sim=1` or `?sim=0` on the URL forces the value for that page load
//     and writes back to localStorage.
//   • A `sim` cookie mirrors localStorage so server components can read
//     the value during SSR — otherwise the initial render would flash
//     "real" data before the client hook reconciled.
//
// See ADR 0010 for the rationale.

'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'arcadia.sim';
const COOKIE_KEY = 'sim';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const CHANGE_EVENT = 'arcadia:sim-change';

function readUrlParam(): '1' | '0' | null {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const v = url.searchParams.get('sim');
  if (v === '1' || v === '0') return v;
  return null;
}

function readLocalStorage(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeLocalStorage(on: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (on) window.localStorage.setItem(STORAGE_KEY, '1');
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private mode / storage disabled — silently no-op. The cookie still
    // carries the flag for this session.
  }
}

function writeCookie(on: boolean): void {
  if (typeof document === 'undefined') return;
  const value = on ? '1' : '';
  const maxAge = on ? COOKIE_MAX_AGE : 0;
  document.cookie = `${COOKIE_KEY}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Client-side read. Consults `?sim=` first, then localStorage. Safe on
 * server — returns `false` if `window` is undefined. Server components
 * should use `isSimulationOnServer` (below) instead.
 */
export function isSimulationOnClient(): boolean {
  const urlOverride = readUrlParam();
  if (urlOverride === '1') return true;
  if (urlOverride === '0') return false;
  return readLocalStorage();
}

/**
 * Flip the toggle. Writes localStorage + cookie + dispatches a custom
 * event so every mounted `useSimulationMode` hook re-renders.
 */
export function setSimulation(on: boolean): void {
  writeLocalStorage(on);
  writeCookie(on);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: on }));
  }
}

/**
 * React hook. Returns [on, setOn]. Subscribes to the global change event
 * so flipping the toggle from one part of the tree updates every other.
 * Also re-reads the URL param on mount (in case the user navigated here
 * via a shared `?sim=1` link).
 */
export function useSimulationMode(): readonly [boolean, (on: boolean) => void] {
  const [on, setOn] = useState<boolean>(() => false);

  useEffect(() => {
    // On mount, read the URL first so `?sim=1` links work even if local
    // storage is off. If the URL sets a value, write it back so future
    // navigations remember.
    const urlOverride = readUrlParam();
    if (urlOverride !== null) {
      const value = urlOverride === '1';
      writeLocalStorage(value);
      writeCookie(value);
      setOn(value);
    } else {
      setOn(readLocalStorage());
    }

    const handler = (e: Event): void => {
      const detail = (e as CustomEvent<boolean>).detail;
      setOn(detail);
    };
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }, []);

  const toggle = useCallback((next: boolean) => setSimulation(next), []);
  return [on, toggle] as const;
}
