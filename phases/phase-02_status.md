# Phase 2 — Status

Source plan: `phase-02_plan.md`. Status entries are chronological, newest at the top.

---

## 2026-04-19 — Phase 2 kickoff

**Context:** Phase 1 shipped to prod 2026-04-19 (commit `43b4297` + post-merge art work on `main`). Phase 2 plan locked same day. Pre-plan decisions A–G approved as recommended. Railway env (`SUPABASE_SERVICE_KEY` + `NEXT_PUBLIC_SUPABASE_URL`) added to the `arcadia` service; redeploy successful — `/health` returns 200. Starting Week 6.

**Step 1 in progress — direction-enum rename.**

Scope:

- `@arcadia/shared`: `AvatarDirection` becomes `'n' | 'e' | 's' | 'w'` sourced from a new `AVATAR_DIRECTIONS` tuple; `AvatarState.direction` default → `'s'`; `MovePayload.direction` retyped to `AvatarDirection`.
- `@arcadia/web` client: drop the local `FacingDirection` alias + `FACING_DIRECTIONS` tuple (scenes/shared/types.ts); drop the dead `Direction = 'up'|'down'|'left'|'right'` type; all scene code imports `AvatarDirection` from `@arcadia/shared`. `resolveInputDirection` and `resolveClickTargetVelocity` return cardinal literals.
- TAD §5.2 / §5.3: inline amendment (no new ADR — refinement of existing locked decision).
- Game-server has no direct usage today, but the shared rebuild flows through.

Test bar for Step 1: lint + typecheck + vitest green across all three workspaces; no `'up'|'down'|'left'|'right'` literal in `@arcadia/shared`, `@arcadia/web /components/game/`, or `@arcadia/game-server`.

**Done — Step 1 (Direction-enum rename):**

- **`@arcadia/shared`:** added `AVATAR_DIRECTIONS = ['n','e','s','w'] as const` tuple to `schemas/AvatarState.ts`; `AvatarDirection` derived from it; `AvatarState.direction` default changed from `'down'` → `'s'` and typed `AvatarDirection`. `protocol/messages.ts` `MovePayload.direction` retyped to `AvatarDirection` (import from the schema). `index.ts` exports `AVATAR_DIRECTIONS` alongside the type.
- **Workspace dep plumbing:** added `"@arcadia/shared": "*"` to both `apps/web/package.json` and `apps/game-server/package.json` (neither consumed the shared package before; Phase 2 is the first phase that needs the shared types on the client + server). `npm install` linked via npm workspaces. Ran `npm run build --workspace @arcadia/shared` to refresh `packages/shared/dist/`.
- **Client types.ts:** dropped the orthogonal `Direction = 'up'|'down'|'left'|'right'` alias (was dead — only input.ts used it); dropped local `FACING_DIRECTIONS` tuple + `FacingDirection` alias. `scenes/shared/types.ts` now re-exports `AvatarDirection` + `AVATAR_DIRECTIONS` from `@arcadia/shared` so scene code has one name to import.
- **Input math:** `scenes/world/input.ts` — `resolveInputDirection`, `resolveClickTargetVelocity`, `inferDirectionFromDelta`, `velocityToFacingDirection` all now typed `AvatarDirection` and return cardinal literals (`'n'|'e'|'s'|'w'`). Function names kept for readability.
- **Consumer migrations:** `scenes/world/local-avatar.ts`, `scenes/world/avatar-animations.ts`, `scenes/boot/asset-manifest.ts` — `FacingDirection` → `AvatarDirection` throughout (`replace_all`). `WorldScene.ts:328` prev-direction literal `'right'` → `'e'`.
- **Test suite:** `scenes/world/__tests__/input.test.ts` rewritten — 17 assertions now use cardinal literals across `resolveInputDirection`, `resolveClickTargetVelocity`, and `velocityToFacingDirection`.
- **TAD §5.2 amendment:** inline edit in `docs/mvp/tad.md:163` — `direction: string; // 'up' | 'down' | 'left' | 'right'` → `direction: AvatarDirection; // 'n' | 'e' | 's' | 'w' (cardinal; amended 2026-04-19)`. Phase 2 Plan pre-plan decision A approved this as an inline amendment rather than a new ADR.
- **CLAUDE.md updates:** `scenes/shared/CLAUDE.md` types entry updated to describe the `@arcadia/shared` re-export shape.

**Verification (Step 1 exit):**

- `npm run typecheck` — ✅ clean across all three workspaces
- `npm run lint` — ✅ clean across all three workspaces
- `npm run test` — ✅ **85 passed, 13 RLS skipped (98 total)** — same pass count as Phase 1 exit; no regressions.
- `npm run build --workspace @arcadia/shared` — ✅ dist rebuilt
- `npm run build --workspace @arcadia/web` — ✅ Next.js production build clean. `/world` route 341 kB / 490 kB first-load (~20 kB bump from pulling the shared package's schema types into the client bundle — expected and within budget).
- **Test-criterion grep (`'up'|'down'|'left'|'right'`):** ✅ zero matches across `packages/shared/src`, `apps/web/components/game`, `apps/game-server/src`.

Step 1 did not introduce runtime behaviour change beyond the type-level rename. Interactive visual verification deferred to after Step 6 when `/world` next actually runs in a browser.

---

### Ready for Step 2 (Game-server — RealmRoom state + handlers).

**Done — Step 2 (Game-server — RealmRoom state + handlers):**

- **`apps/game-server/src/rooms/room-config.ts`** — per-room spawn + bounds lookup. World spawn `(0, 480)` matches client's iso projection of `worldSpritesConfig.avatar.spawnTile (15, 15)` (pixelX = (15-15)*32 = 0; pixelY = (15+15)*16 = 480). Tavern placeholder `(0, 0)` — tightened when `tavern.tmj` lands Week 7 Step 10. Bounds are a coarse DoS guard; tile-perfect collision stays client-side.
- **`apps/game-server/src/rooms/realm-handlers.ts`** — pure handler logic extracted so Vitest can exercise it directly without booting a Colyseus server:
  - `AuthInfo` type — shape that `onAuth` will return in Step 3 (member identity + realm + avatar + level).
  - `createAvatarState(auth, spawn)` — builds an `AvatarState` from `@arcadia/shared` seeded from auth + spawn; defaults `direction='s'`, `isMoving=false`; clamps level to `[1..5]`.
  - `applyMove(avatar, payload, bounds)` — validates payload shape (finite numbers, cardinal direction from `AVATAR_DIRECTIONS`, boolean `isMoving`), clamps `(x, y)` to bounds, mutates avatar. Returns `true`/`false` so the message handler can log rejects.
  - `applyUpdateLevel(avatar, payload)` — integer level in `[MIN_LEVEL..MAX_LEVEL]` (1..5 per TAD §5.3); mutates on accept.
  - `parseBuildingPayload(payload)` — returns the building name (`tavern`/`academy`/`market`) or `null`.
- **`apps/game-server/src/rooms/RealmRoom.ts`** — populated the Phase 0 stub:
  - `extends Room<{ state: RealmRoomState }>` (Colyseus 0.17 moved to the options-shape generic; `RoomOptions` is now the first parameter).
  - `onCreate`: `setState(new RealmRoomState())`, wires `MSG.MOVE` / `MSG.UPDATE_LEVEL` / `MSG.ENTER_BUILDING` / `MSG.LEAVE_BUILDING` → the pure handlers above. Bounds captured from `getRoomConfig(this.roomName)` once per room instance.
  - `onJoin(client, _options, auth: AuthInfo)` — logs + `state.avatars.set(sessionId, createAvatarState(auth, spawn))`. Until Step 3 ships `onAuth`, Colyseus's default passes `undefined` — not yet safe to connect without implementing `onAuth` first. Tests don't go through the framework so this isn't a Step-2 blocker.
  - `onLeave` — deletes the session's AvatarState from `state.avatars`.
- **Vitest config** — `apps/game-server/vitest.config.ts` created (mirrors `packages/shared/vitest.config.ts`): `include: ['src/**/*.test.ts']`, `environment: 'node'`.
- **Tests — `apps/game-server/src/rooms/__tests__/realm-handlers.test.ts`** — 16 assertions across `createAvatarState` (field population, level clamping, non-integer reject), `applyMove` (accept, clamp, reject on bad shape / non-cardinal direction / non-finite coords / non-boolean flag; reject leaves avatar untouched), `applyUpdateLevel` (accept all 5 valid levels; reject out-of-range, non-integer, non-numeric, missing), `parseBuildingPayload` (accept three names, reject malformed).

**Typecheck gotcha caught + fixed:** `class RealmRoom extends Room<RealmRoomState>` → `Room<{ state: RealmRoomState }>`. Colyseus 0.17 refactored the Room generic to an options-shape object (`RoomOptions`); state is extracted via `ExtractRoomState<T>`. TS error `TS2559` flagged the mismatch on first compile.

**Verification (Step 2 exit):**

- `npm run typecheck` — ✅ clean across all three workspaces
- `npm run lint` — ✅ clean
- `npm run test` — ✅ **101 passed, 13 RLS skipped (114 total)**. 16 new game-server tests; web suite unchanged at 85 passing.
- `npm run build --workspace @arcadia/game-server` — ✅ clean (emits `dist/`)

Step 3 wires the JWT validation in `onAuth` so `onJoin`'s `auth: AuthInfo` argument is populated from Supabase, and redeploys to Railway.

### Ready for Step 3 (Supabase JWT auth in `onAuth`).

**Done — Step 3 (Supabase JWT auth in `onAuth`) + Step 4 (Railway env, user pre-confirmed):**

- **`apps/game-server/src/lib/supabase-admin.ts`** — service-role client factory. Reads `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_KEY` at module load; throws immediately if either is missing (fail-fast boot per TAD §5.4 intent). `autoRefreshToken: false` + `persistSession: false` — admin client is stateless.
- **Dependency:** `@supabase/supabase-js@^2.47.0` added to `apps/game-server/package.json` (already hoisted via web workspace; `npm install` linked it). No bump to @types — supabase-js ships its own.
- **`apps/game-server/src/rooms/realm-auth.ts`** — pure `authenticateJoin(token, supabase) → Promise<AuthInfo>`:
  - Short-circuits + throws `ServerError(4401)` on missing / non-string token.
  - Calls `supabase.auth.getUser(token)`; rejects on error or null user.
  - Fetches `memberships` row (`realm_id, avatar_id, display_name, level`) via `from('memberships').select(...).eq('member_id', userId).maybeSingle()`; rejects on error, missing row, or null `avatar_id` (defence-in-depth against browser-side middleware bypass).
  - Returns `AuthInfo` — becomes `client.auth` in `onJoin`.
  - Exports a narrow `AuthSupabase` interface covering only what the function uses — lets tests pass a plain object stub.
  - Exports `UNAUTHORIZED_CODE = 4401`.
- **`RealmRoom.onAuth` wired:**
  - Signature matches Colyseus 0.17's `(client, options, context: AuthContext)`.
  - `extractAccessToken(options, context)` helper reads `options.accessToken` first, falls back to `context.token` (Authorization header path). Step 5's client will pass it via options.
  - Real `supabaseAdmin` passed via `as unknown as AuthSupabase` — the narrow interface captures exactly what the function needs; the cast asserts supabase-js's typed query builder satisfies it at runtime (PostgrestBuilder is thenable but not a `Promise` shape, which is why the direct type widening doesn't work).
- **Tests — `apps/game-server/src/rooms/__tests__/realm-auth.test.ts`** — 8 assertions across the full matrix:
  - Missing token (undefined + empty string) → 4401
  - Supabase auth error (invalid / expired JWT) → 4401
  - Supabase returns no user without error → 4401
  - Membership lookup errors out → 4401
  - User has no membership row → 4401
  - `avatar_id` is null (picker not completed) → 4401
  - Valid token + complete membership → returns correctly-shaped `AuthInfo`
  - Null `display_name` / `level` in membership row → defaults applied (`''`, `1`)

**Typecheck gotcha caught + fixed:** `SupabaseClient.from().select().eq().maybeSingle()` returns `PostgrestBuilder` (thenable, not a `Promise` — it has extra methods + lacks `Symbol.toStringTag`). Assigning the real client to the narrow `AuthSupabase` interface directly failed with `TS2589` + `TS2345`. Fix: cast at the single call site in `RealmRoom.onAuth`. Keeps the test interface tight without polluting the runtime shape.

**Step 4 — Railway env:** user confirmed redeploy success + `/health` green before Step 1. The Step-3 code hasn't been pushed yet; deployment-side verification of `supabase-admin`'s env check + a valid-JWT join lands naturally on the next git push (likely at end of Step 5 or Step 7). If env is missing, boot will crash loudly in Railway logs — no silent fail path.

**Verification (Step 3 exit):**

- `npm run typecheck` — ✅ clean
- `npm run lint` — ✅ clean
- `npm run test` — ✅ **109 passed, 13 RLS skipped (122 total)**. 8 new auth tests.
- `npm run build --workspace @arcadia/game-server` — ✅ clean

### Ready for Step 5 (Client — Colyseus wrapper).

**Done — Step 5 (Client — Colyseus wrapper):**

- **Dependency:** `colyseus.js@^0.16.0` → resolves to `0.16.22`. Server runs `colyseus@^0.17` (Node); the two packages track compatibility despite their version-number divergence (historical artifact of split repos — Colyseus JS Client 0.16 is paired with Server 0.17 per Colyseus docs).
- **`apps/web/components/game/net/colyseus-client.ts`** — scene-agnostic wrapper:
  - `connectToRoom(opts): Promise<ColyseusConnection>` — lazy `await import('colyseus.js')` so the Colyseus SDK stays out of any bundle that doesn't actually talk to the game-server. Passes `{ accessToken }` to `joinOrCreate` — consumed by the Step-3 `onAuth`.
  - Fires `onConnected(room)` on initial join + on every successful auto-reconnect so scene code can re-subscribe state events in one callback.
  - Auto-reconnect: `onLeave` with any non-intentional code (≠1000) schedules a reconnect with `calculateReconnectDelayMs(attempt)` — 1 s / 2 s / 4 s / 8 s / 16 s / 30 s cap, up to `maxReconnectAttempts` (default 5). On success, attempt counter resets. On exhaustion, `onReconnectFailed` fires.
  - `leave()` sets an `intentionallyLeft` flag, clears any pending reconnect timer, then calls `room.leave(true)` — guarantees the reconnect loop can't race past an explicit leave.
  - Typed `send<M>(type: M, payload: MessagePayloads[M])` — `MSG.MOVE` → payload inferred as `MovePayload`, etc. Returns `false` if disconnected (consumer decides whether to queue/drop).
  - Re-exports `MSG` so scenes import one symbol.
  - Narrow `ColyseusRoom` shape (state + sessionId + send + leave + onLeave + onError) exposed to consumers — Colyseus's full Room generic is hidden behind the cast in `connectToRoom`.
- **Tests — `apps/web/components/game/net/__tests__/colyseus-client.test.ts`** — 6 assertions:
  - `calculateReconnectDelayMs`: base case (attempt 0 = 1000 ms), doubling (2000 / 4000 / 8000 / 16000), clamp at 30000 past attempt 5, negative-attempt guard.
  - Protocol constants: `INTENTIONAL_LEAVE_CODE === 1000`, `DEFAULT_MAX_RECONNECT_ATTEMPTS === 5`.
- **Runtime path isn't unit-tested** — the reconnect loop + `joinOrCreate` path depend on a live Colyseus server and intentional-disconnect semantics; integration validation lands at Step 7 (two-tab smoke test on Vercel prod) and Step 13 (loadtest harness exercising 20 CCU + the backoff loop under artificial restarts).

**Verification (Step 5 exit):**

- `npm run typecheck` — ✅ clean
- `npm run lint` — ✅ clean
- `npm run test` — ✅ **115 passed, 13 RLS skipped (128 total)**. 6 new colyseus-client tests.
- `npm run build --workspace @arcadia/web` — ✅ clean. `/world` still 341 kB / 490 kB first-load — colyseus.js is lazy-imported, so it only lands in the bundle once WorldScene wires `connectToRoom` in Step 6.

### Ready for Step 6 (WorldScene — wire MOVE loop).

**Done — Step 6 (WorldScene — wire MOVE loop):**

- **`GameWorld.tsx` rework:**
  - `fetchMember` → `fetchSession` — now returns `{ member, accessToken }` using `supabase.auth.getSession()` (was `.getUser()`; session gives us the access token needed for Colyseus).
  - After session fetch, awaits `connectToRoom({ endpoint, roomName: 'world-realm1', accessToken, onConnected, onReconnectFailed })` **before** Phaser is mounted — if the initial Colyseus join fails (bad JWT, server down, bad env), renders the error UI instead of an empty canvas.
  - `NEXT_PUBLIC_COLYSEUS_URL` read at module top; missing env trips the error path with a clear message.
  - Connection written into Phaser registry under `COLYSEUS_CONNECTION_REGISTRY_KEY`.
  - Cleanup: `game.destroy(true)` + `connection.leave()` on unmount (Next.js route change). Race guard via `cancelled` flag — if component unmounts while the async connect is in flight, the resolved connection is immediately left rather than leaked.
  - `onReconnectFailed` plumbs the error up into React state so the "Couldn't load the world" overlay shows once the 5-attempt backoff loop gives up.
- **`WorldScene.ts`:**
  - New registry key `COLYSEUS_CONNECTION_REGISTRY_KEY` + `MOVE_INTERVAL_MS = 50` (20 Hz per TAD §4.3).
  - Private state `colyseus?: ColyseusConnection`, `lastMoveSentAt: number`, `lastMoveState: MoveState | null`.
  - `create()` reads the connection from registry after all Phaser objects are built.
  - `sendMoveIfChanged(now)` — composes a `MoveState` from `localAvatar`, delegates the send-or-skip decision to the pure `shouldSendMove(...)`, and on send records `(lastMoveSentAt, lastMoveState)` for the next tick.
  - `update()` calls `sendMoveIfChanged(this.time.now)` once per frame after `syncAttachments()`.
  - `onBuildingEntry(name)` now emits `MSG.ENTER_BUILDING { building: name }` immediately before the camera fade-out — gives the server a clean signal (logged in Phase 2, kept in reserve for Phase 4 analytics).
  - `import { MSG } from '@arcadia/shared'` — client writes the exact message-type constants the server listens for.
- **`apps/web/components/game/scenes/world/move-throttle.ts`** — pure module extracted for testability:
  - `MoveState` type.
  - `moveStateEqual(a, b)` — field-wise equality.
  - `shouldSendMove(current, lastSent, lastSentAt, now, intervalMs)` — decision tree:
    - `lastSent === null` → true (first send always goes through; prevents an off-by-one with `lastSentAt = 0 = now = 0` on the first frame).
    - Current equals last → false (idle dedup).
    - `now - lastSentAt < intervalMs` → false (20 Hz cap).
    - Else → true.
- **Tests — `apps/web/components/game/scenes/world/__tests__/move-throttle.test.ts`** — 8 assertions: field equality across all four keys, first-send carve-out, idle dedup ignoring time, changed-state throttle (49 / 50 / 60 ms boundary), flip of `isMoving`, flip of `direction`, non-zero `lastSentAt` interval math.
- **Bug caught by the test suite:** initial draft skipped the `lastSent === null` carve-out. First-frame with `now=0, lastSentAt=0, interval=50` returned `false` because `0 - 0 = 0 < 50`. Fixed by short-circuiting on `lastSent === null`; the test that caught it ("first move always sends") stays in the suite as a regression guard.

**Verification (Step 6 exit):**

- `npm run typecheck` — ✅ clean
- `npm run lint` — ✅ clean
- `npm run test` — ✅ **123 passed, 13 RLS skipped (136 total)**. 8 new move-throttle tests.
- `npm run build --workspace @arcadia/web` — ✅ clean. `/world` now 342 kB / 494 kB first-load (was 341 / 490 — +1 kB / +4 kB shared-chunk bump from pulling `colyseus.js` + the `@arcadia/shared` barrel into the client bundle).

**Pending — Step 7 (smoke test — two tabs on Vercel prod):**

- Requires a push to origin so Railway + Vercel auto-deploy the new code. Then open the deployed `/world` in two authed tabs and:
  - confirm both connect to `world-realm1` (check browser devtools WS frames or Railway logs);
  - confirm the server logs `join <sessionId> member=<uuid>` for each connect;
  - confirm MOVE frames stream at ≤20 Hz when the local avatar moves and stop when idle (DevTools Network → WS → inspect frames);
  - confirm no 4401 rejects with a valid session.
- Remote-avatar rendering (seeing each other's avatars in the scene) is Step 8 — Step 7 only validates the MOVE loop + auth.
- I will not push without explicit go-ahead per the project's general "don't push without asking" rule, even under autonomous step execution. When ready to deploy, say "push" and I'll commit + push the cumulative Week-6 diff as a single PR.

### Ready for Step 8 (Remote-avatar rendering).
