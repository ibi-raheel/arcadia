// Client-only simulation-aware fetcher. Pairs with `useSimulationMode`
// to return mock fixtures when the toggle is ON and real data when OFF.
//
// Server components use `fetch-or-mock-server.ts` instead — split into
// two modules because Next forbids `next/headers` (used by the server
// version) from appearing in any client bundle's dependency graph,
// even via dynamic import.

'use client';

import { useEffect, useState } from 'react';

import { useSimulationMode } from './simulation-mode';

type HookState<T> = {
  readonly data: T | null;
  readonly loading: boolean;
  readonly error: Error | null;
};

/**
 * Client hook. Flips source based on the simulation toggle. Re-runs
 * the real fetcher when the toggle flips off, so users get fresh data
 * the moment they turn sim off. Suspense-free on purpose — fetcher
 * errors surface on the `error` field so surfaces can show a scribe's
 * note.
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
    // Intentionally omit real + mock from deps: callers typically pass
    // inline functions / fresh fixtures on every render, which would
    // re-fire the effect. The hook is keyed on the toggle only.
  }, [sim]);

  return state;
}
