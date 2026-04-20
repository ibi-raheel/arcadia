# Phase 3 — Setup guide

One thing to set up before Step 2 of Week 9 can begin:

1. Apply the Phase-3 Supabase migration.

**That's it** — no new services, no new accounts, no new env vars. The video host is YouTube unlisted (ADR 0006, demo-only scope) which needs zero credentials. When we reach Week 9 Step 8 you'll upload a test video to your own YouTube channel and paste its URL into the lesson editor.

This guide walks through the migration in detail (section by section) and then the YouTube workflow (at the bottom, for reference when you need it).

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

### §2 — YouTube columns on lessons

```sql
alter table public.lessons
  add column if not exists youtube_video_id text
    check (youtube_video_id is null or length(youtube_video_id) = 11);

alter table public.lessons
  add column if not exists duration_sec integer
    check (duration_sec is null or duration_sec >= 0);
```

**Why:** ADR 0006 picks YouTube unlisted for the demo (see the scope caveat in the ADR itself). We need two bits of info per video lesson: the 11-char YouTube video ID (the asset pointer) and the duration in seconds (for the 80%-watched completion threshold).

**What it does:**

- `youtube_video_id` — text, nullable. Nullable because `written`-type lessons don't have one. Length-11 check rejects junk (pasted URLs, trimmed IDs, partial input). YouTube IDs are drawn from `[A-Za-z0-9_-]{11}`; the length check is a cheap sanity guard.
- `duration_sec` — integer, nullable. Captured via `player.getDuration()` on first successful load (see Week 9 Step 13 in the plan). Nullable for written lessons and for video lessons pre-first-load.
- Phase 0's `cf_stream_id` column stays in place, unused. Reserved for the eventual swap to a real video host (ADR 0006 exit criteria).

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

## Part 3 — YouTube unlisted workflow

Per ADR 0006 the MVP uses YouTube unlisted videos. **Zero credentials, zero env vars, zero new accounts.** The flow is: creator uploads to their own YouTube channel, marks the video Unlisted, pastes the URL into the Arcadia lesson editor, done.

### Step 1 — What you need (whenever, not now)

A YouTube channel on a Google account of your choice. If you already have a Google account, you already have a channel — YouTube auto-creates one on first upload. Nothing to set up in advance.

### Step 2 — Upload a video and set it Unlisted

When you reach Week 9 Step 8 (building the video-lesson editor), you'll want one test video to exercise the flow. Workflow:

1. Go to `https://studio.youtube.com` → sign in.
2. Click **Create** (top right) → **Upload videos**.
3. Pick any short clip (a 10-second screen recording works — we only care that it plays).
4. While uploading, fill in the details:
   - Title: `Arcadia test — <short description>`.
   - Description: optional; note "Arcadia MVP test video" for your own tracking.
   - Audience: **"No, it's not made for kids"**.
5. Click **Next** through the "Video elements" and "Checks" screens.
6. On the **Visibility** screen, select **Unlisted**. **Not Public. Not Private.**
7. Click **Save**. Copy the share URL that appears — looks like `https://youtu.be/dQw4w9WgXcQ` or `https://www.youtube.com/watch?v=dQw4w9WgXcQ`.

That 11-char suffix (`dQw4w9WgXcQ` in the example above) is the `youtube_video_id` column value. Our editor UI will parse any of the three URL shapes.

### Step 3 — How the lesson editor uses the URL (Week 9 Step 8)

Server-side parser (one file):

```ts
// apps/web/lib/youtube.ts  (Week 9 Step 8)

// Matches the three YouTube URL shapes + bare 11-char IDs.
// Returns the 11-char ID, or null on malformed input.
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const URL_PATTERNS: RegExp[] = [
  /youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/,
  /youtu\.be\/([A-Za-z0-9_-]{11})/,
  /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
];

export function parseYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (YOUTUBE_ID.test(trimmed)) return trimmed;
  for (const pattern of URL_PATTERNS) {
    const m = trimmed.match(pattern);
    if (m) return m[1];
  }
  return null;
}
```

Editor UI (sketch):

```tsx
// apps/web/components/academy/VideoLessonEditor.tsx  (Week 9 Step 8)
'use client';
import { useState } from 'react';
import { parseYouTubeId } from '@/lib/youtube';

export function VideoLessonEditor({ lessonId, initialVideoId }) {
  const [raw, setRaw] = useState(initialVideoId ?? '');
  const [videoId, setVideoId] = useState(initialVideoId ?? null);
  const [error, setError] = useState<string | null>(null);

  const parse = () => {
    const id = parseYouTubeId(raw);
    if (!id) return setError('Not a valid YouTube URL or ID.');
    setError(null);
    setVideoId(id);
    // Upsert to lessons.youtube_video_id via server action (omitted).
  };

  return (
    <div>
      <input value={raw} onChange={e => setRaw(e.target.value)}
             placeholder="https://youtu.be/..." />
      <button onClick={parse}>Parse</button>
      {error && <p className="text-red-500">{error}</p>}
      {videoId && (
        <iframe
          width="560" height="315"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`}
          allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
          allowFullScreen />
      )}
    </div>
  );
}
```

### Step 4 — How the viewer uses the IFrame Player API (Week 10 Step 13)

Viewer component (sketch):

```tsx
// apps/web/components/academy/VideoLessonPlayer.tsx  (Week 10 Step 13)
'use client';
import { useEffect, useRef } from 'react';

declare global { interface Window { YT: any; onYouTubeIframeAPIReady?: () => void } }

export function VideoLessonPlayer({ lessonId, videoId, startSec, durationSec, onProgress }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load the IFrame API once.
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }

    const createPlayer = () => {
      const player = new window.YT.Player(hostRef.current, {
        videoId,
        playerVars: { start: Math.floor(startSec), rel: 0, modestbranding: 1, iv_load_policy: 3 },
        events: {
          onReady: () => {
            // If we don't have a duration yet, capture it now.
            if (!durationSec) onProgress({ kind: 'duration', value: player.getDuration() });
          },
          onStateChange: (e: any) => {
            // state: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
            if (e.data === 1) {
              // Start a 10s poll while playing.
              const id = setInterval(() => {
                onProgress({ kind: 'watched', value: player.getCurrentTime() });
              }, 10_000);
              (player as any)._pollId = id;
            } else if ((player as any)._pollId) {
              clearInterval((player as any)._pollId);
              (player as any)._pollId = null;
              onProgress({ kind: 'watched', value: player.getCurrentTime() });
            }
          },
        },
      });
    };

    if (window.YT?.Player) createPlayer();
    else window.onYouTubeIframeAPIReady = createPlayer;
  }, [videoId, lessonId]);

  return <div ref={hostRef} />;
}
```

Parent component owns the upsert logic — `onProgress` fires → debounced server action → Supabase upsert of `lesson_progress { watched_secs, completed }`.

### Step 5 — Privacy + scope hygiene

- **Always set Unlisted, never Public.** Public videos show up in search, Related, and on the channel homepage.
- **Don't mention Arcadia in the video title / description** more than necessary. Titles surface in Google searches even for unlisted videos if someone links the URL publicly.
- **Use a dedicated YouTube channel** if you want to keep demo content separate from personal videos. Creating a new channel under the same Google account takes 30 seconds: `studio.youtube.com` → profile menu → "Add channel".
- **ADR 0006 exit criteria:** if we cross 30 min of total stored demo content, or a non-team creator uploads, or any payments land → swap to a real host before continuing.

---

## Summary — what you need to do next

1. Open Supabase SQL editor, paste the migration, run it. **[you]**
2. Verify new columns exist (`youtube_video_id`, `duration_sec`, `creator_id`). **[you]**
3. Optionally delete the 106 orphan rows in arcadia-test. **[you]**
4. Ping me when done. Then I start Week 9 Step 2 (Supabase Storage bucket `course-thumbnails`). **[me]**
5. (Whenever — no rush) upload an unlisted test video to your YouTube channel for Week 9 Step 8. **[you]**
