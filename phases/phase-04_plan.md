## Phase 4 Plan: Market + Creator Analytics Dashboard

**Source:** `/docs/mvp/phase-plan.md` §Phase 4 (Week 11), `/docs/mvp/prd.md` §Market + §Creator Dashboard, `/docs/mvp/tad.md` §4.2 (scene map — Market stays React-only), §5.1 (enrolments + lesson_progress tables), §6.2 (RLS). This plan is executable; MVP docs are the contract.

**Goal:** A member opens `/market` and lands in a **Phaser "market hall"** (mirrors Tavern + Academy pattern): image-backed 1536×1024 interior, walkable avatar, one **stall** per published course. Walking up to or clicking a stall opens a **modal "stall view"** with a blurred Phaser canvas behind it — the member still feels "at the stall" while seeing the course's details, reading the description, and watching any `is_preview = true` lesson inline. An **Enrol** button in the modal inserts an `enrolments` row (Phase 3's `enrolment_self_insert` RLS already permits this) and redirects to `/academy/[courseId]`. Closing the modal returns the member to the market hall to walk to another stall. In parallel, a creator visits `/dashboard/courses/[courseId]/analytics` and sees three numbers per course: enrolment count, completion rate (% of enrolled members who've finished every lesson), and active-member count (distinct members with a `lesson_progress` upsert in the last 7 days).

Out of scope: payments (prices stored, never charged). Loved-by-users "wishlist" features (save-for-later, notifications). Phase 5 ownership: XP triggers, level-up flow, demo-ready polish pass.

---

### Pre-plan decisions — NEEDS USER CONFIRMATION

My rec below each row. Say **"approved as recommended"** or override per letter.

| # | Decision | Recommendation | Why |
|---|---|---|---|
| A | **Market page shape** | **Phaser scene** at `/market`. Mirrors `AcademyScene` exactly: image-backed 1536×1024 interior, walking local avatar, no Colyseus (single-player). One "stall" per published course — clickable interactive Rectangle, title label above, stock/price placeholder below. TAD §4.2 amended for Academy + Market both get scenes; Market detail is a modal overlay rather than a separate React route. | User picked this shape (2026-04-21). Matches the brick-and-mortar mental model ("walk up to a stall") and keeps the immersion continuous — no jarring page swap between Market hall and course detail. |
| B | **Entry from `/world`** | Same "building-entrance" zone machinery we already use for Tavern + Academy — overlap rect at the Market building's entrance tile, fade-to-black → `/market`. `BuildingTransition` overlay on mount. | Zero new conventions; phase plan says `/market` is a building like `/tavern` and `/academy`. |
| C | **Filter + sort controls** | Small **React HUD overlay** (top-right of the Phaser canvas): text search input + sort pill (`newest` default, `most-lessons`). Typing filters which stall gameobjects are visible (`setVisible(false)` on non-matches) — no re-render of the scene. Empty search restores all stalls. Matching is case-insensitive substring on title + description. | Keeps the walk-around vibe while making a 50-stall market practical. HUD overlays mirror the Tavern's chat bar pattern. |
| D | **Stall-open modal ("stall view")** | Clicking a stall (or walking up + pressing **E**) fires `MARKET_OPEN_STALL_EVENT` with the course id. React overlay mounts a modal `<StallView courseId>` on top of the Phaser canvas with a **blurred-backdrop** effect (`backdrop-blur-xl` + Phaser canvas blurred via CSS filter). Modal contents: course hero (thumbnail + title + description + creator name + enrolment count), section → lesson tree with `✓ free preview` flags, inline preview playback (see E), **Enrol** button (see F), X close button + Escape-to-close. URL updates to `/market?course=<id>` while the modal is open so the state is shareable; closing drops the param. | User's ask — "blurred edges background kind of showing he is navigating the stall." Modal-over-scene is cheaper than a dedicated route + keeps the stall scene warm so returning is instant. |
| E | **Free-preview playback** | Preview lessons render inline **inside the stall modal** (YouTube iframe for video, react-markdown for written) — same `VideoLessonViewer` + `WrittenLessonViewer` from `/academy/[courseId]`, gated on `is_preview = true`. Progress is **not tracked** for previews (no `lesson_progress` upsert). | Phase-plan: "Free preview lessons playable directly from Market detail view (no enrolment required)". Skipping progress keeps the preview path out of the analytics numbers. |
| F | **Enrol action** | Server action `enrolInCourse(courseId)`. Inserts `enrolments { realm_id: course.realm_id, course_id, member_id: auth.uid() }`. Idempotent. On success, close the modal + redirect to `/academy/[courseId]` so the member lands in their class library. No payment UI. | Phase-plan: "enrolment CTA (visible but inactive — no payments yet)". We make it functional-but-free; payments are Phase 6+. The redirect gives the "enrolment complete" feedback without needing a toast. |
| G | **Analytics page** | `/dashboard/courses/[courseId]/analytics`. Three stat cards + a tiny activity table. Queries: (1) `count(*)` on `enrolments WHERE course_id = ?` → enrolment count. (2) Derived "completion rate" — distinct `member_id` in `lesson_progress` who have a `completed=true` row for every lesson in the course, divided by enrolment count. (3) Distinct `member_id` in `lesson_progress` with `updated_at >= now() - 7d` for any lesson in the course → active-in-7d. | Three stats is the phase-plan §Phase 4 scope. Heavier BI (per-lesson drop-off, retention cohorts) slides to post-MVP. |
| H | **Analytics access gate** | Only the course's `creator_id` (or admin role) can view `/dashboard/courses/[courseId]/analytics`. Uses the same `assertOwner` pattern already in `app/dashboard/courses/[id]/actions.ts`. 404 for non-owners. | Symmetric with the rest of the dashboard — creators see their own data, nobody else's. |
| I | **Analytics data source** | **Service-role Supabase read** from a new server action, rather than the anon client. Reasoning: computing "distinct members who've completed every lesson" needs to see other members' `lesson_progress` rows, which RLS blocks from the anon path. We wrap it in a single server-side function and only the creator can call it (per decision H). | Keeps the RLS-tight stance on client-side reads; writes stay RLS-scoped. Alternative (SECURITY DEFINER RPC) adds a migration + more surface to audit; server-side admin read is simpler and auditable here. |
| J | **Phase-4 Supabase migration** | One migration `20260422000001_phase4_market_indexes.sql` — adds indexes used by the Market queries: `courses(realm_id, published, created_at DESC)` for the grid, `enrolments(course_id, member_id)` (already unique, might need a covering index for counts). No schema additions. RLS unchanged. | Performance hygiene. Catalogue queries are the first N-across-realm reads we've had; indexing early avoids a Phase-5 surprise. |
| K | **Home-hub Market entry** | Add a third card to `/` for **Browse the Market** — visible to everyone (members + creators). Links to `/market`. | Phase 4 is the first time Market is real; advertise it. |
| L | **Tests** | (1) New Vitest validator tests for `enrolInCourse` input guards + analytics helper (pure aggregation function). (2) New Playwright-less "route builds cleanly" check — just confirm the new routes render server-side in Next's build output. (3) No new RLS cases — `enrolment_self_insert` already covered by Phase-3 plan decision L's test set. | Matches Phase-3 test density. |
| M | **No payments** | CTA label says **"Enrol"** not **"Buy"**. `courses.price_cents` is rendered as a disabled "Free while in beta" badge where non-zero. | Aligns with phase-plan: "enrolment CTA (visible but inactive — no payments yet)". |

---

### Locked decisions (Phase 4)

| Decision | Value | Source |
|---|---|---|
| Routes | `/market` (Phaser scene, `?course=<id>` opens modal), `/dashboard/courses/[courseId]/analytics` (React) | phase-plan §Phase 4 + user 2026-04-21 |
| Folder convention | Phaser scene at `components/game/scenes/market/` mirroring `scenes/academy/`; React modal + HUD at `app/market/_components/`; analytics is pure React under `app/dashboard/courses/[id]/analytics/*`. TAD §4.2 now applies only to Market's course-detail surface (modal-over-scene), not the scene itself | TAD §4.2 (amended inline 2026-04-20 for Academy; 2026-04-21 for Market) |
| Market sort default | `created_at DESC` (newest first) | decision C |
| Free-preview threshold | `lessons.is_preview = true` (already in schema since Phase 0) | TAD §5.1 |
| Enrolment idempotency | Unique constraint `enrolments(course_id, member_id)` — already in place | Phase 0 migration |
| Analytics stat set | enrolment count, completion rate, active-in-7d | phase-plan §Phase 4 |

---

### Steps

#### Market (creator-agnostic, member-first)

1. **Migration `20260422000001_phase4_market_indexes.sql`** — add the Market-grid index (`courses(realm_id, published, created_at DESC)`). Apply to test + prod via Supabase SQL editor. Covering index on `enrolments` only if EXPLAIN on decision-G queries shows a seq scan; otherwise defer.
2. **Asset drop + boot manifest.** Copy user-supplied `market-interior.png` (1536×1024) to `public/`. Add `BOOT_ASSETS.marketInterior` + preload in `BootScene`.
3. **`scenes/market/` folder.** `MarketScene.ts` + `camera.config.ts` + `sprites.config.ts` + `layers.config.ts` + `CLAUDE.md` + `__tests__/configs.test.ts`. Mirror `scenes/academy/` shape — image-backed scene, local avatar (single-player), clickable stall rectangles.
4. **Stall rendering logic.** `MarketScene.renderStalls()` reads a `MARKET_STALLS_REGISTRY_KEY` array populated by the page server component. Each stall: Rectangle + Text label (course title) + Text label (stock / creator / enrolment count). Click → emit `MARKET_OPEN_STALL_EVENT`. Stall positions come from a grid layout in `sprites.config.ts` (same algorithm as academy podiums: 4 per row, wrap). Hidden by React HUD search.
5. **`app/market/page.tsx`.** Server component fetches `courses WHERE published = true AND realm_id IN (select user_realm_ids())` + caller's enrolments + per-course enrolment counts. Resolves creator display names via a join (RLS lets same-realm members read each other's memberships). Renders the client `GameMarket` with courses + an optional `?course=<id>` to open a specific stall on mount.
6. **`GameMarket.tsx`.** Phaser mount (single-player, same pattern as `GameAcademy`) + the React HUD overlay (search input, sort pill) + the stall modal renderer. Listens for `MARKET_OPEN_STALL_EVENT` and shows `<StallView>` on top.
7. **`StallView.tsx`.** Modal with `backdrop-blur-xl` backdrop, fixed-position, Escape to close. Contents: course hero, description, creator, enrolment count, section → lesson tree, inline preview playback (see step 8), **Enrol** CTA (see step 9). Updates URL to `/market?course=<id>` on open via `router.replace`; drops the param on close.
8. **Preview-mode viewer wiring.** Reuse `VideoLessonViewer` + `WrittenLessonViewer` with a new optional `previewOnly: boolean` prop; when true, the components skip the progress-tracking path (no `upsertLessonProgress` / `markLessonCompleted` / `setLessonDurationIfNull` calls).
9. **Enrol button + server action.** `enrolInCourse(courseId)` with realm + published guards. On success: close modal, `router.push('/academy/[courseId]')`.
10. **`/world` market entrance.** Wire the Market building tile overlap (Phase-1 invisible zone already in place) to route to `/market`. `BuildingTransition` overlay on mount inside `GameMarket`.
11. **Home hub card.** Append the third card on `/` — "Browse the Market" → `/market`.

#### Creator analytics

12. **Server action `fetchCourseAnalytics(courseId)`.** Owner-asserted. Uses service-role admin client via `@/lib/supabase/admin` to run the three stat queries in parallel. Returns `{ enrolmentCount, completionRate, activeInLastWeek, recentActivity[] }`.
13. **Pure aggregation helper.** Extract the "did this member complete every lesson in the course?" function as a pure helper and unit-test it with synthetic `lesson_progress` + `lessons` arrays.
14. **`/dashboard/courses/[courseId]/analytics` route.** Server component renders three stat cards + a "last 10 activity events" table (member display name, lesson title, action, timestamp). Creator-only; 404 for non-owners.
15. **Link from the course editor.** Add a small **Analytics** pill in `/dashboard/courses/[id]` header next to the Publish toggle.

#### Exit

16. **Smoke test (Part 1).** Creator publishes a course. Member visits `/market`, walks to the stall, clicks it, the modal opens with blurred backdrop + preview plays, clicks **Enrol**, lands on `/academy/[courseId]`, completes a lesson. Back in `/dashboard/courses/[id]/analytics`, the stats reflect the enrolment + completion.
17. **Smoke test (Part 2).** Open the Market as a member in a second realm — the stall should be invisible (no matching gameobject rendered). Enrol via direct URL manipulation (`?course=<other-realm-id>`) — the stall modal should render an error / 404, not the course, and any enrol attempt should 403 (RLS: published + same-realm guard on `enrolment_self_insert`).
18. **Docs close-out.** `phase-04_status.md` exit entry + changelog + README status-line bump.

---

### Test criteria (Phase 4 exit)

1. **Market hall** — `/market` renders the Phaser scene with one stall per published course in your realm. Avatar walks around.
2. **Search HUD** — Typing "abc" hides non-matching stall game-objects instantly; clearing restores all stalls.
3. **Stall modal** — Clicking a stall opens the `<StallView>` with blurred Phaser backdrop, course hero, section tree. URL is now `/market?course=<id>`. Escape or X closes + drops the param.
4. **Preview playback** — A `is_preview=true` lesson plays inside the modal (video or Markdown), and **no** `lesson_progress` row is written by previewing.
5. **Enrolment loop** — Clicking Enrol creates an `enrolments` row, redirects to `/academy/[courseId]`, and the course now appears in the Academy hall as a podium.
6. **Cross-realm isolation** — Direct-URL `/market?course=<other-realm-id>` does not show the stall (RLS blocks the course read); any enrol attempt 403s.
7. **Creator analytics** — After one member enrols + completes one lesson, the analytics page reflects `enrolmentCount = 1`, `completionRate = 0`, `activeInLastWeek = 1`.
8. **Permission checks** — Non-owner visiting `/dashboard/courses/[id]/analytics` gets a 404.
9. **CI green** — typecheck + lint + tests across all three workspaces. No new ESLint warnings.

---

### Risks / unknowns

1. **Analytics query performance.** "Has this member completed every lesson in the course?" is a nested `GROUP BY` + `HAVING` query. Small-course / small-enrolment scale is fine; could become slow past ~1000 enrolments. **Mitigation:** capture the query shape in a SQL comment + flag as a Phase-5 indexing candidate if it shows up in `pg_stat_statements` later.
2. **Preview playback without progress.** The `VideoLessonViewer` + `WrittenLessonViewer` components currently always upsert progress. A `previewOnly` prop adds a branch; easy to get wrong. **Mitigation:** extract the upsert-path decision to the top of each component's effect + early-return when `previewOnly` is true. Covered in step 8.
3. **Service-role read in analytics.** Decision I intentionally breaks the "client-side goes through anon RLS" rule for a single owner-asserted server action. **Mitigation:** document it inline (server-only module, never imported client-side), add a runtime check at the top of the action that re-verifies `user.id === course.creator_id` before the admin client fires.
4. **Stall layout at scale.** `sprites.config.ts` grid algorithm works fine for 4–20 stalls but will overflow the 1536×1024 interior past ~24. **Mitigation:** ship as-is; when we approach 24 stalls the solve is camera bounds expansion or a scrollable hall — easy to add. Phase-plan MVP scale is ~5 courses, so this isn't a pre-ship blocker.
5. **Stall modal + blurred backdrop perf.** `backdrop-filter: blur` on top of a live Phaser canvas can tank FPS on low-end browsers. **Mitigation:** first-pass uses `backdrop-blur-xl` on the modal's background layer (Tailwind). If it drags, swap to a one-shot CSS blur on the Phaser canvas element (`filter: blur(8px)`) during modal-open, which is cheaper but less crisp. Fallback is a solid dark overlay.
6. **Market building-entrance art.** The Market's entrance tile on the iso world is still the Phase-1 invisible placeholder. Phase 4 adds a route but not the visual — worth flagging but doesn't block Phase 4 exit. **Mitigation:** already on the backlog in `phase-02_polish_backlog.md`.
7. **Creator name on the stall label.** `memberships.display_name` may be `NULL` for creators who haven't set one. **Mitigation:** fall back to `"Anonymous Creator"` or the email prefix. Already a punt item in the polish backlog; resolve in this phase because Market surfaces it publicly.
8. **Enrolment realm bleed.** `enrolment_self_insert` policy only allows members of the course's realm to enrol. If we accidentally render courses from a different realm in the Market (which RLS should block anyway), the Enrol button clicks would 403. **Mitigation:** smoke test 17 explicitly covers this.

---

### What I need from you before starting

1. Approve or override decisions **A–M**. (Decisions A + D revised 2026-04-21 to Phaser scene + stall modal.)
2. Confirm the Market building entrance tile in the iso world is the correct one to wire — it's the third Phase-1 invisible overlap zone. Say **"same entrance as Phase 1"** or override with coords.
3. Confirm the Phase-4 prod migration timing — land the index migration alongside first `/market` deploy, or hold until after Step 11's smoke? Default: alongside, since it's a read-only index with no blast radius.
4. User-supplied `market-interior.png` (1536×1024) is already checked in at `apps/web/public/market-interior.png` — ready for `BOOT_ASSETS.marketInterior` registration in Step 2.

Once A–M + (2) + (3) are confirmed, Step 1 kicks off.
