## Phase 4 Plan: Market + Creator Analytics Dashboard

**Source:** `/docs/mvp/phase-plan.md` §Phase 4 (Week 11), `/docs/mvp/prd.md` §Market + §Creator Dashboard, `/docs/mvp/tad.md` §4.2 (scene map — Market stays React-only), §5.1 (enrolments + lesson_progress tables), §6.2 (RLS). This plan is executable; MVP docs are the contract.

**Goal:** A member opens `/market`, sees every published course across their realm as a card grid with thumbnail / title / description / lesson count. They can filter (by text search + sort by newest) and open a course detail page that lists sections + lessons, flags any `is_preview = true` lesson as "free preview", and offers an **Enrol** button for courses they aren't enrolled in. Clicking Enrol inserts an `enrolments` row (Phase 3's `enrolment_self_insert` RLS already permits this) and redirects to `/academy/[courseId]`. In parallel, a creator visits `/dashboard/courses/[courseId]/analytics` and sees three numbers per course: enrolment count, completion rate (% of enrolled members who've finished every lesson), and active-member count (distinct members with a `lesson_progress` upsert in the last 7 days).

Out of scope: payments (prices stored, never charged). Loved-by-users "wishlist" features (save-for-later, notifications). Phase 5 ownership: XP triggers, level-up flow, demo-ready polish pass.

---

### Pre-plan decisions — NEEDS USER CONFIRMATION

My rec below each row. Say **"approved as recommended"** or override per letter.

| # | Decision | Recommendation | Why |
|---|---|---|---|
| A | **Market page shape** | Server-rendered React grid at `/market`, same pattern as the original `/academy` list (which is now Phase 3.5 Phaser). Thumbnail cards wrap 1/2/3 columns responsively. Cards link to `/market/[courseId]`. No Phaser. | Mirrors how the user tests course discovery on a laptop — Phaser overhead unjustified for browsing. Symmetry with the `/world` hub that routes you here via a building entrance. |
| B | **Entry from `/world`** | Same "building-entrance" zone machinery we already use for Tavern + Academy — overlap rect at the Market building's entrance tile, fade-to-black → `/market`. BuildingTransition overlay on mount. | Zero new conventions; phase plan says `/market` is a building like `/tavern` and `/academy`. |
| C | **Filter + sort controls** | Client-side over a server-fetched list. Search is substring match (case-insensitive) on title + description. Sort: `newest` (default, `created_at DESC`) or `most-lessons`. Use a `useState` + `useMemo` pattern; no server re-fetch on every keystroke. | For <100 courses per realm at MVP scale, client-side is cheaper + instant. Swap to server when the catalogue grows. |
| D | **Course detail page** | `/market/[courseId]` server component. Shows: thumbnail hero, title, description, creator display name, enrolment count (derived from `enrolments` count), section → lesson tree (lessons show `✓ free preview` flag where applicable, no content visible unless enrolled), Enrol button if not enrolled. RLS already allows the enrolment insert and the course read. | Matches phase-plan §Phase 4 "course detail view". |
| E | **Free-preview playback** | Preview lessons render inline on `/market/[courseId]` (YouTube iframe for video, react-markdown for written) — same viewer components as `/academy/[courseId]`, guarded by `is_preview = true`. Progress **is not tracked** for previews (no `lesson_progress` upsert). | Phase-plan explicitly: "Free preview lessons playable directly from Market detail view (no enrolment required)". Skipping progress keeps the preview path out of the completion analytics. |
| F | **Enrol action** | Server action `enrolInCourse(courseId)`. Inserts `enrolments { realm_id: course.realm_id, course_id, member_id: auth.uid() }`. Idempotent — unique constraint makes re-clicks a no-op. On success, redirect to `/academy/[courseId]`. No payment UI. | Phase-plan: "course detail view … enrolment CTA (visible but inactive — no payments yet)". We make it functional-but-free; payments are Phase 6+. |
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
| Routes | `/market`, `/market/[courseId]`, `/dashboard/courses/[courseId]/analytics` | phase-plan §Phase 4 |
| Folder convention | React only under `app/market/*` and `app/dashboard/courses/[id]/analytics/*`; no Phaser | TAD §4.2 (amended inline 2026-04-20 for Academy but Market stays React) |
| Market sort default | `created_at DESC` (newest first) | decision C |
| Free-preview threshold | `lessons.is_preview = true` (already in schema since Phase 0) | TAD §5.1 |
| Enrolment idempotency | Unique constraint `enrolments(course_id, member_id)` — already in place | Phase 0 migration |
| Analytics stat set | enrolment count, completion rate, active-in-7d | phase-plan §Phase 4 |

---

### Steps

#### Market (creator-agnostic, member-first)

1. **Migration `20260422000001_phase4_market_indexes.sql`** — add the Market-grid index (`courses(realm_id, published, created_at DESC)`). Apply to test + prod via Supabase SQL editor. Covering index on enrolments only if EXPLAIN on decision-G queries shows a seq scan; otherwise defer.
2. **`/market` route.** Server component fetches `courses WHERE published = true AND realm_id IN (select user_realm_ids())` ordered by `created_at DESC`. Also fetches caller's `enrolments.course_id` list so cards can show "Enrolled" / "Preview" states.
3. **`MarketGrid.tsx` client component.** Text search + sort controls, responsive card grid, per-card "Enrolled" / "Free preview" / "Enrol" status pill.
4. **`/market/[courseId]` route.** Server component: course detail (hero + creator name + enrolment count) + section → lesson tree with `is_preview` flagging.
5. **Free-preview viewer.** Inline on the detail page. Reuse `VideoLessonViewer` + `WrittenLessonViewer` from Phase 3, but pass a flag that disables the `upsertLessonProgress` path for previews.
6. **Enrol button + server action.** `enrolInCourse(courseId)` with realm / published / ownership guards. On success redirect to `/academy/[courseId]`.
7. **`/world` market entrance.** Wire the Market building tile overlap (already exists as a Phase-1 invisible zone) to route to `/market`. Add `BuildingTransition` mount on `/market`.
8. **Home hub card.** Append the third card on `/` — "Browse the Market" → `/market`.

#### Creator analytics

9. **Server action `fetchCourseAnalytics(courseId)`.** Owner-asserted. Uses service-role admin client via `@/lib/supabase/admin` to run the three stat queries in parallel. Returns `{ enrolmentCount, completionRate, activeInLastWeek, recentActivity[] }`.
10. **Pure aggregation helper.** Extract the "did this member complete every lesson in the course?" function as a pure helper and unit-test it with synthetic `lesson_progress` + `lessons` arrays.
11. **`/dashboard/courses/[courseId]/analytics` route.** Server component renders three stat cards + a "last 10 activity events" table (member display name, lesson title, action, timestamp). Creator-only; 404 for non-owners.
12. **Link from the course editor.** Add a small **Analytics** pill in `/dashboard/courses/[id]` header next to the Publish toggle.

#### Exit

13. **Smoke test (Part 1).** Creator publishes a course. Member visits `/market`, sees the card, clicks it, watches the free-preview lesson, clicks **Enrol**, lands on `/academy/[courseId]`, completes a lesson. Back in `/dashboard/courses/[id]/analytics`, the stats reflect the enrolment + completion.
14. **Smoke test (Part 2).** Open the Market as a member in a second realm — the course should be invisible. Enrol via direct URL manipulation — should 403 (RLS: published + same-realm guard on `enrolment_self_insert`).
15. **Docs close-out.** `phase-04_status.md` exit entry + changelog + README status-line bump.

---

### Test criteria (Phase 4 exit)

1. **Market browse** — `/market` lists all published courses in your realm, with working search + sort.
2. **Course detail + preview** — `/market/[courseId]` shows course content structure. A preview lesson plays inline without creating progress rows.
3. **Enrolment loop** — Clicking Enrol creates an `enrolments` row, redirects to `/academy/[courseId]`, and the course now appears in `/academy`.
4. **Cross-realm isolation** — Direct-URL enrol attempt against a course in a different realm returns a clean error (RLS-gated). Verified in tests too.
5. **Creator analytics** — After one member enrols + completes one lesson, the analytics page reflects `enrolmentCount = 1`, `completionRate = 0` (haven't completed all), `activeInLastWeek = 1`.
6. **Permission checks** — Non-owner visiting `/dashboard/courses/[id]/analytics` gets a 404.
7. **CI green** — typecheck + lint + tests across all three workspaces. No new ESLint warnings.

---

### Risks / unknowns

1. **Analytics query performance.** "Has this member completed every lesson in the course?" is a nested `GROUP BY` + `HAVING` query. Small-course / small-enrolment scale is fine; could become slow past ~1000 enrolments. **Mitigation:** capture the query shape in a SQL comment + flag as a Phase-5 indexing candidate if it shows up in `pg_stat_statements` later.
2. **Preview playback without progress.** The `VideoLessonViewer` component currently always upserts progress. A clean `previewOnly` prop adds a branch; easy to get wrong. **Mitigation:** extract the upsert path into a `useProgressTracking` hook, feature-flag it off for previews. Covered in Step 5.
3. **Service-role read in analytics.** Decision I intentionally breaks the "client-side goes through anon RLS" rule for a single owner-asserted server action. **Mitigation:** document it inline (server-only module, never imported client-side), add a runtime check at the top of the action that re-verifies `user.id === course.creator_id` before the admin client fires.
4. **Market building-entrance art.** The Market's entrance tile on the iso world is still the Phase-1 invisible placeholder. Phase 4 adds a route but not the visual — worth flagging but doesn't block Phase 4 exit. **Mitigation:** already on the backlog in `phase-02_polish_backlog.md`.
5. **Creator name on the Market card.** `memberships.display_name` may be `NULL` for creators who haven't set one. **Mitigation:** fall back to `"Anonymous Creator"` or the email prefix. Already a punt item in the polish backlog; resolve in this phase because Market surfaces it publicly.
6. **Enrolment realm bleed.** `enrolment_self_insert` policy only allows members of the course's realm to enrol. If we accidentally render courses from a different realm in the Market (which RLS should block anyway), the Enrol button clicks would 403. **Mitigation:** smoke test 14 explicitly covers this.

---

### What I need from you before starting

1. Approve or override decisions **A–M**.
2. Confirm the Market building entrance tile in the iso world is the correct one to wire — it's the third Phase-1 invisible overlap zone. Say **"same entrance as Phase 1"** or override with coords.
3. Confirm the Phase-4 prod migration timing — land the index migration alongside first `/market` deploy, or hold until after Step 7's smoke? Default: alongside, since it's a read-only index with no blast radius.

Once A–M + those two are confirmed, Step 1 kicks off.
