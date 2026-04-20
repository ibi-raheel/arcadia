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
| D | **Video player** | Cloudflare Stream's hosted player embed (`<iframe>` + `<stream>` web component) with signed URLs. Build our own HLS player only if the hosted one can't report accurate currentTime for resume. | CF Stream ships a production-ready player; building our own HLS is a rabbit hole. |
| E | **Markdown editor** | `@uiw/react-md-editor` (MIT, live preview built-in, ~40 kB gz). Rendering uses `react-markdown` + `rehype-highlight` for syntax highlighting. | Meets phase-plan "Markdown editor with preview"; widely used; zero build gymnastics. |
| F | **Thumbnail storage** | Supabase Storage bucket `course-thumbnails`, public-read, member-scoped upload policy. Max 2 MB, JPEG/PNG/WebP. | TAD §6.3 names Storage as the bucket host. Public-read is fine — thumbnails aren't secret. |
| G | **Video upload flow** | Browser-side TUS direct upload using `tus-js-client`. Next.js API `/api/stream/upload` mints the pre-signed CF Stream URL. Webhook at `/api/stream/webhook` (HMAC-verified) writes `cf_stream_id` + `duration_sec` to `lessons`. | TAD §4.4 specifies direct-to-CF to keep our origin out of the upload path. |
| H | **Progress write cadence** | On `video` lessons: fire `upsert lesson_progress { watched_secs, completed }` once every 10 s while playing + once on pause/close. Mark `completed=true` when `watched_secs >= 0.8 * duration_sec`. Written lessons: mark complete when the user scrolls past 90% of the page height. | Matches phase-plan §Week 10; 10 s debounce keeps Supabase writes light; page-scroll for written lessons is a clean "I read it" heuristic. |
| I | **Enrolment UX for Phase 3** | No UI. Seed one row via the Supabase MCP (or a `scripts/grant-enrolment.ts` one-shot) so the creator's test account has access to their own course. "Enrol" button lands in Phase 4's Market. | Phase-plan explicitly says "manually granted via `enrolments` inserts for demo" in Week 10. |
| J | **Creator previewing their own course** | `is_preview = TRUE` on any lesson bypasses enrolment check (matches schema from Phase 0). Additionally, a creator always has access to their own courses through an RLS clause `auth.uid() = courses.creator_id`. | Bypass via `is_preview` is already in the schema; creator-owns-course is natural and avoids a fake enrolment for the creator. |
| K | **Phase-3 Supabase migration** | One migration `20260421000001_phase3_courses_lessons_progress.sql`: confirms tables created in Phase 0 match the final PRD shape, adds any indexes we need (e.g. `lessons.section_id`, `lesson_progress(member_id, lesson_id)`), tightens RLS policies. Run on both `arcadia-test` and `arcadia` projects. | Phase 0 scaffolded the tables; Phase 3 is where their real-use indexes + RLS matter. |
| L | **Tests for RLS** | Extend `apps/web/tests/rls-cross-member-leakage.test.ts` with new cases: member A cannot read member B's `lesson_progress`, non-enrolled member cannot read non-preview lessons, creator can always read their own course. Three new integration tests. | Mirrors the Phase-2 pattern. Failure of any test gates merge. |
| M | **Webhook verification secret** | Use env var `CF_STREAM_WEBHOOK_SECRET` on the Vercel project. Verify HMAC-SHA256 per CF Stream docs. | Phase-0 planning mentions this env var; we just need to confirm it's set. |

---

### Locked decisions (Phase 3)

| Decision | Value | Source |
|---|---|---|
| Table layout | `courses / sections / lessons / lesson_progress / enrolments` per Phase 0 schema | TAD §5.1, `docs/mvp/tad.md` |
| Lesson types | `video` and `written` only in MVP | phase-plan §Week 9 |
| Video host | Cloudflare Stream, signed playback URLs | TAD §4.4 |
| Progress completion threshold | **80%** of `duration_sec` for video; scroll-to-90% for written | phase-plan §Week 10 |
| Resume | `lesson_progress.watched_secs` is the only source of truth; video player seeks to it on load | phase-plan §Week 10 |
| Course publish state | `courses.published` boolean — draft courses hidden from `/academy` list for non-creators | phase-plan §Week 9 |
| Storage bucket | `course-thumbnails` via Supabase Storage | decision F above |
| Routes | `/dashboard` (creator), `/dashboard/courses/[id]` (editor), `/academy` (member grid), `/academy/[courseId]` (viewer) | phase-plan §§Week 9, 10 |
| Folder convention | Pure React — no Phaser. Academy is a standard Next.js page per TAD §4.2 ("`/academy` and `/market` never get a Phaser scene") | TAD §4.2 |

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
8. **Video-lesson editor.** File picker → `/api/stream/upload` returns pre-signed TUS URL + `cf_stream_id` placeholder → client uploads via `tus-js-client` with a progress bar → on completion, server writes `cf_stream_id` to `lessons`. Webhook `/api/stream/webhook` writes `duration_sec` when CF Stream finishes transcoding.
9. **RLS test suite extension.** Three new integration tests in `rls-cross-member-leakage.test.ts` per decision L. Must pass before migration lands on prod.
10. **Publish/draft toggle.** `courses.published` boolean; toggle button in editor header.

Exit criteria Week 9: A creator creates a course with one section containing one video lesson and one written lesson in `arcadia-test`. Toggling Publish surfaces it in a placeholder `/academy` list (built properly in Week 10).

#### Week 10 — Course viewer (member side)

11. **`/academy` route.** Server component lists courses where either (a) member is enrolled via `enrolments`, or (b) course is published and creator == auth.uid(). Grid of thumbnail cards.
12. **`/academy/[courseId]` route.** Hierarchical tree of sections + lessons. Completed lessons (`lesson_progress.completed = true`) marked with a checkmark. Click opens the lesson viewer inline (no route change, just URL hash or query).
13. **Video lesson viewer.** Server route `/api/stream/token/[lessonId]` mints a signed CF Stream URL (JWT-based per CF docs). `<stream>` web component embed with `currentTime` initialized from `lesson_progress.watched_secs`.
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

1. **CF Stream account readiness.** TAD §4.4 and phase-plan §Phase 0 list CF Stream as provisioned, but I haven't personally verified the account has `CF_STREAM_WEBHOOK_SECRET` set in Vercel, nor that the signed-URL flow works end-to-end. **Mitigation:** Step 0 (pre-Week 9) is a 15-min smoke: create a test video in the CF dashboard, mint a signed URL via a local curl script, confirm it plays. If the account isn't there, we unblock that before touching code.
2. **TUS direct upload CORS.** CF Stream typically handles CORS on their side, but if the Vercel preview domain isn't whitelisted, uploads 404. **Mitigation:** catch at Step 8 on a preview deploy; fallback is to proxy through Next.js API (slower but works).
3. **Webhook local testing.** CF Stream posts webhooks to a public URL; localhost can't receive them. **Mitigation:** use Vercel preview URLs for all webhook development — CF Stream can point at the preview domain. Already our workflow per the Phase-2 deploy-debugging saga.
4. **`@uiw/react-md-editor` + Next.js SSR.** Rich-text editors often need dynamic-import-SSR-disabled to avoid hydration mismatches. **Mitigation:** use `dynamic(() => import('@uiw/react-md-editor'), { ssr: false })` — matches the pattern already in use for `GameWorld.tsx` / `GameTavern.tsx`.
5. **Progress upsert write amplification.** Ten writes per video lesson is fine for 20 concurrent members but adds up. **Mitigation:** none needed at Phase-3 scale; flag for Phase 5 if Supabase row-write billing becomes visible.
6. **Cross-creator course isolation.** With decision A (any member can create courses), one creator's draft course shouldn't leak to another's `/dashboard`. RLS clause `creator_id = auth.uid()` on `SELECT` handles this — make sure the migration in Step 1 enforces it.

---

### What I need from you before starting

1. Approve or override the A–M pre-plan decisions above.
2. Confirm the CF Stream account state (or defer to Step 0 smoke test — I'll surface any blocker before Week 9).
3. Confirm the `/dashboard` route name — happy with `/dashboard`, or prefer `/create` / `/studio` / something else?

Once those three are answered, Step 1 begins.
