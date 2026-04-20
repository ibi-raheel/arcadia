## Phase 3 Plan: Academy

**Source:** `/docs/mvp/phase-plan.md` §Phase 3 (Weeks 9–10), `/docs/mvp/prd.md` §Academy, `/docs/mvp/tad.md` §4.4 (video delivery), §5.1 (data model — courses/sections/lessons/lesson_progress/enrolments), §6.2 (RLS), §6.3 (Storage buckets). This plan is the executable doc; the MVP docs are the contract.

**Goal:** A creator signs in, opens `/dashboard`, creates a course with a title/description/thumbnail, adds one section containing one video lesson (uploaded directly to Cloudflare Stream via signed TUS URL) and one written lesson (Markdown), publishes it, and grants themselves an enrolment row. As a member, the same user opens `/academy`, sees the course, opens the course page, watches the video to 80% (progress bar reaches 100% for that lesson), reads the written lesson, navigates away, and on re-entry the video resumes from the last watched second. All at 60 FPS.

Out of scope for Phase 3: payments, Market grid, creator analytics dashboard, course discovery (Phase 4), XP awards on lesson completion (Phase 5).

---

### Pre-plan decisions — NEEDS USER CONFIRMATION before execution

These are the knobs I need you to lock before I start Week 9 Step 1. My recommendation is listed; say "approved as recommended" or override each.

| # | Decision | Recommendation | Why |
|---|---|---|---|
| A | **Creator gate** | Any authed member can visit `/dashboard` and create courses in Phase 3. Role-based gating lands in Phase 4. | Unblocks Phase-3 demo; avoids a `memberships.role` schema addition that would slip into ADR territory this week. |
| B | **Course builder UX shape** | Two-pane single page: left rail = section/lesson tree with drag handles, right pane = selected lesson editor. No multi-step wizard. | Matches creator-dashboard mockups in PRD §Academy; single page keeps state management simple; drag-to-reorder is cheaper with `@dnd-kit` than a wizard. |
| C | **Drag-and-drop library** | `@dnd-kit/core` + `@dnd-kit/sortable`. Add to `/apps/web`. | Modern, accessible, no jQuery baggage, works cleanly with React 18 / Next 14. Permissively licensed. |
| D | **Video player** | **Cloudinary Video Player** (`cld-video-player`, MIT-licensed video.js wrapper). HLS adaptive bitrate + accurate `currentTime` for resume, fed a signed Cloudinary delivery URL. | Cloudinary replaces CF Stream (free tier, no card — see note after the table). Their player handles HLS out of the box. |
| E | **Markdown editor** | `@uiw/react-md-editor` (MIT, live preview built-in, ~40 kB gz). Rendering uses `react-markdown` + `rehype-highlight` for syntax highlighting. | Meets phase-plan "Markdown editor with preview"; widely used; zero build gymnastics. |
| F | **Thumbnail storage** | Supabase Storage bucket `course-thumbnails`, public-read, member-scoped upload policy. Max 2 MB, JPEG/PNG/WebP. | TAD §6.3 names Storage as the bucket host. Public-read is fine — thumbnails aren't secret. |
| G | **Video upload flow** | Browser-side direct upload to Cloudinary. Next.js API `/api/cloudinary/sign-upload` returns an HMAC upload signature (server-side using `CLOUDINARY_API_SECRET`). Browser POSTs to `https://api.cloudinary.com/v1_1/<cloud>/video/upload` with the signed params + file. On success the response carries `public_id`, `duration`, `secure_url` — client writes `cloudinary_public_id` + `duration_sec` to `lessons`. No webhook needed; a notification URL stays available if we want async confirmation later. | Direct upload keeps our origin out of the upload path; the signed-params flow is Cloudinary's recommended pattern and avoids a card on file. |
| H | **Progress write cadence** | On `video` lessons: fire `upsert lesson_progress { watched_secs, completed }` once every 10 s while playing + once on pause/close. Mark `completed=true` when `watched_secs >= 0.8 * duration_sec`. Written lessons: mark complete when the user scrolls past 90% of the page height. | Matches phase-plan §Week 10; 10 s debounce keeps Supabase writes light; page-scroll for written lessons is a clean "I read it" heuristic. |
| I | **Enrolment UX for Phase 3** | No UI. Seed one row via the Supabase MCP (or a `scripts/grant-enrolment.ts` one-shot) so the creator's test account has access to their own course. "Enrol" button lands in Phase 4's Market. | Phase-plan explicitly says "manually granted via `enrolments` inserts for demo" in Week 10. |
| J | **Creator previewing their own course** | `is_preview = TRUE` on any lesson bypasses enrolment check (matches schema from Phase 0). Additionally, a creator always has access to their own courses through an RLS clause `auth.uid() = courses.creator_id`. | Bypass via `is_preview` is already in the schema; creator-owns-course is natural and avoids a fake enrolment for the creator. |
| K | **Phase-3 Supabase migration** | One migration `20260421000001_phase3_courses_lessons_progress.sql`: confirms tables created in Phase 0 match the final PRD shape, adds `lessons.cloudinary_public_id text` + `lessons.duration_sec integer` columns (keep Phase-0's `cf_stream_id` column nullable and unused; drop it in Phase 4 after we're sure Cloudinary stays), adds indexes (`lessons.section_id`, `lesson_progress(member_id, lesson_id)`), tightens RLS policies. Run on both `arcadia-test` and `arcadia` projects. | Phase 0 scaffolded the tables; Phase 3 is where their real-use indexes + RLS matter. |
| L | **Tests for RLS** | Extend `apps/web/tests/rls-cross-member-leakage.test.ts` with new cases: member A cannot read member B's `lesson_progress`, non-enrolled member cannot read non-preview lessons, creator can always read their own course. Three new integration tests. | Mirrors the Phase-2 pattern. Failure of any test gates merge. |
| M | **Cloudinary env vars** | `CLOUDINARY_CLOUD_NAME` (public, safe to prefix `NEXT_PUBLIC_`) + `CLOUDINARY_API_KEY` (server-only) + `CLOUDINARY_API_SECRET` (server-only). Set on Vercel project for all three environments. User creates account + generates keys before Step 2 of Week 9. | Signature-based upload is the only credential-bearing flow; no webhook secret needed for the MVP path. |

---

### Locked decisions (Phase 3)

| Decision | Value | Source |
|---|---|---|
| Table layout | `courses / sections / lessons / lesson_progress / enrolments` per Phase 0 schema | TAD §5.1, `docs/mvp/tad.md` |
| Lesson types | `video` and `written` only in MVP | phase-plan §Week 9 |
| Video host | **Cloudinary** (free tier — 25 credits/month shared across storage + bandwidth + transforms), signed delivery URLs. CF Stream deferred indefinitely (see "Out-of-plan decision" below). | amended 2026-04-20 |
| Progress completion threshold | **80%** of `duration_sec` for video; scroll-to-90% for written | phase-plan §Week 10 |
| Resume | `lesson_progress.watched_secs` is the only source of truth; video player seeks to it on load | phase-plan §Week 10 |
| Course publish state | `courses.published` boolean — draft courses hidden from `/academy` list for non-creators | phase-plan §Week 9 |
| Storage bucket | `course-thumbnails` via Supabase Storage | decision F above |
| Routes | `/dashboard` (creator), `/dashboard/courses/[id]` (editor), `/academy` (member grid), `/academy/[courseId]` (viewer) | phase-plan §§Week 9, 10 |
| Folder convention | Pure React — no Phaser. Academy is a standard Next.js page per TAD §4.2 ("`/academy` and `/market` never get a Phaser scene") | TAD §4.2 |

**Out-of-plan decision (2026-04-20):** TAD §4.4 names Cloudflare Stream as the video host. We're deviating to **Cloudinary** for Phase 3 because CF Stream has no free tier and requires a card on file. This should be captured as a new ADR at Step 1 of Week 9 (`planning/decisions/0006_2026-04-20_video-host-cloudinary-for-mvp.md`). The ADR records: why (free tier, no card), what's preserved (signed-URL pattern, direct-upload flow, HLS delivery), and the swap-back path (replace `cloudinary_public_id` with `cf_stream_id` and re-wire the upload + player — 1-day task if we ever outgrow the free tier).

---

### Steps

#### Week 9 — Course builder (creator side)

1. **Phase 0 schema audit + Phase 3 migration.** Read current shape of `courses/sections/lessons/lesson_progress/enrolments` in `arcadia-test` via Supabase MCP. Write migration `20260421000001_phase3_courses_lessons_progress.sql` — indexes, RLS policy tightening per decision L. Apply to `arcadia-test` first, smoke-test. Apply to `arcadia` prod only after Step 9's RLS tests pass.
2. **Supabase Storage bucket `course-thumbnails`.** Create bucket; public-read policy; member-scoped insert policy (`auth.uid() IS NOT NULL`). 2 MB size limit enforced client-side; mime whitelist server-side.
3. **`/dashboard` route + course list.** Server-component fetch of `courses WHERE creator_id = auth.uid()`. "Create course" button opens a modal with title + description + thumbnail-upload. Insert row, redirect to editor.
4. **Course editor shell (`/dashboard/courses/[id]`).** Two-pane layout per decision B. Left rail = tree of sections + their lessons; right pane = empty placeholder until a lesson is selected.
5. **Add/remove/reorder sections.** `@dnd-kit/sortable` for the rail. Server actions for insert/delete/reorder (`order_index` column on `sections`). Optimistic updates in the client.
6. **Add/remove/reorder lessons within a section.** Same pattern. New lesson defaults to `written` type; editor swaps based on type.
7. **Written-lesson editor.** `@uiw/react-md-editor` in the right pane, bound to `lessons.content_md`. Autosave every 2 s on edit (debounced).
8. **Video-lesson editor.** File picker → `/api/cloudinary/sign-upload` returns signed params (timestamp + folder + public_id + signature) → client POSTs the file directly to Cloudinary's unauthenticated `/video/upload` endpoint with those params + a progress-tracking `fetch` or XHR. Response carries `public_id`, `duration`, `secure_url`, `eager[]` (HLS variants if configured). Client writes `cloudinary_public_id` + `duration_sec` to `lessons`. Cap upload size 500 MB client-side. Decision: request `eager_async: true` + an `eager` HLS transformation at upload time so the adaptive bitrate URL is ready by first play.
9. **RLS test suite extension.** Three new integration tests in `rls-cross-member-leakage.test.ts` per decision L. Must pass before migration lands on prod.
10. **Publish/draft toggle.** `courses.published` boolean; toggle button in editor header.

Exit criteria Week 9: A creator creates a course with one section containing one video lesson and one written lesson in `arcadia-test`. Toggling Publish surfaces it in a placeholder `/academy` list (built properly in Week 10).

#### Week 10 — Course viewer (member side)

11. **`/academy` route.** Server component lists courses where either (a) member is enrolled via `enrolments`, or (b) course is published and creator == auth.uid(). Grid of thumbnail cards.
12. **`/academy/[courseId]` route.** Hierarchical tree of sections + lessons. Completed lessons (`lesson_progress.completed = true`) marked with a checkmark. Click opens the lesson viewer inline (no route change, just URL hash or query).
13. **Video lesson viewer.** Server route `/api/video/sign/[lessonId]` mints a signed Cloudinary delivery URL with ~1 hour TTL (HMAC-SHA256 of `public_id`+expiry using `CLOUDINARY_API_SECRET`; or Cloudinary's `utils.signed_url()` helper if we pull in the SDK). `cld-video-player` web component embeds the HLS URL with `currentTime` initialized from `lesson_progress.watched_secs`.
14. **Progress tracking — video.** `timeupdate` → debounced (10 s) upsert `lesson_progress { watched_secs, completed }`. `completed` flips true when `watched_secs >= 0.8 * duration_sec`. One final upsert on page unload via `navigator.sendBeacon`.
15. **Written lesson viewer.** Render `lessons.content_md` via `react-markdown` + `rehype-highlight`. Intersection Observer on a sentinel at ~90% scroll → upsert `lesson_progress { completed: true }`.
16. **Course progress bar.** `completed_count / total_count` per course, derived from a SQL view or a client-side aggregation. Displayed at the top of the course page and on the `/academy` card.
17. **Enrolment seeding.** `scripts/grant-enrolment.ts` one-shot that writes an `enrolments` row for a given member/course. Used to give the creator access to their own course for demo (though decision J's RLS clause may make this unnecessary — leave the script in for Phase 4 use regardless).
18. **Smoke test.** Creator publishes a course with one video + one written lesson. Member (same user, two browsers OK) opens `/academy`, watches video to 80% + scrolls the written lesson; both mark complete. Close + reopen → video resumes from the last watched second.

Exit criteria Week 10: phase-plan §Phase 3 exit criterion passes end-to-end on `arcadia-test` first, then on prod.

---

### Test criteria (Phase 3 exit)

1. **Creator flow** — Create course + section + video lesson (real upload to CF Stream, transcoded, playable) + written lesson (real Markdown, rendered). Publish. All under 5 min for a small lesson (<200 MB video).
2. **Member flow** — Open `/academy`, open course, video plays from signed URL, seeks to `watched_secs` on reload, marks complete at 80%. Written lesson marks complete on scroll.
3. **Resume** — `watched_secs` persists across tab close. Playback resumes within 500 ms of player mount.
4. **RLS** — All three new tests pass: cross-member `lesson_progress` isolated, non-enrolled member can't read non-preview lessons, creator reads their own course.
5. **60 FPS** — No frame drops in `/academy/[courseId]`. (Trivial since no Phaser, but assert browser DevTools Performance panel is clean.)
6. **CI green** — typecheck + lint + tests across all three workspaces. No ESLint warnings introduced.

---

### Risks / unknowns

1. **Cloudinary account + credentials.** User action before Step 2 of Week 9: (a) create a free Cloudinary account, (b) copy cloud name + API key + API secret into Vercel env vars (Development + Preview + Production), (c) confirm the free-tier plan is active (no card on file). **Mitigation:** Step 0 smoke = upload a tiny test mp4 via the Cloudinary dashboard, generate a signed URL via their API explorer, confirm it plays in a browser. 15 min.
2. **Free-tier ceiling.** 25 credits/month is generous for a demo but could be blown by repeated test uploads. **Mitigation:** delete test uploads aggressively during development; monitor usage in the Cloudinary dashboard; set a folder convention (`arcadia/test/` vs `arcadia/prod/`) so demo content is separable. If we hit the ceiling mid-demo, the swap-back path to Supabase Storage (raw MP4, no adaptive) is <1 day of work.
3. **Direct-upload CORS.** Cloudinary's `/video/upload` endpoint is CORS-open by default but can be locked in the account's Upload settings. **Mitigation:** verify at Step 8 on a preview deploy; fallback is to proxy through Next.js API (slower but works).
4. **`@uiw/react-md-editor` + Next.js SSR.** Rich-text editors often need dynamic-import-SSR-disabled to avoid hydration mismatches. **Mitigation:** use `dynamic(() => import('@uiw/react-md-editor'), { ssr: false })` — matches the pattern already in use for `GameWorld.tsx` / `GameTavern.tsx`.
5. **Progress upsert write amplification.** Ten writes per video lesson is fine for 20 concurrent members but adds up. **Mitigation:** none needed at Phase-3 scale; flag for Phase 5 if Supabase row-write billing becomes visible.
6. **Cross-creator course isolation.** With decision A (any member can create courses), one creator's draft course shouldn't leak to another's `/dashboard`. RLS clause `creator_id = auth.uid()` on `SELECT` handles this — make sure the migration in Step 1 enforces it.

---

### What I need from you before starting

**All pre-plan decisions A–M approved 2026-04-20** (with D + G + K + M amended to Cloudinary after the user flagged CF Stream had no free tier).

User actions still pending before Step 2 of Week 9:

1. Create a free Cloudinary account (no card required).
2. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` on the Vercel project for all three environments.
3. Confirm the free-tier plan is active.

I'll surface any other account-state blockers during Week 9 Step 0 smoke test. Step 1 (schema audit + ADR 0006 for the Cloudinary swap) begins on your go-ahead — doesn't need Cloudinary yet.
