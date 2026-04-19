import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import { config as loadDotenv } from 'dotenv';

// Load .env.test.local (gitignored, user-provided) BEFORE the test process
// spawns children. Test suites hitting real Supabase read TEST_SUPABASE_*
// from process.env. In CI the same variable names come from GitHub secrets
// so no .env file is needed.
loadDotenv({ path: resolve(__dirname, '.env.test.local') });

export default defineConfig({
  test: {
    // Two test flavours live in this workspace:
    //   - `tests/**` — integration suites hitting real Supabase (see tests/helpers.ts)
    //   - `components/**`, `app/**`, `lib/**` — colocated unit tests, including
    //     per-scene `__tests__/*.test.ts` under components/game/scenes/ per ADR 0004
    include: [
      'tests/**/*.test.ts',
      'components/**/*.test.ts',
      'app/**/*.test.ts',
      'lib/**/*.test.ts',
      'middleware.test.ts',
    ],
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Tests that hit real Supabase must be single-threaded so admin user
    // creations and realm inserts don't race across files. Pessimistic
    // default for unit tests too; they're fast so it doesn't matter.
    fileParallelism: false,
  },
});
