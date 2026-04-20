## Phase 2 Plan: Multiplayer + Tavern

**Status: SHIPPED 2026-04-19.** All three weeks merged; end-to-end flow live in prod. See `phase-02_status.md` for the current runtime state + PR map. Divergences from this plan (all post-plan-confirmation):
- **Reactions UI removed from the Tavern** per user request after PR #5 shipped. The `toggle_reaction` RPC + RLS tests remain so the backend is ready if we re-introduce UI.
- **Tavern switched from procedural iso tilemap to an image-backed background** (`public/tavern-interior.png`, 1376×768, user-supplied). `tavern.tmj` is still on disk but unused in-scene. `LocalAvatar` gained a `spawnPixel` option (iso tiles → plain pixels).
- **Chat bar hidden by default; Tab to open.** The original plan had the bar always visible; user requested modal-style entry so WASD doesn't accidentally type. Implemented via per-visibility Phaser keyboard enable/disable handoff.
- **Reactions UX rewritten multiple times** (bottom bar → speech bubbles → bubble-click picker → picker removed). Final state: speech bubbles above speakers, no picker.

**Source:** `/docs/mvp/phase-plan.md` §Phase 2 (Weeks 6–8) and `/docs/mvp/tad.md` §3.4, §4.2, §5.1–§5.4, §6.2, §8.3. This file is the executable plan; the MVP doc is the contract.

**Goal:** Two or more members signed into distinct browser tabs on the deployed Vercel URL see each other's avatars moving in real time in `/world` and in `/tavern`, with <100 ms MOVE patch latency locally. In the Tavern, a message sent from one tab appears in all others within 500 ms, and emoji reactions propagate within 500 ms. Member-count badges above the three building entrances in `/world` reflect live occupancy within a 3 s poll window. An XP leaderboard sidebar is visible in the Tavern (rendering mostly zeroes until Phase 5's XP awards land).

No course content. No CF Stream. No creator dashboard. No XP awards. No level-up banners. Those belong to Phases 3–5.

---

### Pre-plan decisions — locked 2026-04-19

All seven decisions approved as recommended. Brief resolutions:

| # | Decision | Resolution |
|---|---|---|
| A | Direction enum rename | ✅ Cardinal `'n'\|'e'\|'s'\|'w'` across `@arcadia/shared`, game-server, client. TAD §5.2 / §5.3 amended inline (no new ADR). |
| B | JWT validation | ✅ TAD default — `supabaseAdmin.auth.getUser(accessToken)` in `onAuth`. Local JWT verify only if Risk #1 fires. |
| C | Railway env (`SUPABASE_SERVICE_KEY` + `NEXT_PUBLIC_SUPABASE_URL`) | ✅ User action before Step 3. See setup guide delivered inline at plan-confirm time; capture completion in `phase-02_status.md`. |
| D | `/tavern` page shape | ✅ Replace `BuildingShell` on `/tavern` with `<GameTavern>` (Phaser TavernScene + React chat overlay). Academy + Market stay `BuildingShell` forever. Expanded explanation captured at plan-confirm time. |
| E | Member-count badge data source | ✅ `GET /rooms/:name/count` on game-server; world client polls every 3 s. |
| F | Load-test harness | ✅ `apps/game-server/scripts/loadtest.ts` as specified. |
| G | Reactions RPC | ✅ `toggle_reaction(p_message_id, p_emoji)` migration + `revoke update on tavern_messages from authenticated`. |

---

### Locked decisions (Phase 2)

| Decision | Value | Source |
|---|---|---|
| Colyseus version | 0.17+ (already wired in `@arcadia/game-server`) | ADR 0001 |
| Room types | `world-realm1` + `tavern-realm1`, both backed by `RealmRoom` | TAD §5.1 |
| Room cap | 50; MVP tests to 20 CCU | TAD §5.1 |
| MOVE rate | 20 updates/second from local avatar, throttled and deduped (skip if x/y/direction/isMoving unchanged) | TAD §4.3 |
| State schema | `AvatarState` + `RealmRoomState` as defined in `@arcadia/shared` (already exported from Phase 0) | TAD §5.2 |
| Message types | `MOVE`, `ENTER_BUILDING`, `LEAVE_BUILDING`, `UPDATE_LEVEL` — import `MSG` from `@arcadia/shared` | TAD §5.3 |
| Chat transport | **Supabase Realtime**, not Colyseus. Channel: `postgres_changes` on `public.tavern_messages` filtered `realm_id=eq.<uuid>` | TAD §5.3 warning |
| Chat history depth | 500 most recent messages loaded on Tavern entry, ordered `created_at desc` then reversed for rendering | phase-plan §Phase 2 Week 8 |
| Reaction storage | `tavern_messages.reactions` JSONB, shape `{ "🔥": ["memberId1", …], "❤️": […] }` | TAD §6.1 schema |
| Leaderboard query | `memberships` ordered by `xp DESC LIMIT 10` in current realm; subscribed to Realtime `UPDATE` on `memberships` | phase-plan §Phase 2 Week 8 |
| Remote-avatar rendering | Same `LocalAvatar` factory logic — Sprite if atlas registered for `avatarId`, Rectangle fallback otherwise. Display name + Lv badge attachments mirror local avatar | consistency with Phase 1 `local-avatar.ts` |
| Interpolation | Linear lerp from last-known to latest patched `(x, y)` at `sprites.config.avatar.walkSpeed`; snap if delta > 64 px (teleport / reconnect recovery) | TAD §4.3 "interpolated client-side for smooth movement" |
| Building entry protocol | Client sends `ENTER_BUILDING` to current world room **before** `router.push('/<building>')`; server logs and lets the natural `onLeave` fire when the WS disconnects on navigation. Mirror for `LEAVE_BUILDING` on return | TAD §5.3 |
| JWT pass-through | Client passes `supabase.auth.getSession().access_token` in `client.joinOrCreate(…, { accessToken })`. Room's `onAuth` validates; on failure Colyseus rejects join | TAD §5.4 |
| Folder convention | New `apps/web/components/game/scenes/tavern/` per ADR 0004 (TavernScene.ts + *.config.ts + __tests__/ + CLAUDE.md). New `apps/web/components/game/net/` for Colyseus client wrapper | ADR 0004 |
| Building-entry transition overlay | Shared React component `apps/web/components/game/BuildingTransition.tsx` parameterised by `building`. Background from `/transitions/<building>.png` (1×1 transparent-PNG placeholders land in Phase 2; real art is a file-level drop later, no code change). Spinner + "Entering the <Building>…" text. Mounts on each of the three building pages; hides when the page signals `ready` — TavernScene preload complete for `/tavern`, ~500 ms min-duration for the React-only `/academy` + `/market` shells | user decision 2026-04-19 |
| Secrets on Railway | `SUPABASE_SERVICE_KEY` + `NEXT_PUBLIC_SUPABASE_URL` (re-used as server-side URL) set on the `arcadia` service | derived from Pre-plan decision C |
| TAD amendment | `AvatarDirection` literal union updated to `'n'\|'e'\|'s'\|'w'` in TAD §5.2 / §5.3 + `docs/mvp/tad.md` v1.2 bump (optional; may ship as v1.1 in-place correction given early v1.1 status) | Pre-plan decision A |

---

### Steps

**Week 6 — Colyseus integration**

1. **Direction-enum rename.** Update `@arcadia/shared`: `AvatarDirection` → `'n'\|'e'\|'s'\|'w'`, `AvatarState.direction` default `'s'`, `MovePayload.direction` same. Drop client-local `FacingDirection` type; import from `@arcadia/shared`. Update `velocityToFacingDirection` call sites. Bump TAD §5.2 / §5.3 to match (inline edit). Run full test suite + typecheck to confirm no stragglers.
2. **Game-server — RealmRoom state + handlers.** Populate the Phase 0 stub (`apps/game-server/src/rooms/RealmRoom.ts`):
   - `onCreate`: `this.setState(new RealmRoomState())`; register handlers for `MSG.MOVE`, `MSG.UPDATE_LEVEL`, `MSG.ENTER_BUILDING`, `MSG.LEAVE_BUILDING` using `this.onMessage`.
   - `onJoin(client, options, auth)`: construct `AvatarState` from `auth` (memberId, displayName, avatarId, level, starting x/y from `sprites.config.avatar.spawnTile`) and `state.avatars.set(client.sessionId, avatar)`.
   - `onLeave`: `state.avatars.delete(client.sessionId)`.
   - `MOVE` handler: validate payload shape, clamp `(x, y)` to world bounds (bounds are static per-room; encode as `ROOM_BOUNDS[this.roomName]`), assign to the calling client's AvatarState.
   - `UPDATE_LEVEL`: guard `typeof level === 'number' && 1 ≤ level ≤ 5`; write to `avatar.level`.
   - `ENTER_BUILDING` / `LEAVE_BUILDING`: log only for Phase 2. Phase 4 may use these for analytics.
   - Unit tests in `apps/game-server/src/rooms/__tests__/RealmRoom.test.ts` against a stubbed client — exercise each handler, verify bounds clamp, verify level guard rejects out-of-range.
3. **Supabase JWT auth in `onAuth`.** Add `apps/game-server/src/lib/supabase-admin.ts` (service-role client, server-only — throws at import if `SUPABASE_SERVICE_KEY` missing). In `RealmRoom.onAuth(client, options)`: call `supabaseAdmin.auth.getUser(options.accessToken)`; on error throw `new ServerError(4401, 'Unauthorized')`. On success, fetch `memberships` row for `user.id` (select `avatar_id, display_name, level, realm_id`) and return `{ memberId, avatarId, displayName, level, realmId }` — consumed by `onJoin`. Tests mock `supabaseAdmin` + cover: invalid token → reject, expired token → reject, valid token + missing membership → reject, valid + present → accept.
4. **Railway env + redeploy.** (User action per Pre-plan decision C.) Confirm `SUPABASE_SERVICE_KEY` + `NEXT_PUBLIC_SUPABASE_URL` on Railway `arcadia` service; push merges trigger redeploy; `curl /health` still green; first WS connection attempts with a valid JWT succeed.
5. **Client — Colyseus wrapper.** New `apps/web/components/game/net/colyseus-client.ts`:
   - `connectToRoom({ roomName, accessToken, onJoin, onError })` — lazy-imports `colyseus.js` (not in server bundle), creates `Client(NEXT_PUBLIC_COLYSEUS_URL)`, joinOrCreate with `{ accessToken }`.
   - Exponential backoff reconnect (1 s → 30 s cap, max 5 attempts) on unexpected disconnect.
   - Exposes typed `send(type, payload)` bound to `MessagePayloads` for compile-time safety.
   - Cleanup function that leaves room + clears listeners — called from Phaser scene `shutdown`.
   - Tests: reconnect backoff math, payload-type inference snapshot.
6. **WorldScene — wire MOVE loop.** In `WorldScene.create()`, after LocalAvatar exists, call `connectToRoom('world-realm1', accessToken, { onJoin: room => this.room = room })`. Add a `sendMoveIfChanged()` method called from `update()` at most every 50 ms (20 Hz) — dedupes on `(x, y, direction, isMoving)` tuple equality. `ENTER_BUILDING` message sent in `onBuildingEntry` immediately before camera fade-out + router push. Unmount path destroys the room cleanly.
7. **Smoke test — two tabs.** User action on deployed Vercel: sign in on tab A + tab B (same or different accounts), open `/world` in each. Tab A's MOVE payloads arrive at Railway (confirm via Colyseus monitor at `/colyseus` — gated behind `COLYSEUS_MONITOR=true`, toggle temporarily). At this step remote avatars are **not yet rendered** (Week 7) — but state should contain two entries.

**Week 7 — Remote avatars + presence**

8. **Remote-avatar rendering.** Extract `LocalAvatar` into a shared `AvatarRenderer` + two thin subclasses (`LocalAvatar`, `RemoteAvatar`) — or keep one class with a `mode: 'local'|'remote'` option. `RemoteAvatar` has no input wiring, no physics body (it's kinematic), only position-setting. WorldScene subscribes to `state.avatars.onAdd` → construct `RemoteAvatar` from schema fields (skip if `sessionId === room.sessionId`), register with the y-sort list, store in `Map<sessionId, RemoteAvatar>`. `onRemove` → destroy + unregister. `onChange` → queue interpolation target (Step 9). Unit test: factory returns RemoteAvatar for non-self sessionIds and skips self.
9. **Client-side interpolation.** `RemoteAvatar` tracks `{ lastX, lastY, targetX, targetY, lastPatchAt }`. In scene `update()`, lerp render position toward `target` at `walkSpeed`; snap if `distance(target, last) > 64 px` (reconnect or teleport). Direction + `isMoving` used to select sprite frame (reuse Phase 1 `avatar-animations` map). Test: lerp step produces expected intermediate positions; snap threshold fires correctly.
10. **TavernScene + interior tilemap.** Create `apps/web/components/game/scenes/tavern/` per ADR 0004 — TavernScene.ts, camera.config.ts, sprites.config.ts, layers.config.ts, __tests__/configs.test.ts, CLAUDE.md. Author `apps/web/public/maps/tavern.tmj` — small interior (15×15), entrance tile in the north wall, collision at walls + bar counter + scattered tables. Spawn tile = directly inside the entrance. Tilemap references the existing `world.png` iso tileset (re-use; no new art).
11. **`/tavern` page swap.** Replace `BuildingShell` on `/tavern` with a new `app/tavern/page.tsx` that renders `<GameTavern />` (mirrors `GameWorld` — dynamic import with `ssr:false`, Supabase member fetch, Phaser mount with BootScene + TavernScene). Chat overlay container exists as an empty positioned div (wired in Week 8). "Return to World" link preserved as floating UI. On mount, joins `tavern-realm1` via Colyseus; on unmount, leaves it.
12. **Building-entry transition overlay scaffold.** Ship the shared transition surface for all three buildings so later art drops are code-free:
    - `apps/web/components/game/BuildingTransition.tsx` — fullscreen absolute overlay, props `{ building, ready }`. Layout: centered background image (`<Image src="/transitions/<building>.png" />`), title "Entering the <Building Name>…", Tailwind `animate-spin` border-spinner. Fades to opacity 0 when `ready === true` (200 ms CSS transition), then unmounts.
    - `apps/web/public/transitions/{tavern,academy,market}.png` — committed as 1×1 transparent PNGs (use the existing `scripts/generate-placeholder-tileset.mjs` helper style: a minimal Node emit). Real art is a later file-level swap — same path, same dimensions-agnostic `<Image>` usage.
    - Wire into `app/tavern/page.tsx` (Step 11): overlay mounted with `ready = preloadProgress >= 1 && fetchState.status === 'ready'` — reuses the Phase 1 `GameWorld` progress pattern.
    - Wire into `app/academy/page.tsx` + `app/market/page.tsx`: overlay mounted with a fixed `setTimeout(() => setReady(true), 500)` so the placeholder shows as a smooth beat rather than a flash. `BuildingShell` renders underneath unchanged.
    - Unit test: component flips to `opacity-0 pointer-events-none` when `ready` becomes true; renders the correct `src` per `building` prop.
13. **Member-count endpoint + world badge.** Game-server: add `GET /rooms/:name/count` route to the Express app in `apps/game-server/src/index.ts` — returns `{ name, count }` using `matchMaker.query({ name })`. World client: new `apps/web/components/game/world/member-count-badge.ts` that polls `${NEXT_PUBLIC_COLYSEUS_URL.replace('wss://','https://')}/rooms/<name>/count` every 3 s and renders a Phaser Text above each building's entrance zone. Registered with the y-sort list so it respects depth. Graceful fallback to "—" on fetch error.
14. **Load test harness.** `apps/game-server/scripts/loadtest.ts` + npm script `loadtest`:
   - Seeds 20 test users via Supabase service-role client (if not already seeded) under emails `load-01@arcadia.test` … `load-20@arcadia.test`, each with a `memberships` row + avatar_id set.
   - Mints session tokens via `supabase.auth.admin.generateLink('magiclink', …)` or password sign-in.
   - Spawns 20 Colyseus clients connecting to `world-realm1`, each sending MOVE at 20 Hz in a circular path for 60 s.
   - A 21st "observer" client logs wall-clock delay between peer state-patch arrival and the observer's `onStateChange`.
   - Emits p50 / p95 / p99 latency summary; fails (exit 1) if p95 > 100 ms locally.
15. **Two-tab manual test.** On Vercel: two authed tabs, walk each avatar in `/world`; observe both render and interpolate smoothly in the other tab. Walk one into Tavern; the other sees the first disappear; navigate into Tavern in tab B; both render in the tavern interior. Return both; badges on building entrances reflect counts.

**Week 8 — Tavern chat + reactions + leaderboard**

16. **Supabase Realtime publication + migration prep.** New migration `supabase/migrations/<ts>_phase2_realtime_and_reactions.sql`:
    - `alter publication supabase_realtime add table public.tavern_messages;`
    - `alter publication supabase_realtime add table public.memberships;` (for leaderboard + UPDATE_LEVEL trigger path)
    - Define `public.toggle_reaction(p_message_id uuid, p_emoji text)` — security-definer, validates caller is member of the message's realm, atomically toggles `auth.uid()` in `reactions->>emoji` array, returns the updated row's reactions JSONB.
    - `revoke update on tavern_messages from authenticated;` — belt-and-braces: all reaction writes must go through the RPC. (The existing `chat_react` policy stays; the revoke is additive.)
17. **Chat UI + send.** React component `apps/web/components/tavern/chat-panel.tsx` overlaid on TavernScene. Scrollable message list + composer + send button. Send path: `supabase.from('tavern_messages').insert({ realm_id, sender_id: user.id, content })`. RLS `chat_write` already permits. Optimistic UI: append pending message with a temporary client id, replace on Realtime INSERT echo.
18. **Chat history on entry.** On TavernScene mount, fetch `tavern_messages` `WHERE realm_id = <realm> ORDER BY created_at DESC LIMIT 500`, reverse for rendering. Show loading state until fetch resolves.
19. **Chat live updates.** `supabase.channel('tavern-chat').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tavern_messages', filter: 'realm_id=eq.<uuid>' }, handler).subscribe()`. Handler appends to message list, dedupes against optimistic echo.
20. **Reactions UI + RPC call.** Hover / long-press a message to open emoji picker (seed with 6 emoji for MVP: 🔥 ❤️ 😂 👀 🎉 💯). Click → `supabase.rpc('toggle_reaction', { p_message_id, p_emoji })`. Display a pill per emoji under the message showing count + caller-included flag.
21. **Reactions live updates.** Same channel adds an `UPDATE` filter on the same table; handler merges the new `reactions` JSONB into the corresponding local message. Tested by a second tab reacting to the first tab's message.
22. **XP leaderboard sidebar.** New React component `leaderboard-panel.tsx`:
    - Initial fetch: `memberships` `WHERE realm_id = <realm> ORDER BY xp DESC LIMIT 10`.
    - Realtime subscription: `postgres_changes` `UPDATE` on `memberships` filter `realm_id=eq.<uuid>`; on event, re-sort local top-10.
    - Rendered docked to the right side of the Tavern overlay. Shows display name + xp + level badge (level=1 for everyone in Phase 2).
23. **Cross-member leakage extension.** Extend `apps/web/tests/rls-cross-member-leakage.test.ts` with: (a) `toggle_reaction` from realm A cannot mutate a realm B message; (b) direct `UPDATE tavern_messages` from an authenticated role fails (after `revoke update`); (c) `toggle_reaction` can only flip the caller's own UUID in the emoji array, never someone else's.
24. **`/security-review` on the Week-8 diff.** Per CLAUDE.md this is mandatory before merge — touches auth, RLS, realtime, RPC. Fix anything flagged.

---

### Test criteria (Phase 2 exit)

All must pass before Phase 3 starts. The exit gate is the **end-to-end two-tab run**; the rest is the checklist.

- **Two-tab end-to-end on Vercel prod:** tab A and tab B signed in as different accounts. Both open `/world` → see each other's avatars move with smooth interpolation. Tab A walks into Tavern → disappears from tab B's world. Tab B walks into Tavern → both see each other inside. Tab A sends a message → appears in tab B within 500 ms. Tab B reacts with 🔥 → tab A sees the reaction within 500 ms. Both return to `/world` → reappear in each other's view.
- **Colyseus auth:** invalid, expired, and missing JWTs all produce a 4401 reject; valid + membership-missing still rejects; valid + membership-present accepts. Covered by unit tests + one manual invalid-token curl.
- **MOVE latency:** `apps/game-server/scripts/loadtest.ts` with 20 CCU logs p95 < 100 ms locally. Recorded in a new `planning/architecture/realtime.md` (create if absent).
- **Chat INSERT propagation:** a Vitest integration test using two Supabase clients in the same realm verifies that an INSERT on tab A's client triggers the `postgres_changes` handler on tab B's client within 1 s.
- **Reactions RPC boundary:** the RLS extension suite proves `toggle_reaction` cannot mutate any column other than `reactions`, and cannot impersonate another member's UUID. Direct UPDATE on `tavern_messages` from the `authenticated` role fails.
- **Member-count badge:** joining / leaving `tavern-realm1` reflects in the `/world` badge within 3 s (two-tab manual check).
- **Building-entry transition overlay:** navigating from `/world` into any of the three buildings renders the `BuildingTransition` overlay with the per-building placeholder PNG + spinner, then fades out when the destination is ready (Tavern on Phaser preload complete; Academy/Market after the 500 ms min-duration). Swapping `/transitions/<building>.png` with a real asset of any dimension renders correctly without code change.
- **No chat-through-Colyseus drift:** grep the game-server source for any reference to `tavern_messages` or chat content — must be zero. TAD §5.3 warning stands.
- **Config + folder discipline:** TavernScene has its own `scenes/tavern/*.config.ts` set; no magic numbers in `TavernScene.ts`; per-scene `CLAUDE.md` smoke test (`claude` scoped to that folder can answer "what does this scene do and what can I tweak").
- **Avatar direction enum:** grep `'up'\|'down'\|'left'\|'right'` in `@arcadia/shared`, `@arcadia/game-server`, `@arcadia/web` `/components/game/` — must be zero matches. TAD §5.2/§5.3 reflects the new union.
- **CI:** all existing Phase 0 + Phase 1 checks still green; new tests added and passing — RealmRoom handlers, onAuth, Colyseus reconnect backoff, RemoteAvatar interpolation, tavern config shape, extended RLS suite.
- **`/security-review` clean** on the Week 8 diff (auth + RLS + realtime + RPC surface).

---

### Risks / unknowns

| # | Item | Mitigation |
|---|---|---|
| 1 | **20-CCU latency on Railway may exceed 100 ms** when cold-start or cross-region RTT stacks with Supabase auth round-trip per join. | If load test fails: switch `onAuth` to local JWT verify using `SUPABASE_JWT_SECRET` (TAD §5.4 deferred optimisation). Adds code but removes one network hop. |
| 2 | **Next.js remount of Phaser on `/world` ↔ `/tavern` navigation** — Colyseus client + room must be destroyed on scene shutdown or sockets leak. | Explicit cleanup in both `GameWorld` and `GameTavern` `useEffect` returns; manual DevTools-network check that old WS is closed before the new one opens. |
| 3 | **Supabase Realtime filter uses UUID string at subscribe time** — if the realm lookup is async, there's a small window where the subscription isn't active yet. | Await the realm fetch before calling `.subscribe()`. Show a "connecting…" state during the gap. |
| 4 | **Reconnect mid-move** — on a Railway cold restart, clients lose their AvatarState entry. | Exponential-backoff reconnect + `joinOrCreate` resumes cleanly; the new session gets a fresh sessionId and the old entry eventually times out. Test by restarting the Railway service mid-session. |
| 5 | **Interpolation jitter** on variable-latency links — out-of-order patches produce visible stutter. | Interpolate from *last rendered* position (not last server position) toward the newest patch; snap only when delta > 64 px. |
| 6 | **Member-count endpoint is unauthenticated** and exposes realm occupancy. | Acceptable for MVP (occupancy is non-sensitive). Add rate-limiting middleware if abuse signal appears. Not a blocker. |
| 7 | **Double-mount of Phaser in dev mode** under React StrictMode. | Phase 1 already handles this in `GameWorld`; `GameTavern` mirrors the pattern. |
| 8 | **Avatar atlas coverage** — avatars 02–08 don't have sheets yet (Phase 1 post-merge work). Remote players with those IDs render as coloured Rectangles. | Documented as expected; user is authoring sheets in parallel. When each sheet lands, it's a file-level drop into `public/avatars/` + a row in `AVATAR_SHEETS`. |
| 9 | **Load-test user seeding is destructive** — creates 20 real auth.users rows. | Scope to a dedicated `load-*@arcadia.test` namespace; provide a teardown command. Never run against prod Supabase — hard-block via a ref check mirroring the RLS suite's guard. |
| 10 | **Email-as-real-signal in leaderboard** — `display_name` defaults to the email prefix (Phase 0 signup trigger). Pre-Loom polish work may want a nicer default. | Not blocking; flag as Phase 5 polish. |

---

### Out of scope for Phase 2

Explicitly deferred: XP awards + triggers (Phase 5), level-up banners (Phase 5), daily-login XP (Phase 5), course content of any kind (Phase 3), CF Stream integration (Phase 3), Academy + Market + creator dashboard surfaces beyond their existing shells (Phase 3–4), course completion analytics (Phase 4), DAU chart (Phase 4), Google OAuth (Phase 0 carryover), real-art 60 FPS measurement (Phase 5 polish).

Phase 2 is: two rooms, remote avatars, Tavern chat with reactions, leaderboard sidebar, member-count badges. Nothing else.

---

### Execution discipline (from CLAUDE.md and phases/CONTEXT.md)

1. This plan is stopped here pending user confirmation on Pre-plan decisions A–G before any Step 1 work begins.
2. Once approved, open `phase-02_status.md` and log progress chronologically (newest at top), same format as `phase-01_status.md`.
3. Test each step's exit criteria before moving on. Do not batch verification.
4. Run `/security-review` before the Week 8 merge — touches auth, RLS, realtime, and a new RPC.
5. Flag scope creep or architectural concerns the moment they appear — do not paper over.
