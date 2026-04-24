// Server-only simulation-aware fetcher. Use in React Server Components,
// server actions, and route handlers. For client components, use
// `useFetchOrMock` from `./fetch-or-mock.ts` instead.
//
// Split from the client entry point because `next/headers` (used
// transitively via simulation-mode-server.ts) cannot appear in any
// client bundle's dependency graph — not even through dynamic import,
// which Next webpack traces statically.

import { isSimulationOnServer } from './simulation-mode-server';

/**
 * Returns the mock when the `sim` cookie is set, otherwise the result
 * of the real fetcher.
 *
 * Usage:
 *   const courses = await fetchOrMock(() => loadCourses(), FIXTURE_COURSES);
 */
export async function fetchOrMock<T>(real: () => Promise<T>, mock: T): Promise<T> {
  if (await isSimulationOnServer()) return mock;
  return real();
}
