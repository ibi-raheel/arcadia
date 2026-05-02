# Arcadia — Phase Implementation Plan

**MVP Edition | Version 1.1 | April 2026 | 12 weeks**

*From zero to a working Loom-ready demo in 12 weeks.*

*Changes in v1.1 vs v1.0 are summarised at the end of this document.*

> **2026-04-25 status update (extended through 2026-05-02).** Phases 0–5 (the original 12-week plan below) shipped 2026-04-21. **Eight extension phases shipped on top by 2026-04-25**, with two follow-up clusters on Phase 14 landing 2026-04-26 and 2026-05-02. None of this is re-described in the format below — see the README + the per-phase changelog entries in `/docs/changelog/`:
>
> - **(rendering rebuild, 2026-04-22)** — world swap from Tiled to image-backed central square + 3 outdoor neighbour scenes + per-building Colyseus sharding.
> - **Phase 8 — UI wire-up.** Every React surface rebuilt on the midnight-scriptorium design system. Public `/kit` + `/preview/*` routes added.
> - **Phase 9 — async feed + live events.** Tavern feed (tablet trigger) + `/dashboard/events` + verdigris live-now banner + YouTube stage embed.
> - **Phase 10 — the Scribe.** AI course maker at `/dashboard/courses/conjure` + TipTap WYSIWYG lesson editor (replacing `@uiw/react-md-editor`).
> - **Phase 11 — the Sage** *(AI portion retired in Phase 13)*. Bearded-merchant NPC in `/world` + UI legibility audit. Originally a Gemini-backed chat; replaced same week by Phase 13's static welcome (ADR 0017 supersedes 0014).
> - **Phase 12.A — coworking productivity.** Jukebox + hourglass (shared Pomodoro) + hearth pill (occupancy) + focus pill ("what I'm working on") wired to objects in the coworking-inside tent. 12.B (bookshelf / easel / round-table) deferred indefinitely pending usage data.
> - **Phase 13 — sage as static welcome.** Ripped the AI Sage chat. The wanderer's popup is now a static "welcome, traveller" panel + four flip cards introducing Academy / Square / Tavern / Coworking (post-13 polish PR #39 swapped Dashboard → Tavern; PR #41 refreshed direction hints). Zero recurring API cost; the Scribe's Gemini wiring is untouched.
> - **Phase 14 — persistent player HUD.** Full-width top bar: shield (level) + display name in JetBrains Mono + XP progress + five menu icons (Profile / Chat / Quests / Events / Settings). Dark brown panel with a bronze 9-sliced Kenney "Fantasy UI Borders" rim (CC0, recoloured at α 0.55 for a soft rim). Lives in the page's flex flow (not a fixed overlay) so the Phaser canvas sits cleanly below it; hidden during scene preload via `visibility: hidden`; obscured by modals at z-index 80. Local player's in-world nameplate hidden (HUD shows the same info); remote peers' nameplates render as a circular bronze-rimmed Arc badge + mono name. **Post-ship wiring (2026-04-26, PR #48–#57):** middle section now shows the location title + live occupants count; right section is role-aware (members see Profile/Chat/Quests/Events/Settings as placeholders; creators see Courses/Events/Members/Billing/Settings opening the matching dashboard tab as an in-world iframe overlay so the Phaser canvas + Colyseus room + ambient music never tear down). Persistent ambient music ("Woven Paths at Nightfall") is mounted in the root layout (PR #56) and survives every navigation; gated silent on `/login`, `/signup`, `/onboarding/*`. See [`docs/changelog/2026-04-26_phase-14-post-ship-wiring.md`](../changelog/2026-04-26_phase-14-post-ship-wiring.md). **Second follow-up cluster (2026-05-02, PR #58 → #60):** dashboard "exit" → real logout (form posting to `/api/auth/signout`, `target="_top"`); autoplay-permission gesture-bank in the login submit handler so ambient music plays the moment `/` renders; hidden `/dashboard` prewarm iframe for creators on `requestIdleCallback`; **four-stall market dashboard** (Courses · Templates · Tools · Exclusives, `$X` pricing, real DB enrol for Courses + 700 ms simulated "stamping…" for the latter three) opening as an in-world `MarketOverlay` over the Phaser `MarketScene` when the player walks to the central crystal and presses ENTER. Overlay header carries ✕ close, ← return to the world, and logout. See [`docs/changelog/2026-05-02_market-overlay-and-polish.md`](../changelog/2026-05-02_market-overlay-and-polish.md).
>
> The phase-plan format below was kept as the source of truth for the original 12-week scope; new phases follow the **Sub-phase ritual** codified in `CLAUDE.md` (plan → implement → test → review → commit → log per sub-phase) and ship under their own `phases/phase-NN_plan.md` + `phase-NN_status.md`.

## 1. Overview

This plan builds the Arcadia MVP across 6 phases in 12 weeks. The target output is a demo-ready product that can be recorded on Loom to pitch creators. Every phase ends with a testable, shippable increment — no phase exists purely to set up another one.

*The demo goal is specific: seven moments must be showable on camera without cuts. See PRD §7 for the full list. Build toward those seven moments, not toward a feature checklist.*

### Phase summary

| Phase | Title | Weeks | End state |
|---|---|---|---|
| 0 | Foundation | 1–2 | Repo, infra, schema (7 tables), full RLS, auth deployed; isometric spike confirmed; CI runs lint + typecheck + unit tests |
| 1 | World + avatar picker | 3–5 | Member picks avatar on first login, walks it in isometric world, enters buildings |
| 2 | Multiplayer + Tavern | 6–8 | Multiple avatars visible in real time; chat works in Tavern; reactions propagate |
| 3 | Academy | 9–10 | Creator uploads video course organised as Course → Section → Lesson; member watches it with progress tracking |
| 4 | Market + Dashboard | 11 | Market browses courses; creator dashboard shows analytics |
| 5 | Gamification + Polish | 12 | XP toasts, level badges, level sync, leaderboard; demo-ready |

## Phase 0 — Foundation (Weeks 1–2)

Phase 0 is infrastructure only. No visible product. The output is a working, deployed skeleton with auth, database, and all three services talking to each other. Rushing Phase 0 creates debt that compounds through every subsequent phase.

**Week 1 — Repo, services, schema**

- Monorepo: `/apps/web` (Next.js), `/apps/game-server` (Colyseus), `/packages/shared` (TypeScript types)
- Vercel project connected to `/apps/web`; Railway project connected to `/apps/game-server`
- Supabase project provisioned; all **7 MVP tables** created with correct foreign keys (realms, memberships, courses, sections, lessons, lesson_progress, enrolments, tavern_messages)
- Signup trigger created: `create_membership_on_signup()` on `auth.users` INSERT (see TAD §6.3)
- Seed row in `realms` with `slug = 'mvp-realm'` (required before any signup)
- **Full** RLS policy set written and applied (see TAD §6.2) — realms, memberships, courses, sections, lessons, lesson_progress, enrolments, tavern_messages all covered for SELECT and relevant INSERT / UPDATE
- Cross-member leakage test written and passing: two members cannot read each other's `lesson_progress` or `enrolments`; a member in realm A cannot read any row owned by realm B
- Redis add-on provisioned on Railway; Colyseus configured with `RedisPresence` + `RedisDriver`
- Cloudflare Stream account created; test upload and signed playback URL verified end-to-end
- Environment variables documented and set across Vercel, Railway, and `.env.local` (including `CF_STREAM_WEBHOOK_SECRET`)

**Week 2 — Auth, CI, isometric spike**

- Supabase Auth configured: email / password + Google OAuth; JWT settings locked
- Auth-gate middleware in Next.js: all non-public routes redirect to login
- **CI/CD on GitHub Actions:** every PR runs (1) TypeScript check, (2) ESLint, (3) unit-test runner (Vitest) across `/apps/web`, `/apps/game-server`, `/packages/shared`. Merge to main deploys Vercel preview → prod and Railway prod
- Smoke-test placeholders in each workspace so the test runner has something to assert (these grow into real tests each phase)
- Isometric spike: standalone Phaser scene with a 10×10 tilemap, two avatars, y-sorting — runs at 60 FPS on mid-range hardware
- Spike outcome documented: approach confirmed or escalated before Phase 1 begins

**Phase 0 is done when:** a user can register, the signup trigger creates their membership row, they can log in, and RLS blocks cross-member data reads. All three services are deployed and reachable. CI runs green on main. The isometric spike confirms 60 FPS.

*Do not start Phase 1 without the isometric spike result. If the spike reveals the approach needs significant custom work, that decision affects the entire build timeline.*

## Phase 1 — World + avatar picker (Weeks 3–5)

Phase 1 builds the isometric world for a single player, plus the first-login avatar-picker flow. No multiplayer yet. At the end of Phase 1, one authenticated member can sign up, pick an avatar, load the world, walk around, and transition into a building.

**Week 3 — Tilemap, scene, avatar picker**

- Design world tilemap in Tiled: outdoor environment, three building footprints (Tavern, Academy, Market), paths between them
- Tile spec: 64×32 px tiles at 2:1 ratio; exported as `.tmj`; loaded via Phaser tilemap loader
- WorldScene: renders tilemap, camera follows viewport, world bounds clamped
- Y-sort layer: all dynamic objects sorted by `(y + height/2)` each frame
- Building entrance zones: invisible Phaser overlap rectangles at each building entrance
- **`/onboarding/avatar` page:** React page with a grid of 8 avatar previews; on selection, upserts `memberships.avatar_id` and redirects to `/world`
- **Entry gate:** middleware / layout component checks `memberships.avatar_id`. If null, redirect to `/onboarding/avatar` before mounting Phaser

**Week 4 — Avatar movement**

- 8 base avatar sprite sheets imported
- WASD + arrow-key movement with normalised diagonal speed
- Click-to-move: Phaser pointer input sets target; avatar moves toward it
- Collision: avatar cannot walk through buildings or outside world bounds (Phaser physics bodies)
- Idle animation triggers after 2 seconds of no input
- Display name text object above avatar; level badge below name (shows Level 1 for all users in this phase)

**Week 5 — Building navigation**

- On building-entrance overlap: Phaser fades to black, Next.js routes to building page (`/tavern`, `/academy`, `/market`)
- Each building page has a Return-to-World button: routes back to `/world`, Phaser re-initialises, avatar spawns at building exit
- Tavern, Academy, Market pages show correct layout shells (content built in Phases 2–4)
- World loading screen: progress bar during Phaser asset preload; Realm name displayed

**Phase 1 is done when:** one newly-signed-up member is forced through `/onboarding/avatar`, selects an avatar, loads `/world`, walks to the Tavern entrance, enters it, sees the Tavern page shell, clicks Return to World, and walks back out — all at 60 FPS.

## Phase 2 — Multiplayer + Tavern (Weeks 6–8)

Phase 2 makes the world feel alive. Multiple members can see each other moving in real time, and the Tavern has working chat with emoji reactions. This is the most critical phase for the Loom demo — it is the moment the product stops looking like a single-player game.

**Week 6 — Colyseus integration**

- Colyseus `RealmRoom` implemented with `AvatarState` schema (memberId, x, y, direction, isMoving, level)
- World and Tavern rooms created: `world-realm1` and `tavern-realm1`
- Room auth: Supabase JWT validated on room join; unauthorised connections rejected
- Colyseus client integrated in Phaser BootScene; connection lifecycle managed (reconnect on drop)
- MOVE messages sent from local avatar at 20 updates/second; remote avatars receive state patches
- Unit tests: room handlers exercised in isolation (onAuth, MOVE bounds-check)

**Week 7 — Remote avatars and presence**

- Remote avatar sprites created on player join; destroyed on player leave
- Client-side interpolation: remote avatar positions smoothed between Colyseus patches
- Member-count badge on building entrances updated live from Colyseus room state
- Tavern interior: TavernScene with interior tilemap; avatars visible inside building
- Load test: simulate 20 concurrent clients in `world-realm1`; confirm <100 ms update latency and 60 FPS locally
- Note: room cap is 50; MVP tests to 20

**Week 8 — Tavern chat + reactions**

- Supabase Realtime subscription on `tavern_messages` filtered by `realm_id`
- Chat UI: React component overlaid on TavernScene; message list, input field, send button
- Send message: INSERT into `tavern_messages` via Supabase client; RLS `chat_write` policy enforces membership and `sender_id = auth.uid()`
- Message history: 500 most recent messages loaded on Tavern entry
- Emoji reactions: UPDATE `tavern_messages.reactions` JSONB via an RPC that restricts writes to the reactions column only; real-time reaction updates via Realtime UPDATE events
- XP leaderboard sidebar: reads from `memberships` table ordered by `xp DESC LIMIT 10`; updates via Realtime on `memberships` changes

**Phase 2 is done when:** two browser windows open simultaneously show two avatars moving independently in the World and Tavern, a message sent in one window appears instantly in the other, and an emoji reaction added in one window appears instantly in the other.

## Phase 3 — Academy (Weeks 9–10)

Phase 3 builds the full course creation and viewing experience. At the end of Phase 3, a creator can build a course organised as Course → Section → Lesson with a real video lesson, and a member can watch it with progress tracking.

**Week 9 — Course builder (creator side)**

- Creator dashboard page (`/dashboard`): course list, create-course button
- Course creation form: title, description, price (stored, not charged), thumbnail upload to Supabase Storage
- Course editor: add / remove sections; add lessons within sections; drag-to-reorder at both levels
- Lesson type `video`: browser requests `/api/stream/upload` → Next.js API calls CF Stream for pre-signed TUS URL → browser uploads directly to Cloudflare
- Upload progress bar; webhook handler `/api/stream/webhook` (signed with `CF_STREAM_WEBHOOK_SECRET`) saves `cf_stream_id` to `lessons` table
- Lesson type `written`: Markdown editor with preview
- Publish / draft toggle: published courses visible in Academy and Market
- Preview mode: creator views course as a member would

**Week 10 — Course viewer (member side)**

- Academy page (`/academy`): lists courses the member has access to (manually granted via `enrolments` inserts for demo)
- Course page (`/academy/[courseId]`): sections and lessons listed hierarchically; completed lessons marked with checkmark
- Video lesson: Next.js server-side fetches lesson; calls `/api/stream/token` to generate signed CF Stream URL; player renders
- Written lesson: Markdown rendered to HTML with syntax highlighting
- Progress tracking: `lesson_progress` row upserted when video hits 80% watched or written lesson is scrolled to bottom
- Course progress bar: completed_count / total_count per course
- Resume: `watched_secs` stored in `lesson_progress`; video player seeks to last position on re-open
- Preview lessons: accessible without enrolment row (`is_preview = TRUE` bypasses RLS enrolment check)

**Phase 3 is done when:** a creator publishes a course with one section containing one video lesson and one written lesson. A member opens the Academy, watches the video to 80%, and the progress bar updates. On re-entry, the video resumes from the last position.

## Phase 4 — Market + Dashboard (Week 11)

Phase 4 completes the Market and creator analytics dashboard. Both are presentable in the Loom demo; neither requires payments to function.

**Market (`/market`)**

- Course grid: card per published course — thumbnail, title, description, price label, lesson count
- Course detail view: full description, section / lesson list, creator name, enrolment CTA (visible but inactive — no payments yet)
- Free preview lessons playable directly from Market detail view (no enrolment required)
- Search / filter: filter by published courses; sort by newest

**Creator dashboard — analytics**

- Member overview: total member count; list of members with join date, XP, and `last_active` (read directly from `memberships.last_active`)
- Daily active members: chart for last 14 days (count of unique `member_id`s where `last_active` falls within each day)
- Per-course stats: enrolment count (from `enrolments`), average lesson-completion rate
- Tavern activity: messages sent per day for last 14 days
- All analytics queries run server-side in Next.js API routes using `SUPABASE_SERVICE_KEY` — never expose raw analytics queries to the client

**Phase 4 is done when:** the Market shows real courses with correct data, and the creator dashboard displays live member counts and a readable activity chart.

## Phase 5 — Gamification + Polish (Week 12)

Phase 5 wires up the XP system, adds visual feedback in the game world, and polishes the full demo flow. Everything built here is visible in the Loom recording.

**XP and levelling**

- Shared PL/pgSQL functions `calculate_level(total_xp)` and `award_xp(member_id, realm_id, amount)` deployed (TAD §8.1)
- Triggers call `award_xp()`:
  - `on_lesson_complete` — +25 on `lesson_progress.completed` transition to TRUE
  - `on_tavern_message` — +5 on `tavern_messages` INSERT; rate-limited to 10 per hour per member
- Edge Functions call `award_xp()`:
  - Daily login — +10 on first `auth.signIn` of the calendar day (checks `last_active::date`)
  - Course completion — +100 when all lessons in a course are marked complete

**Visual feedback**

- Client subscribes via Supabase Realtime to its own `memberships` row
- On `UPDATE` where `new.level !== old.level`, client emits `UPDATE_LEVEL` to current Colyseus room (TAD §8.3) and fires an in-game event for the level-up banner
- XP-gain toast: floating `+25 XP` text object in Phaser world, rises and fades over 1.5 seconds
- Level-up banner: larger animated banner — "Level Up! You are now Level X" — shown in world on level change
- Level badges on avatars: updated in real time via the Colyseus `AvatarState.level` patch; colour changes per level (grey → blue → green → gold → purple)
- Tavern leaderboard: updates live when any member's XP changes via Realtime on `memberships`

**Demo polish**

- Loading screens: consistent branded loading screen with Arcadia logo between page transitions
- Error states: network-error toast, video load retry, Colyseus reconnect with user feedback
- Responsive layout: all non-Phaser pages usable at 1280 px minimum width
- Full demo run-through: execute all 7 PRD success criteria in sequence; fix anything that breaks
- Seed data: one Realm pre-configured with 3 published courses and 2 demo accounts (with avatars already selected) for recording

**Phase 5 is done when:** a complete Loom recording can show all 7 demo moments from PRD §7 without cuts, workarounds, or staged data. If any moment requires manual intervention, it is not done.

## 2. Master milestone tracker

| End of week | Milestone | Blocker if missed |
|---|---|---|
| 1 | Supabase schema (7 tables) + full RLS live; signup trigger working; all services deployed | Phase 1 has no foundation |
| 2 | Auth works end-to-end; CI green with lint + typecheck + unit tests; isometric spike confirmed at 60 FPS | Phase 1 Week 3 cannot begin |
| 3 | `/onboarding/avatar` works; world tilemap renders; building footprints visible | Avatar work in Week 4 has no scene or picker |
| 4 | Avatar moves with WASD and click-to-move; collision working | Building navigation in Week 5 blocked |
| 5 | Building entry / exit transitions clean; all 3 building pages exist as shells | Phase 2 has no pages to build on |
| 6 | Colyseus rooms deployed; single avatar syncs between two clients | Multiplayer demo moment is blocked |
| 7 | 20 CCU load test passes; remote avatars render and interpolate smoothly | Performance bug discovered late |
| 8 | Tavern chat live; emoji reactions work; leaderboard visible | Core social demo moment blocked |
| 9 | Creator can upload a video lesson; CF Stream playback confirmed; section-lesson hierarchy works | Academy has no content to show |
| 10 | Member watches video; progress tracked; resume from last position works | Academy demo moment blocked |
| 11 | Market shows real courses; creator dashboard shows live analytics | Two Loom demo moments blocked |
| 12 | All 7 PRD demo moments recordable without cuts; level-up banner fires; seed data in place | Loom recording cannot be made |

## 3. Dependencies and pre-work

| Item | Needed by | Action required | Risk |
|---|---|---|---|
| Sprite art (8 avatars, 3 tilesets) | Phase 1 Week 3 | Commission or license before Week 1 | High — art takes calendar time, not just build time |
| Tilemap design in Tiled | Phase 1 Week 3 | Design world layout in parallel with Phase 0 | Medium — design work, not blocked by code |
| Cloudflare Stream account | Phase 3 Week 9 | Provision in Phase 0 Week 1 | Low — instant |
| Seed member accounts (2 demo accounts) | Phase 5 Week 12 | Create during Phase 5 | Low |
| Avatar-picker UI assets (8 preview thumbnails) | Phase 1 Week 3 | Derived from avatar sprites; trivial if sprites are ready | Low |

## 4. Changes in v1.1 vs v1.0

- **Phase 0 Week 1:** now 7 tables (was 5); full RLS policy set required (was partial); seed realm row added; signup trigger required
- **Phase 0 Week 2:** CI now runs unit tests in addition to lint + typecheck (previously lint only)
- **Phase 1 renamed** to "World + avatar picker" and now includes `/onboarding/avatar` and the entry-gate middleware — previously the avatar was mentioned but never scheduled
- **Phase 2 Week 8:** emoji reactions scheduled and tied to the `reactions` JSONB column added in TAD v1.1
- **Phase 3 Week 9:** course editor explicitly builds against `Course → Section → Lesson` hierarchy (sections are now a real table)
- **Phase 4 dashboard:** `last_active` is read directly from `memberships.last_active` (new column); DAU chart derives from it
- **Phase 5:** XP uses the shared `award_xp()` / `calculate_level()` functions; level-badge sync goes via `UPDATE_LEVEL` Colyseus message
- **Milestone tracker** updated to reflect the above
- **Dependencies** now include avatar-picker UI assets

*— End of MVP Phase Plan v1.1 —*
