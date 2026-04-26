# Phase 14 — Post-ship wiring (PR #48 → #57)

**Date:** 2026-04-26 (cluster spans 2026-04-25 evening → 2026-04-26)
**Branches:** `feature/hud-three-section`, `feature/hud-role-aware-icons`, `chore/hud-divider-tweaks`, `feature/hud-billing-and-members-icons`, `feature/hud-occupants-count`, `feature/hud-dashboard-routing`, `feature/persistent-ambient-music`, `feature/dashboard-overlay`, plus the server hotfix `fix/single-session-enforcement` and tavern fix `fix/tavern-feed-refetch`.
**ADRs:** ADR 0018 (Phase 14 — unchanged); no new ADRs.
**Supersedes:** the "Four placeholder menu icons" claim in the original Phase-14 changelog. Right-section icons are now role-aware and the creator set is wired.

The persistent player HUD shipped in [PR #29 + twelve polish PRs](./2026-04-25_phase-14-player-hud.md) on 2026-04-25. This follow-up cluster reshapes the HUD into three real sections, wires the creator-side icons, adds persistent ambient music, and ships two unrelated fixes (single-session enforcement + tavern feed refetch) that landed in the same window.

## What shipped

### Three-section bar (PR #48 → #53)

The HUD's right-side row of menu icons grew into a proper three-section layout: **left** = shield + name + XP, **middle** = location title + live occupants count, **right** = role-aware icons. Each section uses `.hud-section { flex: 1 1 0; min-width: 0 }` so they're true thirds at any viewport.

- **PR #48 — `feat(hud): three-section bar`** — added `.hud-section-left/-middle/-right`, moved the location title (was: nothing) into the middle section.
- **PR #49 — `feat(hud): role-aware right-section icons`** — `MenuIcons` learned a `role` prop. Members keep the original Profile/Chat/Quests/Events/Settings placeholder set; creators + admins get Courses/Events/Members/Billing/Settings.
- **PR #51 + #52 — Billing + Members icon redesigns** — the multi-silhouette `MembersIcon` didn't read at small sizes; replaced with a list glyph (three rows + bullet dots). The stack-of-coins `BillingIcon` with a tiny `$` was unreadable; replaced with a single coin and a prominent serif `$`.
- **PR #50 — divider tweaks** *(later removed in #53)* — short-lived experiment with vertical bronze dividers between the three sections; user preferred the cleaner gap-only look.
- **PR #53 — `feat(hud): occupants count + drop dividers`** — middle section now stacks the location title above a small `(N wandering)` count fed from a new `useRoomOccupants(room)` hook (subscribes to `room.onStateChange` for live updates). Dividers removed.

New CSS classes in `panel.css`: `.hud-section`, `.hud-section-left/-middle/-right`, `.hud-icon-row` (gap moved here so members + creators get identical icon spacing), `.hud-name`, `.hud-location`, `.hud-occupants`.

### Creator icons → dashboard overlay (PR #55 + #57)

- **PR #55 — `feat(hud): wire creator icons to dashboard tabs`** — gave each creator `IconEntry` an `href` so clicking would route to the matching `/dashboard/*` page. Bundled with a label rename in `apps/web/components/dashboard/DashboardShell.tsx`: `folk` → "members" and `payouts` → "billing". **Routes are unchanged** (`/dashboard/folk`, `/dashboard/payouts`) so existing bookmarks + analytics keep working — only the visible tab text changed.
- **PR #57 — `feat(hud): open creator dashboard tabs as in-world overlay`** *(this commit)* — the `<Link>`-based route change tore down the persistent ambient music + Phaser canvas + Colyseus connection on every click and was also surfacing a runtime error we couldn't reproduce in the Safari console. Replaced the `href` field with `tab?: DashboardTab` and added `apps/web/components/hud/DashboardOverlay.tsx`: a fullscreen modal at z-index 80 hosting an `<iframe>` at the dashboard tab's URL. Esc and backdrop-click dismiss; `key={tab}` forces a fresh iframe when switching tabs so the dashboard's own back/forward doesn't leak into the parent. Dashboard pages remain standalone routes for direct URL access — this just adds a second, in-world entry point.

### Persistent ambient music (PR #56)

- **PR #56 — `feat(audio): persistent ambient music across all in-world routes`** — new `apps/web/components/audio/AmbientMusic.tsx` mounted as a sibling of `{children}` in `apps/web/app/layout.tsx`. Because the root layout never unmounts during App Router navigation, the `<audio>` element survives every client-side route change. Path-gates internally on `usePathname()`: silent on `/login`, `/signup`, `/onboarding/*`; plays everywhere else (including `/dashboard`, every Phaser scene, every overlay). Track: `apps/web/public/audio/Woven_Paths_at_Nightfall.mp3`. Locked at low volume; loops.

This is the architectural reason PR #57 chose an iframe overlay over a route change for the creator HUD icons — keeping the music alive was an explicit goal once #56 landed.

### Single-session enforcement (PR #50, server)

- **PR #50 — `fix(server): single-session-per-member`** — opening `/world` in a second tab while a first tab was connected used to spawn two avatars under the same `member_id`, which broke nameplate dedup and confused remote peers. The Colyseus room now tracks one client per `member_id` and kicks the older session on a new join with custom close code `4001` ("evicted by new session"). Client-side, `apps/web/components/game/net/colyseus-client.ts` exposes `EVICTED_BY_NEW_SESSION_CODE = 4001` and the connection layer handles the close cleanly without retrying.

### Tavern feed refetch (PR #54)

- **PR #54 — `fix(tavern): refetch feed after createPost`** — the poster was the only person who couldn't see their own post until the next page reload. Added a refetch in `apps/web/components/tavern/TavernFeatures.tsx` after `createPost` resolves so the optimistic flow stays consistent with what the rest of the room sees via Realtime.

## Files added

- `apps/web/components/hud/DashboardOverlay.tsx` — the iframe modal (PR #57).
- `apps/web/components/audio/AmbientMusic.tsx` — root-layout `<audio>` (PR #56).
- `apps/web/public/audio/Woven_Paths_at_Nightfall.mp3` — ambient track.
- `apps/web/components/game/net/use-room-occupants.ts` — hook subscribing to `room.onStateChange` for live occupants count (PR #53).

## Files changed

- `apps/web/components/hud/PlayerHud.tsx` — accepts `role`, `location`, `occupants`; threads them through to `PlayerBar`.
- `apps/web/components/hud/PlayerBar.tsx` — three-section flex layout; display name bumped to JetBrains Mono 600/17 (was 15) per PR #45 baseline.
- `apps/web/components/hud/MenuIcons.tsx` — role-aware icon sets; creator set wired through `DashboardOverlay`. Dropped the `Link` import; render is overlay-state-driven via `useState<DashboardTab | null>(null)`.
- `apps/web/components/hud/panel.css` — new `.hud-section*`, `.hud-icon-row`, `.hud-name`, `.hud-location`, `.hud-occupants` rules.
- `apps/web/components/dashboard/DashboardShell.tsx` — visible tab labels `folk` → "members", `payouts` → "billing"; routes unchanged.
- `apps/web/app/layout.tsx` — `<AmbientMusic />` mounted as sibling of `{children}`.
- `apps/web/components/game/net/colyseus-client.ts` — exports `EVICTED_BY_NEW_SESSION_CODE = 4001`.
- `apps/web/components/tavern/TavernFeatures.tsx` — refetches after `createPost`.
- `apps/game-server/src/rooms/RealmRoom.ts` — single-session kick in `onJoin` with close code 4001.

## Why no migration

No schema changes. The existing `memberships.role` column (added in `20260422000002_phase5_gamification.sql`) is the source of `role` for `PlayerHud` — already populated for every existing member.

## Tests + verification

Local CI runs (per [CLAUDE.md sub-phase ritual](../../CLAUDE.md)):

- `npm run format:check` — clean.
- `npm run lint` — clean (`--max-warnings=0`).
- `npm run typecheck` — clean.
- `npx vitest run` — 254 passed, 23 skipped (28 files).

Visual verification checklist:

- Sign in as **member**, enter `/world`. Right section shows Profile / Chat / Quests / Events / Settings (placeholder buttons). Middle shows the location title + a live `(N wandering)` count that ticks as peers join/leave.
- Sign in as **creator**, enter `/world`. Right section shows Courses / Events / Members / Billing / Settings. Click each — fullscreen overlay opens with the matching dashboard tab in an iframe. Music keeps playing. Press Esc; overlay closes and the world canvas is exactly where it was.
- Click backdrop (the dark area outside the modal frame) — overlay closes the same way.
- Open one tab, then click another HUD icon — iframe refreshes to the new tab cleanly with no parent history pollution.
- Open `/world` in a second tab — the first tab's connection drops with code 4001; only one avatar visible to peers.
- Post in the tavern — the poster sees their own post immediately (no reload needed).
- Music: persists across `/world` → `/coworking` → `/tavern` → `/academy/[id]` → back. Stays silent on `/login` and `/signup`.

## What this supersedes

The "What shipped (final state)" section of [`2026-04-25_phase-14-player-hud.md`](./2026-04-25_phase-14-player-hud.md) described five **placeholder** menu icons. They are no longer all placeholders: the creator set (Courses / Events / Members / Billing / Settings) opens the matching dashboard tab as an in-world overlay; the member set (Profile / Chat / Quests / Events / Settings) remains placeholders pending the member-dashboard design.
