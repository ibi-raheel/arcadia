#!/usr/bin/env tsx
/**
 * Phase 3 Week 10 Step 17 — one-shot enrolment seed.
 *
 * Usage:
 *   npm run grant-enrolment -- <member-email> <course-id>
 *   # or:
 *   tsx apps/web/scripts/grant-enrolment.ts <member-email> <course-id>
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL    — Supabase project URL
 *   SUPABASE_SERVICE_KEY        — service-role key (bypasses RLS)
 *
 * Inserts a row into `enrolments` for the named member and course,
 * using the course's realm_id. Idempotent — the unique constraint
 * (course_id, member_id) makes duplicate runs a no-op.
 */

import { createClient } from '@supabase/supabase-js';

const PROD_PROJECT_REFS = ['eqbzltiasmuckgsapkye']; // arcadia prod

function fatal(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const [emailArg, courseIdArg] = process.argv.slice(2);
  if (!emailArg || !courseIdArg) {
    fatal('usage: grant-enrolment <member-email> <course-id>');
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) {
    fatal('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  }

  const isProd = PROD_PROJECT_REFS.some((ref) => url.includes(ref));
  if (isProd && process.env.ALLOW_PROD !== '1') {
    fatal(
      'refusing to run against prod without ALLOW_PROD=1 in the env. ' +
        'Re-run with ALLOW_PROD=1 if you really mean it.',
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Resolve member_id from email.
  const { data: userList, error: userErr } = await admin.auth.admin.listUsers();
  if (userErr) fatal(`listUsers failed: ${userErr.message}`);
  const user = userList.users.find((u) => u.email?.toLowerCase() === emailArg.toLowerCase());
  if (!user) fatal(`no user found with email ${emailArg}`);

  // Look up course + its realm_id.
  const { data: course, error: courseErr } = await admin
    .from('courses')
    .select('id, realm_id, title, published')
    .eq('id', courseIdArg)
    .maybeSingle();
  if (courseErr) fatal(`course lookup failed: ${courseErr.message}`);
  if (!course) fatal(`no course with id ${courseIdArg}`);

  // Idempotent insert — unique on (course_id, member_id).
  const { error: insertErr } = await admin.from('enrolments').insert({
    realm_id: course.realm_id,
    course_id: course.id,
    member_id: user.id,
  });
  if (insertErr && !/duplicate key/i.test(insertErr.message)) {
    fatal(`enrolment insert failed: ${insertErr.message}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        already_enrolled: !!insertErr,
        course_id: course.id,
        course_title: course.title,
        published: course.published,
        member_id: user.id,
        member_email: user.email,
      },
      null,
      2,
    ),
  );
}

void main();
