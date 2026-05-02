# Arcadia — Product Requirements Document

**MVP Edition | Version 1.1 | April 2026**

*Scope: Creator pitch demo. Five surfaces (World, Tavern, Academy, Market, Creator Dashboard). No payments. Lightweight gamification.*

*Changes in v1.1 vs v1.0 are summarised at the end of this document.*

## 1. MVP purpose

This PRD defines the Arcadia MVP — a working, demo-ready product scoped to generate Loom pitch videos for creator acquisition. The MVP is not a public launch. It is a proof of experience, designed to answer one question for a prospective creator:

> *"What would it feel like for my community to actually live somewhere?"*

The MVP demonstrates the spatial experience end-to-end across four member-facing surfaces (World, Tavern, Academy, Market) plus a creator dashboard with course builder and basic analytics. Payments are excluded.

> **2026-04-25 amendment.** The original 6-phase MVP (phases 0–5) shipped 2026-04-21. Eight extension phases shipped on top by 2026-04-26:
>
> - **Phase 8 — UI wire-up.** Every React surface rebuilt on the midnight-scriptorium design system.
> - **Phase 9 — async feed + live events.** Tavern feed (tablet trigger) + `/dashboard/events`.
> - **Phase 10 — the Scribe.** AI course maker via Gemini (`/dashboard/courses/conjure`) + TipTap WYSIWYG lesson editor (replacing `@uiw/react-md-editor`).
> - **Phase 11 — the Sage.** AI guide NPC in `/world` (Gemini-backed chat popup grounded in the curated MVP docs + ADRs). *Retired in Phase 13 — see below.*
> - **Phase 12.A — coworking productivity.** Jukebox + shared Pomodoro hourglass + hearth pill (occupancy) + focus pill ("what I'm working on") wired to objects in the coworking-inside tent.
> - **Phase 13 — sage as static welcome.** Ripped the AI Sage chat (ADR 0017 supersedes 0014). Wanderer's popup is now a static panel + four flip cards (Academy / Square / Tavern / Coworking).
> - **Phase 14 — persistent player HUD.** Full-width top bar (shield + name + XP + 5 menu icons) on every Phaser scene; creator icons open dashboard tabs as an in-world overlay (PR #57); persistent ambient music in root layout (PR #56).
>
> Sections below describe the MVP-as-shipped, with the AI surfaces noted inline. The "out of scope" table in §2 still reflects what was deliberately excluded from the MVP build itself.

*Everything not listed in this document is out of scope for MVP. Add it to the V1 backlog, not this build.*

## 2. MVP scope — what is built

| Page / zone | Who uses it | Core function | In MVP |
|---|---|---|---|
| World (The Square) | Members | Isometric navigation hub, avatar movement, real-time presence | Full |
| Tavern | Members | Real-time chat, avatar presence inside building | Full |
| Academy | Members | Video course viewer, lesson progress tracking | Full |
| Market | Members | Course catalogue; browse and preview — no purchase flow | Browse only |
| Creator Dashboard | Creators | Course builder, video upload, basic analytics | Full |
| Avatar selection | Members | First-login avatar picker | Full (lightweight) |
| Payments (Stripe) | Members | Course purchase and enrolment | Out of scope |
| Gamification | Members | XP, levels on avatars, Tavern leaderboard | Lightweight |
| Member management | Creators | Ban, mute, invite controls | Out of scope |
| Multi-Realm support | Creators | Creator owns multiple Realms | Out of scope |
| Onboarding wizard | Creators | Guided setup flow | Out of scope |
| Moderation tools | Creators | Delete messages, mute members | Out of scope |

## 3. User personas

### 3.1 The Creator (primary target for Loom pitch)

| Attribute | Description |
|---|---|
| Who | Online educator, coach, or community builder with an existing audience (Discord + course platform today) |
| What they need to see in the Loom | Their brand, their content, their members — in one world that feels like theirs |
| Pain today | Discord for chat, Teachable for courses, Notion for content — no sense of place |
| What convinces them | Seeing a live world with real avatars moving, a chat that actually works, and their courses in a beautiful viewer |

### 3.2 The Member (demoed to creators as their audience)

| Attribute | Description |
|---|---|
| Who | Fan or student of the creator, aged 18–45, comfortable with light gaming UIs |
| What they experience in MVP | Pick an avatar, walk it, see others in real time, chat in the Tavern, watch a course in the Academy, browse the Market |
| What the MVP proves to the creator | Their community would actually show up here — it feels alive, not like another tab to ignore |

## 4. Functional requirements

### 4.1 Auth and first-login flow

- Email + password sign-up and log-in via Supabase Auth
- Google OAuth as a second option
- Single account works as both creator and member (role determined by Realm context)
- Session persists across browser tabs and page refreshes
- Unauthenticated users are redirected to login before entering any page
- **Signup hook:** on successful Supabase auth `INSERT` into `auth.users`, a database trigger creates a `memberships` row in the hardcoded MVP Realm. `avatar_id` is `NULL` until the picker is completed
- **First-login avatar picker:** if the member's `memberships.avatar_id IS NULL`, the app routes them to `/onboarding/avatar` before allowing entry into `/world`. Selection writes `avatar_id` to their membership row and redirects to `/world`

### 4.2 The World (navigation hub)

**Layout and rendering**

- 2.5D isometric tilemap rendered in Phaser 3 via WebGL (Canvas fallback)
- World contains three visible buildings: Tavern, Academy, Market
- Buildings have entrance zones — avatar walks to entrance, building page loads
- Outdoor environment: paths, ambient decoration tiles, lighting atmosphere
- Camera follows local avatar; world scrolls within scene bounds

**Avatar movement**

- WASD and arrow-key movement; normalised diagonal speed
- Click-to-move: click world position, avatar pathfinds to target
- Collision detection: avatars cannot enter buildings via walls or walk off-world bounds
- Idle animation after 2 seconds without movement input

**Real-time presence**

- Other members' avatars visible and moving in real time via Colyseus
- Display name rendered above each avatar (max 16 characters)
- Live member-count badge on each building entrance
- Avatar appears on join; removed immediately on disconnect

### 4.3 The Tavern

- Interior tilemap scene — members see each other as avatars inside the building
- Real-time chat feed via Supabase Realtime — all members in Tavern see the same messages
- Message history: last 500 messages loaded on entry
- Emoji reactions on messages, stored in a `reactions` JSONB column on `tavern_messages` and propagated via Supabase Realtime
- XP leaderboard panel: top 10 members by XP visible in sidebar
- Back-to-World button: returns avatar to building exit in the World

### 4.4 The Academy

**Member view**

- Lists all published courses the member has been granted access to (manual grant in MVP — no payment)
- Course structure: Course → Section → Lesson (all three modelled as tables; see TAD §6.1)
- Video lessons delivered via embedded YouTube unlisted player (MVP demo scope per ADR 0006; production swap to Cloudflare Stream or equivalent pending payment model)
- Written lessons rendered from Markdown via the academy viewer; authored in the dashboard's TipTap WYSIWYG editor (Phase 10)
- Per-lesson completion tracking: marked complete when video reaches 80% or written lesson is scrolled to the bottom
- Course progress bar: completed / total lessons
- Resume from last-watched position on re-entry

**Course preview (for non-enrolled members)**

- Unenrolled members see course titles and descriptions
- Up to 2 lessons per course designated as free preview — accessible without enrolment
- All other lessons show a locked state with an Enrol CTA (button inactive in MVP — no payments yet)

### 4.5 The Market

- Grid of course cards: title, thumbnail, short description, price label, lesson count
- Course detail view: full description, section and lesson list, instructor info
- Free preview lessons playable directly from Market detail view
- Enrol button present on each course — inactive in MVP (payments not built)
- Creator can mark courses as published or draft; only published courses appear in Market

### 4.6 Creator Dashboard

**Course builder**

- Create course: title, description, thumbnail upload, price (stored but not charged in MVP)
- Add sections within a course; add lessons within each section
- Lesson types: video (creator pastes a YouTube URL — MVP scope per ADR 0006) and written (TipTap WYSIWYG editor — Phase 10)
- Drag-and-drop reordering for sections and lessons
- Publish / draft toggle per course
- Preview mode: creator can view their course as a member would
- **AI course maker (the Scribe, Phase 10)** — `/dashboard/courses/conjure`. Drop in source documents, write a brief, the scribe drafts an outline → lesson bodies → images across four approvable streaming stages, then materializes a full course tree the creator can polish in the regular builder.

**Basic analytics**

- Total member count in the Realm
- Daily active members (chart — last 14 days)
- Per-course: enrolment count, average lesson-completion rate
- Tavern activity: messages sent per day (last 14 days)

### 4.7 Gamification (lightweight)

*Gamification in the MVP is intentionally thin — enough to feel alive on camera, not enough to be a distraction to build.*

- XP events: daily first login (+10), lesson completed (+25), Tavern message sent (+5, rate-limited to 10/hour), course completed (+100)
- 5 levels in MVP: L1 at 0 XP, L2 at 100, L3 at 300, L4 at 600, L5 at 1000
- Level badge visible on avatar in World and Tavern (small icon, not obtrusive)
- XP-gain toast: floating `+25 XP` text above avatar when XP is earned
- Leaderboard in Tavern sidebar: top 10 members by XP with display name and level

## 5. Non-functional requirements

| Category | Requirement |
|---|---|
| Performance | World renders at 60 FPS on a mid-range laptop (8 GB RAM, integrated GPU, Chrome latest) |
| Multiplayer latency | Avatar position updates < 100 ms within same region |
| Concurrent users | 20 concurrent members per Realm minimum for MVP (sufficient for demo); Colyseus rooms capped at 50 |
| Video start time | Course video begins playing within 3 seconds on a 10 Mbps connection |
| Browser support | Chrome, Firefox, Safari, Edge — latest 2 major versions |
| Auth security | All pages auth-gated; Supabase RLS enforced on every table (see TAD §6.2) |
| Mobile | Not required for MVP — desktop and laptop only |

## 6. Out of scope — MVP

*These are not deferred features. They are confirmed exclusions from this build. Do not spec, design, or build them for MVP.*

- Stripe payments and course purchase flow
- Member management (ban, mute, invite controls)
- Creator onboarding wizard
- Multi-Realm support (one hardcoded Realm in MVP)
- Moderation tools
- Direct messaging between members
- Live events or creator broadcasts
- Custom avatar cosmetics or shop
- Email notifications
- Full gamification (achievements, milestones, configurable XP)
- Realm theming or customisation controls (data model supports it; no creator UI)
- Mobile / tablet optimised UI

## 7. MVP success criteria

The MVP is complete when a Loom recording can show the following without cuts or workarounds:

| # | What is shown on camera | Proves |
|---|---|---|
| 1 | Creator logs in, opens dashboard, builds a course with a video lesson, publishes it | Creator side works end-to-end |
| 2 | Member signs up, picks an avatar, spawns in the World, walks to the Tavern | Onboarding and spatial experience are real |
| 3 | A second browser is open — second avatar appears and moves in real time | Multiplayer is live, not faked |
| 4 | Both members chat in the Tavern; messages and emoji reactions appear instantly; leaderboard is visible | Community layer works |
| 5 | Member walks to Academy, opens a course, watches a video lesson, progress is recorded | Learning experience is functional |
| 6 | Member walks to Market, browses courses, opens a course detail view | Commerce layer is presentable |
| 7 | Member earns XP from completing a lesson; floating toast appears; leaderboard updates; level-up banner fires at a threshold | Gamification feels alive |

## 8. Changes in v1.1 vs v1.0

- Subtitle corrected: five surfaces in scope (was "4 pages"), making the Creator Dashboard explicit
- Added explicit first-login avatar-picker flow (§4.1) — previously implied in TAD but not scheduled anywhere
- Added signup → memberships-row trigger (§4.1) — previously undefined
- Clarified that emoji reactions are backed by a `reactions` JSONB column on `tavern_messages` (§4.3) — TAD schema had no such column in v1.0
- Clarified Course → Section → Lesson hierarchy with all three modelled as tables (§4.4) — v1.0 referenced sections but schema did not
- Room capacity note added to NFRs (§5) — 20 target, 50 cap
- Success criteria #2 now includes avatar selection; criteria #4 includes reactions; criteria #7 includes level-up banner

*— End of MVP PRD v1.1 —*
