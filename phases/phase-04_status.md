# Phase 4 — Status

Source plan: `phase-04_plan.md`. Entries chronological, newest on top.

## 2026-04-21 — Phase 4 shipped

**Creator analytics + Market stall flow shipped same session as Phase 4 kickoff.** End-to-end:

- A creator publishes a course → member opens `/market` → walks to a stall → stall modal opens with blurred backdrop → they preview a free lesson → click Enrol → stay in the hall with an "Enrolled ✓" banner → close modal → back to browsing. Creator visits `/dashboard/courses/[id]/analytics` and sees enrolment count + completion % + active-in-7d + recent-activity table.

### What shipped

| Step | Landed |
|---|---|
| 1 | Migration `20260422000001_phase4_market_indexes.sql` — `courses_market_idx (realm_id, published, created_at desc)` + `lesson_progress_completed_idx`. User-applied to prod SQL editor. |
| 2 | `BOOT_ASSETS.marketInterior` + BootScene preload. |
| 3 | `scenes/market/` folder: `MarketScene` + 3 configs + `CLAUDE.md` + 6 config-shape tests. |
| 4 | Stall render logic. Rectangle + 3 Text objects per course; enrolled = emerald border, unenrolled = purple. |
| 5 | `app/market/page.tsx` server component: RLS-scoped courses + enrolments + sections + lessons + creator display names. |
| 6 | `GameMarket.tsx` — Phaser mount + React HUD search + URL-driven modal state (fix in `b136a2a` after first smoke exposed a state/URL race). |
| 7 | `StallView.tsx` — modal with `backdrop-blur-xl`, course hero, section/lesson tree, inline preview playback, Enrol CTA. |
| 8 | `previewOnly` prop added to `VideoLessonViewer` + `WrittenLessonViewer` — no `upsertLessonProgress` / `setLessonDurationIfNull` / `markLessonCompleted` calls in preview mode. |
| 9 | `enrolInCourse` server action. Idempotent via unique constraint; redirect behavior changed post-smoke: now stays in Market + flips modal footer rather than redirecting to Academy. |
| 10 | Market building entrance on iso world already routed from Phase 1 — no WorldScene change needed. |
| 11 | Home hub: "Visit the Market" card added (three-column grid now). |
| 12 | `fetchCourseAnalytics` — owner-asserted via anon client, then service-role admin read. Returns `{ enrolmentCount, completionRate, activeInLastWeek, recentActivity[] }`. |
| 13 | Pure `computeCompletionRate` + `countActiveInWindow` helpers extracted to `aggregate.ts` + 9 unit tests. |
| 14 | `/dashboard/courses/[id]/analytics` route — three stat cards + "last 10 events" recent-activity table. Creator-only (404 otherwise). |
| 15 | "Analytics" pill in the course editor header next to Publish. |

### Post-plan delta

Three UX tweaks after the first Market smoke:

- **Enrol stays in hall.** `router.push('/academy/[id]')` on success → replaced with a local `locallyEnrolled` flag + "✓ You're enrolled. Keep browsing or open the course in the Academy." banner and two footer buttons. Avoids nuking the Phaser instance mid-browse.
- **Avatar position persists across reloads** via `localStorage['arcadia:market:avatar-pos:<memberId>']`, saved every 500 ms while moving + once on scene shutdown/destroy. Clamped inside image bounds on load.
- **Interior art swapped mid-session** when user supplied a new 1536×1024 image; no scene-config drift.

Fix committed separately: `b136a2a` resolved a state/URL race where clicking the modal ✕ re-opened the modal because local `openCourseId` state was racing with `?course=` URL updates. Now URL is the single source of truth.

### Known MVP caveats

- **Stall enrolment counts show 0.** `enrolment_self_read` RLS hides other members' enrolment rows from the anon client, so the Market grid can't compute a global "N enrolled" per stall. Analytics page works fine (admin client). Follow-up: add a `get_enrolment_count(course_id)` SECURITY DEFINER RPC or a materialised view — punted to Phase 5.
- **No new RLS tests.** `enrolment_self_insert` already covered in Phase-3 plan decision L's test set; Phase 4 reuses that surface.
- **Market building-entrance art** still uses the Phase-1 invisible placeholder on `/world`. Not Phase 4's responsibility; tracked in `phase-02_polish_backlog.md`.

### Route sizes

- `/market` — 5.39 kB / 496 kB
- `/dashboard/courses/[id]/analytics` — 177 B / 96.7 kB

### Tests

- 152 passing (9 new aggregate-helper tests + 6 new Market config-shape tests vs Phase 3 exit).
- 21 skipped (RLS suite, env-gated).

### Phase 4 exit criteria — all met

| Criterion | Status |
|---|---|
| Market browse with search HUD | ✅ |
| Stall modal opens with blurred Phaser backdrop | ✅ |
| Preview lesson plays in modal without writing progress | ✅ |
| Enrolment loop — click creates row, course appears in Academy | ✅ |
| Cross-realm isolation (enrolment_self_insert) | ✅ (RLS covers) |
| Creator analytics: enrolmentCount / completionRate / activeInLastWeek | ✅ |
| Non-owner 404 on `/dashboard/courses/[id]/analytics` | ✅ |
| CI green | ✅ |

### Ready for Phase 5

Next: **Gamification + Polish (Week 12)** — XP triggers on lesson completion, level-up flow, level-sync via Colyseus `UPDATE_LEVEL`, real leaderboard values, real-art 60 FPS measurement, demo cut.
