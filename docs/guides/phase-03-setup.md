# Phase 3 — Setup guide

Two things to set up before Step 2 of Week 9 can begin:

1. Apply the Phase-3 Supabase migration.
2. Create a free Cloudinary account and wire its three credentials into Vercel.

This guide walks both in detail. Read it start-to-finish once; after that it's a reference.

---

## Part 1 — Apply the Phase-3 migration

The migration file is committed at:

```
apps/web/supabase/migrations/20260421000001_phase3_courses_lessons_progress.sql
```

It's not yet applied to `arcadia-test` or `arcadia` (prod). Our Supabase MCP is pinned read-only per ADR 0002, so **you** apply it — Claude can't run writes from this environment. Two paths; use whichever feels comfortable.

### Option A — Supabase dashboard (recommended, fastest)

1. Open `https://supabase.com/dashboard/project/idxgcrwikmcuqrrxbogj/sql` — that's the arcadia-test SQL editor.
2. Open the migration file in your editor. Copy its entire contents.
3. Paste into the SQL editor. Click **Run**.
4. Expected output: "Success. No rows returned." (or a count of policy changes).
5. Verify — still in the SQL editor, run:
   ```sql
   select column_name, data_type, is_nullable
   from information_schema.columns
   where table_schema='public' and table_name='lessons'
   order by ordinal_position;
   ```
   You should see `cloudinary_public_id` (text, YES) and `duration_sec` (integer, YES) in the list.
6. Optional cleanup of the 106 orphan rows (arcadia-test only):
   ```sql
   delete from public.lessons;
   delete from public.sections;
   delete from public.courses;
   ```

### Option B — Supabase CLI

If you already have the `supabase` CLI logged in and the project linked:

```bash
cd apps/web
supabase db push --project-ref idxgcrwikmcuqrrxbogj
```

This applies any migrations that haven't run on the remote yet.

### When to apply to prod (arcadia / `eqbzltiasmuckgsapkye`)

**Not yet.** Prod gets the migration only after:

- The Phase-3 RLS test suite (planned Week-9 Step 9) is written and green on arcadia-test.
- A full creator-flow smoke test passes on a Vercel preview connected to arcadia-test.

When that time comes, same steps as above but against the `eqbzltiasmuckgsapkye` project.

---

## Part 2 — What each chunk of the migration does

The migration file is split into seven numbered sections. Here's the plain-English version of each. Open the `.sql` file alongside this if you want to follow the code.

### §1 — Ownership column on courses

```sql
alter table public.courses
  add column if not exists creator_id uuid references auth.users(id) on delete set null;

create index if not exists courses_creator_idx
  on public.courses(creator_id)
  where creator_id is not null;
```

**Why:** Phase 0 didn't ship a `creator_id` column on `courses`. Without it, we can't scope the `/dashboard` list to "my courses", can't write creator-only RLS policies, and drafts would leak across creators.

**What it does:**

- Adds a nullable `creator_id` column referencing `auth.users.id`. Nullable because arcadia-test has 106 legacy rows from load / seed runs with no owner. They'll stay orphaned (invisible to any creator-scoped policy) until the optional cleanup.
- `on delete set null` — if a user account is deleted, their courses don't disappear, they just become orphaned. Prod consideration for the far future.
- Partial index on `creator_id WHERE NOT NULL` — makes `/dashboard` list queries (`WHERE creator_id = auth.uid()`) fast; doesn't index the orphaned rows.

### §2 — Cloudinary columns on lessons

```sql
alter table public.lessons
  add column if not exists cloudinary_public_id text;

alter table public.lessons
  add column if not exists duration_sec integer
    check (duration_sec is null or duration_sec >= 0);
```

**Why:** ADR 0006 picks Cloudinary over CF Stream. Cloudinary's upload response gives us a `public_id` (the asset identifier used in every subsequent URL) and a `duration` in seconds. We store both.

**What it does:**

- `cloudinary_public_id` — text, nullable. Nullable because `written`-type lessons don't have one.
- `duration_sec` — integer, nullable. `check` guard rejects accidental negative values. Also nullable for written lessons and for video lessons between upload-start and upload-complete.
- Phase 0's `cf_stream_id` column is left in place, unused. ADR 0006's swap-back path uses it if we ever migrate off Cloudinary.

### §3 — Creator-scoped write policies on courses

```sql
drop policy if exists course_creator_insert on public.courses;
create policy course_creator_insert
  on public.courses
  for insert
  to authenticated
  with check (
    creator_id = auth.uid()
    and realm_id in (select user_realm_ids())
  );
-- (plus update, delete, and a rewritten select)
```

**Why:** Phase 0 shipped only a SELECT policy on `courses`. A creator trying to INSERT a course would get a 403 under RLS.

**What it does:**

- **INSERT:** lets an authenticated user create a course, but only one they own (`creator_id = auth.uid()`) in their own realm.
- **UPDATE / DELETE:** same ownership check.
- **Rewritten SELECT (`course_member_read`):** shows published courses in the user's realm (existing Phase-0 behaviour) PLUS their own drafts. Non-owners still can't see unpublished courses.

### §4 — Section policies inherit from courses

**Why:** Phase 0's `section_member_read` policy was `course_id IN (SELECT id FROM courses)` — effectively "any section of any course", because the nested SELECT isn't filtered. Permissive shim from early scaffolding.

**What it does:**

- Rewrites the read policy so sections follow the parent course's rules: visible only if the parent course is also visible to you.
- Adds creator-scoped INSERT / UPDATE / DELETE so the course editor can add/remove sections on courses you own.

### §5 — Lesson policies — creator bypass + writes

**Why:** Phase 0's `lesson_access` checked `is_preview OR enrolled-in-course`. A creator editing their own drafts without an enrolment row couldn't read their lessons. Also no INSERT policy existed.

**What it does:**

- Adds a third OR clause to the SELECT: "the course belongs to you". So a creator always sees their own lessons, preview or not, enrolled or not.
- Adds creator-scoped INSERT / UPDATE / DELETE.

### §6 — Enrolment write policies

**Why:** Phase 0 shipped only `enrolment_self_read`. Writes went through service-role. For the Phase-4 Market "Enrol" button to work via RLS, clients need to insert enrolment rows themselves.

**What it does:**

- `enrolment_creator_insert` — a creator can insert an enrolment row for anyone into a course they own. Useful for the Phase-3 demo (grant yourself access to your own course) and for Phase 4 "invite" flows.
- `enrolment_self_insert` — an authenticated user can enrol themselves in any **published** course in their **own realm**. Both guards are critical: no enrolling in unpublished drafts, no cross-realm leakage.

### §7 — Column comments

`comment on column …` — stores human-readable descriptions in Postgres' catalog. Visible in the Supabase dashboard column inspector, in `psql \d+ table`, and through the Supabase MCP's verbose table list. Free documentation for anyone inspecting the schema later.

---

## Part 3 — Cloudinary setup

Cloudinary is our MVP video host (per ADR 0006). Three credentials; they wire into our code via three env vars.

### Step 1 — Create the account

1. Go to `https://cloudinary.com/users/register_free`.
2. Sign up with the arcadia email. No credit card required.
3. Pick any cloud name at signup — this is yours forever (can't rename without contacting support). Something like `arcadia` or `ibi-raheel-arcadia`. Write it down.
4. Confirm email. You'll land on the dashboard.

### Step 2 — Grab the three credentials

From the dashboard home, look at the **Account Details** panel (upper right of the main screen):

| Dashboard label | Env var | What it is | Where it's safe to use |
|---|---|---|---|
| **Cloud name** | `CLOUDINARY_CLOUD_NAME` | Your account namespace. Appears in every delivery URL (`res.cloudinary.com/<cloud-name>/...`). | **Safe in browser** — prefix `NEXT_PUBLIC_` if you want it accessible client-side. |
| **API Key** | `CLOUDINARY_API_KEY` | Identifies your account when making API calls. | **Server-only.** Don't ship to browsers. |
| **API Secret** | `CLOUDINARY_API_SECRET` | The shared secret used to sign upload + delivery URLs. | **Server-only, never committed.** Treat like a database password. |

To reveal the API Secret, click the eye icon next to it. Copy all three.

### Step 3 — Wire them into Vercel

Via the Vercel MCP or dashboard, add the three vars to the `arcadia-web` project (all three environments — Development, Preview, Production):

```
CLOUDINARY_CLOUD_NAME        = <your cloud name>
CLOUDINARY_API_KEY           = <your key>
CLOUDINARY_API_SECRET        = <your secret>
```

Via dashboard: `https://vercel.com/<team>/arcadia-web/settings/environment-variables` → Add → check all three environment boxes → Save.

Via CLI:
```bash
cd apps/web
vercel env add CLOUDINARY_CLOUD_NAME
vercel env add CLOUDINARY_API_KEY
vercel env add CLOUDINARY_API_SECRET
```

Also add them to your local `apps/web/.env.local` if you plan to run `npm run dev` against Cloudinary (same three lines, plain text, don't commit).

### Step 4 — How they connect to our code (Week 9 Step 8 onwards)

Three code paths will use these credentials:

**Upload signing (server-side — `/api/cloudinary/sign-upload`):**

```ts
// apps/web/app/api/cloudinary/sign-upload/route.ts  (Week 9 Step 8)
import crypto from 'node:crypto';

export async function POST() {
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `arcadia/${crypto.randomUUID()}`;
  const folder = 'arcadia';

  // Cloudinary signs the alphabetised params joined with & then HMAC-SHA1
  // with the API Secret appended. See Cloudinary docs: "Generating
  // authentication signatures".
  const paramsToSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash('sha1')
    .update(paramsToSign + process.env.CLOUDINARY_API_SECRET)
    .digest('hex');

  return Response.json({
    timestamp,
    signature,
    api_key: process.env.CLOUDINARY_API_KEY,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    public_id: publicId,
    folder,
  });
}
```

Browser flow:

```ts
// apps/web/components/academy/VideoUploader.tsx  (Week 9 Step 8)
const signed = await fetch('/api/cloudinary/sign-upload', { method: 'POST' }).then(r => r.json());
const form = new FormData();
form.append('file', file);
form.append('timestamp', signed.timestamp);
form.append('signature', signed.signature);
form.append('api_key', signed.api_key);
form.append('public_id', signed.public_id);
form.append('folder', signed.folder);
const res = await fetch(
  `https://api.cloudinary.com/v1_1/${signed.cloud_name}/video/upload`,
  { method: 'POST', body: form },
).then(r => r.json());
// res.public_id, res.duration, res.secure_url now available
```

**Delivery signing (server-side — `/api/video/sign/[lessonId]`):**

```ts
// apps/web/app/api/video/sign/[lessonId]/route.ts  (Week 10 Step 13)
import crypto from 'node:crypto';

const ONE_HOUR = 3600;

export async function GET(req, { params }) {
  const lesson = await fetchLesson(params.lessonId);
  const expiresAt = Math.floor(Date.now() / 1000) + ONE_HOUR;

  // Cloudinary's signed-URL format embeds the signature in the path.
  // Format: https://res.cloudinary.com/<cloud>/video/authenticated/s--<sig>--/<public_id>.m3u8
  const toSign = `${lesson.cloudinary_public_id}.m3u8#${expiresAt}`;
  const signature = crypto
    .createHash('sha256')
    .update(toSign + process.env.CLOUDINARY_API_SECRET)
    .digest('base64url')
    .slice(0, 16);

  const url =
    `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}` +
    `/video/authenticated/s--${signature}--` +
    `/${lesson.cloudinary_public_id}.m3u8`;

  return Response.json({ url, expiresAt });
}
```

**Player (browser — `cld-video-player`):**

```tsx
// apps/web/components/academy/VideoLessonPlayer.tsx  (Week 10 Step 13)
'use client';
import { useEffect } from 'react';

export function VideoLessonPlayer({ signedUrl, startSec }) {
  useEffect(() => {
    import('cloudinary-video-player'); // dynamic import, no SSR
  }, []);
  return (
    // @ts-expect-error — web component, not typed by default
    <cld-video-player
      cloud-name={process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}
      source-types="hls"
      public-id={signedUrl}
      current-time={startSec}
    />
  );
}
```

### Step 5 — Free-tier hygiene

Once you're uploading, keep these in mind:

- **Folder convention.** Upload test videos to `arcadia/test/` (by passing `folder: "arcadia/test"` in the sign-upload params). Delete them aggressively via the Cloudinary Media Library. Prod uploads go to `arcadia/prod/`.
- **Budget monitor.** Dashboard → Usage. 25 credits = 25 GB storage OR 25 GB bandwidth OR 25,000 image transforms (shared pool). A few test uploads and playbacks shouldn't come close. Set a calendar reminder for the 28th of the month to verify you're under 20 credits.
- **If we blow the ceiling.** Cloudinary rate-limits rather than bills — uploads + deliveries start returning 403. Swap-back path is documented in ADR 0006 (~1 day of work).

---

## Summary — what you need to do next

1. Open Supabase SQL editor, paste the migration, run it. **[you]**
2. Verify new columns exist (`cloudinary_public_id`, `duration_sec`, `creator_id`). **[you]**
3. Optionally delete the 106 orphan rows in arcadia-test. **[you]**
4. Create Cloudinary account, grab Cloud Name + API Key + API Secret. **[you]**
5. Set all three env vars in Vercel for all three environments + in `apps/web/.env.local`. **[you]**
6. Ping me when done. Then I start Week 9 Step 2 (Supabase Storage bucket `course-thumbnails`). **[me]**
