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
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Tests hit real Supabase — keep single-threaded so admin user creations
    // and realm inserts don't race across files.
    fileParallelism: false,
  },
});
