// Removes the `load-NN@arcadia.test` users seeded by loadtest.ts. Same
// prod-ref guard as loadtest.ts — refuses to run against production.
//
// Usage:
//   TEST_SUPABASE_URL=... TEST_SUPABASE_SERVICE_KEY=... npm run loadtest:teardown

import { createClient } from '@supabase/supabase-js';

const PROD_SUPABASE_REF = 'eqbzltiasmuckgsapkye';
const LOAD_USER_PREFIX = 'load-';
const LOAD_USER_DOMAIN = '@arcadia.test';

async function main(): Promise<void> {
  const supabaseUrl = process.env.TEST_SUPABASE_URL;
  const serviceKey = process.env.TEST_SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error('missing TEST_SUPABASE_URL or TEST_SUPABASE_SERVICE_KEY');
    process.exit(2);
  }
  if (supabaseUrl.includes(PROD_SUPABASE_REF)) {
    console.error(`refusing to run — TEST_SUPABASE_URL points at production ref ${PROD_SUPABASE_REF}`);
    process.exit(2);
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(`listUsers: ${error.message}`);

  const targets = data.users.filter(
    (u) => u.email?.startsWith(LOAD_USER_PREFIX) && u.email.endsWith(LOAD_USER_DOMAIN),
  );
  console.log(`[teardown] found ${targets.length} load-test users`);

  for (const user of targets) {
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) {
      console.error(`  delete ${user.email}: ${delErr.message}`);
    } else {
      console.log(`  deleted ${user.email}`);
    }
  }
}

main().catch((err) => {
  console.error('[teardown] crashed:', err);
  process.exit(1);
});
