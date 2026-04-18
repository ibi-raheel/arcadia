// Vitest workspace — matches per-workspace vitest configs as they are added.
// When an app or package gets a vitest.config.ts, it is picked up automatically.
// Until then, `vitest run` is a no-op (no projects, no failure).
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'apps/*/vitest.config.ts',
  'apps/*/vitest.config.mts',
  'packages/*/vitest.config.ts',
  'packages/*/vitest.config.mts',
]);
