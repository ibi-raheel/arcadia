// Server-side simulation-mode read. Kept separate from `simulation-mode.ts`
// because that module is `'use client'` and Next throws if a server file
// imports it. This one reads the `sim` cookie synchronously via
// `next/headers` and is safe in RSC / server actions / route handlers.

import { cookies } from 'next/headers';

/** Reads the `sim` cookie. Mirrors the client-side localStorage. */
export async function isSimulationOnServer(): Promise<boolean> {
  const c = await cookies();
  return c.get('sim')?.value === '1';
}
