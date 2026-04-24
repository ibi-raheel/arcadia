// `fetchOrMock` / `useFetchOrMock` — the single wrapper that every
// data-fetching surface in Phase 8 uses so the simulation toggle works
// consistently. `fetchOrMock` is for server components; the hook is for
// client. Both return the mock when simulation is ON and the real
// fetcher's result when OFF.

'use client';

import { useEffect, useState } from 'react';

import { useSimulationMode } from './simulation-mode';

/**
 * Server-component helper. Call with a real async fetcher and a fixture
 * of the same shape; get one of them back depending on the `sim` cookie.
 *
 * Usage:
 *   const courses = await fetchOrMock(() => loadCourses(), FIXTURE_COURSES);
 */
export async function fetchOrMock<T>(real: () => Promise<T>, mock: T): Promise<T> {
  // Dynamic import so this module stays client-compatible; server callers
  // resolve the server-only helper at request time. This is a no-op on
  // the client (where `fetchOrMock` should rarely be called — prefer the
  // hook below).
  if (typeof window === 'undefined') {
    const { isSimulationOnServer } = await import('./simulation-mode-server');
    if (await isSimulationOnServer()) return mock;
  }
  return real();
}

type HookState<T> = {
  readonly data: T | null;
  readonly loading: boolean;
  readonly error: Error | null;
};

/**
 * Client hook. Flips source based on the simulation toggle. Re-runs the
 * real fetcher when the toggle flips off, so users get fresh data the
 * moment they turn sim off. Suspense-free on purpose — fetcher errors
 * surface on the `error` field so surfaces can show a scribe's note.
 */
export function useFetchOrMock<T>(real: () => Promise<T>, mock: T): HookState<T> {
  const [sim] = useSimulationMode();
  const [state, setState] = useState<HookState<T>>(() => ({
    data: sim ? mock : null,
    loading: !sim,
    error: null,
  }));

  useEffect(() => {
    let cancelled = false;
    if (sim) {
      setState({ data: mock, loading: false, error: null });
      return () => {
        cancelled = true;
      };
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    real()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled)
          setState({
            data: null,
            loading: false,
            error: err instanceof Error ? err : new Error(String(err)),
          });
      });
    return () => {
      cancelled = true;
    };
    // Intentionally omit real + mock from deps: callers usually pass
    // inline functions / fresh fixtures on every render, which would
    // re-fire the effect. The hook is keyed on the toggle only.
  }, [sim]);

  return state;
}
