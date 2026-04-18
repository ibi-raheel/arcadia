import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Project refs of Supabase projects that must NEVER be targets for destructive
// tests. If TEST_SUPABASE_URL points at any of these, the suite aborts.
const PRODUCTION_PROJECT_REFS = ['eqbzltiasmuckgsapkye']; // arcadia (prod)

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

export interface TestEnv {
  url: string;
  anonKey: string;
  serviceKey: string;
}

export function loadTestEnvOrSkip(): TestEnv | null {
  const url = process.env.TEST_SUPABASE_URL;
  const anonKey = process.env.TEST_SUPABASE_ANON_KEY;
  const serviceKey = process.env.TEST_SUPABASE_SERVICE_KEY;

  if (!url || !anonKey || !serviceKey) {
    console.warn(
      '[rls tests] TEST_SUPABASE_{URL,ANON_KEY,SERVICE_KEY} missing — skipping RLS suite. ' +
        'Populate apps/web/.env.test.local (local) or GitHub Actions secrets (CI) to enable.',
    );
    return null;
  }

  for (const prodRef of PRODUCTION_PROJECT_REFS) {
    if (url.includes(prodRef)) {
      throw new Error(
        `[rls tests] TEST_SUPABASE_URL (${url}) points at a production project ref ` +
          `(${prodRef}). This suite creates and deletes users + realms — refusing to run ` +
          `against production. Use the arcadia-test project.`,
      );
    }
  }

  return { url, anonKey, serviceKey };
}

export function adminClient(env: TestEnv): SupabaseClient {
  return createClient(env.url, env.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function createTestUser(
  admin: SupabaseClient,
  email: string,
  password: string,
): Promise<TestUser> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`createTestUser(${email}) failed: ${error?.message ?? 'no user in response'}`);
  }
  return { id: data.user.id, email, password };
}

export async function deleteTestUser(admin: SupabaseClient, userId: string): Promise<void> {
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.warn(`[rls tests] deleteTestUser(${userId}) failed: ${error.message}`);
  }
}

export async function userAnonClient(env: TestEnv, user: TestUser): Promise<SupabaseClient> {
  const client = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error) {
    throw new Error(`signIn(${user.email}) failed: ${error.message}`);
  }
  return client;
}

// Unique suffix to keep concurrent CI runs + repeated local runs isolated.
export function runId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
