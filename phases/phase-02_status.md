# Phase 2 — Status

Source plan: `phase-02_plan.md`. Status entries are chronological, newest at the top.

**Weeks 6 + 7 shipped to prod 2026-04-19** (PR #2 squash-merged as `ad6cb41`; follow-on deploy-compatibility fixes through `cd77f58`; commit `7dfc566` adds `avatar-02` LPC-female art). Prod: two tabs at `https://arcadia-web-swart.vercel.app/world` render each other's avatars in real time; Tavern join/leave works; member-count badge reflects occupancy within 3 s. Small interpolation lag noted ("slight lag though no worries there" — user) — tune in Week 8 polish if it remains visible against real art. Week 8 (chat + reactions + leaderboard + `/security-review`) not yet started.

### Cyberpunk world.tmj ingestion (2026-04-19 evening)

User provided a redesigned `world.tmj` with cyberpunk-themed art (zip at `~/Downloads/Arcadia/`). Ingested:

- `apps/web/public/tilesets/world.png` — unchanged (base iso terrain — firstgid 1)
- `apps/web/public/tilesets/world-alt.png` — **stand-in copy of world.png** (user's source zip didn't include the `output-onlinepngtools (2)-Photoroom.png` that the TMJ references at firstgid 122; drop the real PNG into this path to replace the stand-in — world.tmj ground + decor tiles in gid range 122-242 will render correctly once it lands)
- `apps/web/public/tilesets/decor.png` — user-supplied 1408×1408 11×11 grid of 128×128 cyberpunk props (trees, lamps, benches, signs, neon floor tiles; firstgid 243)
- `apps/web/public/tilesets/academy.png` — user-supplied 168×166 single-tile Academy building sprite (firstgid 364; placed at tile (12, 6) in the decor layer)
- `apps/web/public/maps/world.tmj` — replaced. 30×30, three layers: `ground` / `collision` (hidden-in-Tiled, drives physics only) / `decor`. Tileset refs rewritten from external `.tsx` (Tiled's native format) to inline definitions pointing at our `/tilesets/` paths.

Code deltas for multi-tileset support:

- `scenes/boot/asset-manifest.ts` — `BOOT_ASSETS` gained `tilesetAlt`, `tilesetDecor`, `tilesetAcademy` keys. BootScene preloads all four.
- `scenes/world/WorldScene.ts` — `create()` now calls `map.addTilesetImage(...)` four times with the correct `tilewidth/tileheight` per tileset (64×64 for world+alt, 128×128 for decor, 168×166 for academy). All three `createLayer` calls pass the full tileset array so any layer can reference any tileset's gids. Collision layer hidden (`setVisible(false)`) since the new TMJ marks it `visible:false`; still drives Arcade physics.
- `scenes/world/layers.config.ts` — `overlay` → `decor` across the `tilemapLayers` name + `depth` band. Semantics unchanged (still renders under avatars; tall art goes through y-sort Sprites).
- `__tests__/configs.test.ts` — layer-name assertion updated; depth-ordering expectation renamed.
- Phase-1 coloured-Rectangle building placeholders set to `setVisible(false)` — real art lands progressively (Academy sprite in place; Tavern + Market still TBD). Entrance zones at Phase-1 tile positions kept live so navigation into building pages still works. Position refresh TBD once Tavern + Market sprites arrive.

All map interior tiles (784 of 784) walkable in the new collision layer. Spawn (15,15) + all three Phase-1 entrance tiles still walkable — test suite passes unchanged.

**Next action for user:** drop the real "Photoroom" PNG into `apps/web/public/tilesets/world-alt.png` when available. Until then ground + decor tiles using gids 122-242 display the base world.png art instead of the intended alt-themed variant.

### Avatar art shipped (end of Week 7)

| Slot | Character | Source | Sheets |
|---|---|---|---|
| avatar-01 | Knight | Aseprite export, user-authored | idle 2×4, walk 9×4, jump 5×4 |
| avatar-02 | Rogue (LPC standard female) | LPC generator, alpha-probed + cropped | idle 2×4, walk 9×4, jump 5×4 |
| avatar-03..08 | coloured Rectangle placeholders | — | — |

LPC ingestion gotcha worth remembering: generator outputs uniform 13-column × 4-row sheets with trailing transparent cells. The alpha-probe loop in `scripts/crop-spritesheet.mjs` land-zone (a short inline Node script, see git history of commit `7dfc566`) counts filled columns per sheet before running the crop so the Phaser spritesheet registration has the right column count. LPC and the knight use the same row order (n/w/s/e top-to-bottom), so the `CARDINAL_ROW_ORDER` const is reused across both avatars.

---

## 2026-04-19 — Weeks 6 + 7 prod — deploy-compatibility saga (lessons captured)

Between PR #2 merge and green prod, hit five incidental failures in sequence. All caught via the "runtime logs first, speculate after" memory rule. Captured here so the next phase doesn't repeat them.

| # | Symptom | Root cause | Fix |
|---|---|---|---|
| 1 | Railway boot crash: `Invalid supabaseUrl` | `NEXT_PUBLIC_SUPABASE_URL` had leading ` =` (someone pasted a `KEY=VALUE` line into Railway's value field). supabase-js's URL validator rejected it. | `supabase-admin.ts` now `.trim()`s + strips a leading `=` from both env-var names, and falls back from `NEXT_PUBLIC_SUPABASE_URL` → `SUPABASE_URL` (the `NEXT_PUBLIC_` prefix is a Next.js convention; game-server is not Next). Boot-time env-presence log added so future env misconfigurations surface on the first crash instead of the second. |
| 2 | Client: `undefined is not an object (evaluating 'e.room.name')` on every `joinOrCreate`; server healthy | `colyseus@0.17.9` server returns a flat seat-reservation `{ name, sessionId, roomId, processId }`; `colyseus.js@0.16.22` client (latest on npm) reads `response.room.name` — nested. Shape changed between majors; no matching 0.17 client published yet. | **ADR 0005** — downgrade entire Colyseus ecosystem to `^0.16.0`. API deltas: `Room<State>` generic unwraps (`Room<RealmRoomState>`, not `Room<{ state: State }>`); `onLeave(client, consented?: boolean)` instead of `(client, code?: number)`. |
| 3 | Server crash: `Cannot read properties of undefined (reading 'Symbol(Symbol.metadata)')` at `encodeValue` on first state broadcast | Two copies of `@colyseus/schema` resolved — `3.0.76` hoisted (server + client) + `4.0.20` nested under `packages/shared/node_modules/` because `@arcadia/shared` pinned `^4.0.0`. `AvatarState` was decorated by schema 4 (`Symbol.metadata` slot); encoder is schema 3 (legacy metadata map). | Pin `@arcadia/shared` to `@colyseus/schema@^3.0.0`. One hoisted copy. |
| 4 | Railway `npm ci` failed: `uWebSockets.js@20.49.0 is not in this registry` | `@colyseus/uwebsockets-transport` (peer-installed with `colyseus` 0.16) depends on `uWebSockets.js` from GitHub — the package name has capital letters, disallowed by the npm registry for new registrations. npm normalises `github:user/repo` to `git+ssh://`, which Railway's build container can't resolve (no SSH key). | Root `overrides` pin + hand-edit `package-lock.json` `resolved` URL to `git+https://`. `npm ci` preserves the lockfile verbatim; Railway gets HTTPS. Local `npm install` rewrites it back to SSH — known and documented. |
| 5 | Server crash (second attempt, same symptom as #3 but with one schema copy) | `tsconfig.base.json` had `useDefineForClassFields: true`. Combined with legacy TS decorators + `@colyseus/schema@3`, field initialisers like `avatars = new MapSchema()` compile to `Object.defineProperty` per-instance, shadowing the prototype-level decorator at runtime → `$childType` never lands on the MapSchema → encoder dereferences undefined on first broadcast. | Override `useDefineForClassFields: false` in `packages/shared/tsconfig.json`. Field init emits as plain constructor assignment; prototype decorator sees the instance. |

**Meta-learning — three changes worth keeping in mind for Phase 3+:**

1. **Compatibility drift between server and published client.** Colyseus-style ecosystems can ship the server ahead of the client; assume the *client* is the ceiling, not the server. Check both sides' npm registry state before pinning upstream packages.
2. **Decorator-heavy libraries are sensitive to `useDefineForClassFields`.** Any future package we add that uses legacy TS decorators (e.g. `class-validator`, some ORM flavours) needs the same per-package override — not a global one, since Next / Phaser / React code wants modern field semantics.
3. **Railway-side env input is fragile.** The leading ` =` on a pasted variable isn't user-visible in the dashboard; our sanitisation hedge caught it after one cycle. Apply the same `sanitiseEnv` pattern to any future server-side env lookup that feeds into a validator.

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

**Done — Step 7 (two-tab smoke on Vercel + Railway prod) — verified 2026-04-19.** Vercel preview build initially failed with `Module not found: Can't resolve '@arcadia/shared'` because `packages/shared/dist/` is gitignored and the Phase-2 web dep on `@arcadia/shared` is the first consumer — Vercel's `npm ci` doesn't rebuild workspace `dist/`s. Fix committed on `phase-02-week-6` as `80f0956`: extend `apps/web/vercel.json` `installCommand` to `cd ../.. && npm ci && npm run build --workspace @arcadia/shared`. Re-reproduced the failure locally (delete dist → `next build` fails identically) and confirmed the fix both locally and on the Vercel preview. After merge + Railway redeploy, user verified the two-tab MOVE loop on prod.

---

## Week 7 — Remote avatars + presence (Steps 8–15)

**Done — Step 8 + Step 9 (remote-avatar rendering + client-side interpolation):**

- **`colyseus-client.ts` extended** — dropped `opts.onConnected` in favour of `connection.subscribeConnected(cb)`. Subscribers get called immediately if a room is already connected (so `WorldScene.create()` can register after `connectToRoom` resolves and still receive the initial connect), and again after every successful auto-reconnect. `leave()` clears the listener set + pending reconnect timer.
- **`avatar-renderer.ts`** — shared rendering helpers extracted from `LocalAvatar`. `createAvatarVisuals(scene, avatarId, x, y, displayName, level)` returns `{ gameObject, sprite, nameText, levelBadge }`. `syncVisualAttachments`, `setVisualsDepth`, `setVisualsLevel`, `destroyVisuals` are the thin utilities both Local + Remote avatars call. Empty display-name falls back to `AVATAR_NAMES[avatarId]`.
- **`LocalAvatar` trimmed** — sheds render code, keeps physics + input state + jump lifecycle. Public `.rect`, `.x`, `.y`, `.height` getters unchanged.
- **`remote-avatar.ts`** — `RemoteAvatar` class driven by `AvatarState` patches. No physics; every frame `tick(dtSec)` calls the pure `interpolationStep` to advance toward the last-known server position. On patch, `applyPatch(state)` updates target + direction + isMoving + level. `snapshotFromState` guards against unknown `avatarId`s (returns `null` → caller skips rendering).
- **`interpolation.ts`** — pure `interpolationStep(current, target, speedPxPerSec, dtSec, snapThresholdPx)`. Three branches: within epsilon (arrive), over snap threshold (teleport), otherwise advance by `speed * dt`. `REMOTE_SNAP_DISTANCE_PX = 128`. 6 unit tests cover all three plus diagonal proportions.
- **`WorldScene` wiring** — `subscribeConnected` handler runs `wireRemoteAvatars(room)` on initial connect + every reconnect. Uses Colyseus 4's `getStateCallbacks(room)` proxy (schemas don't carry `onAdd/onRemove/onChange` in their static TS types — runtime-attached by the decoder). `onAdd` is called with `immediate: true` so there's no separate seed pass. `state.onChange(...)` re-projects a fresh snapshot onto each `RemoteAvatar`. Scene SHUTDOWN + DESTROY events fire `teardownRemoteAvatars()` (destroys all remotes + clears subscription).
- **`update(time, deltaMs)`** — `deltaMs / 1000` piped to every `RemoteAvatar.tick(dtSec)` so the lerp speed matches the wall clock regardless of frame rate.

**Typecheck gotcha caught + fixed:** initial draft used `room.state.avatars.onAdd(...)` which failed with `TS2339: Property 'onAdd' does not exist on type 'MapSchema'` — Colyseus 4 moved callbacks off the static schema types into a runtime proxy. Fix: lazy-import `getStateCallbacks` from `colyseus.js` and call `$(room.state).avatars.onAdd(...)` / `$(state).onChange(...)`.

**Done — Step 10 + Step 11 (TavernScene + `/tavern` page swap):**

- **`scripts/generate-tavern-tmj.mjs`** — mirrors `generate-world-tmj.mjs`. Emits `apps/web/public/maps/tavern.tmj` (15×15 iso, 64×32 tiles, `orientation: "isometric"`). Entrance at column 7 on the north wall; south + east + west walls fully closed. Floor is path tiles, walls + bar counter + two scattered "tables" are rock tiles. Reuses the existing `world.png` tileset — no new art.
- **`scenes/tavern/` folder** — `camera.config.ts` (zoom 1.5, iso-diamond bounds for 15×15), `sprites.config.ts` (spawn tile (7, 1) just inside the entrance + same body offsets as WorldScene), `layers.config.ts` (ground/collision/overlay depth bands), `CLAUDE.md`, `__tests__/configs.test.ts` (9 assertions: config shape + negative `idleTimeoutMs` guard + tmj-sync assertions for walkable spawn/entrance + north-wall seal).
- **`TavernScene.ts`** — structural cousin of `WorldScene.ts`. Reuses `LocalAvatar`, `RemoteAvatar`, `avatar-animations`, input resolvers, `move-throttle`, `RemoteAvatar` lifecycle from `scenes/world/`. Differences: no building-entrance zones, no jump (keyboard still wired for symmetry); subscribes to `tavern-realm1` instead. "Return to World" is a React overlay button, not a scene object.
- **`BootScene` made scene-agnostic** — `NEXT_SCENE_KEY_REGISTRY_KEY` override. Default stays `'WorldScene'`; `GameTavern` writes `'TavernScene'` before Phaser boots. `BOOT_ASSETS.tavernTilemap` added; preload covers both tilemaps.
- **`GameTavern.tsx`** — mirrors `GameWorld.tsx`. Fetches session + member, awaits `connectToRoom('tavern-realm1', ...)` before Phaser mount, sets the scene-key override, and renders a "Return to World" floating button. Click emits `MSG.LEAVE_BUILDING { building: 'tavern' }` then `router.push('/world?from=tavern')`.
- **`/tavern` route** — now `dynamic(() => import('GameTavern'), { ssr: false })`; `BuildingShell` remains used for `/academy` + `/market` only.

**Done — Step 12 (building-entry transition overlay scaffold):**

- **`BuildingTransition.tsx`** — client component, props `{ building, ready }`. Fullscreen dark overlay with a 256×256 image slot (background from `/transitions/<building>.png`), "Entering the <Building>…" title, Tailwind-spinning ring. Fades to opacity 0 when `ready` flips true, unmounts 220 ms later.
- **Placeholder PNGs** — `scripts/generate-transition-placeholders.mjs` emits three 1×1 transparent PNGs under `apps/web/public/transitions/`. Real art drops in later as file-level replacements; no code change.
- **Tavern wiring** — `GameTavern` renders `<BuildingTransition building="tavern" ready={...}>` where `ready = preloadProgress >= 1`. Covers the 300–700 ms gap between Phaser mount + Colyseus join + BootScene preload complete.
- **Academy + Market wiring** — new `BuildingShellWithTransition.tsx` wraps the existing `BuildingShell`; fires `ready=true` after a 500 ms min-duration timer. Keeps the transition visible as a deliberate beat rather than a flash.

**Done — Step 13 (member-count endpoint + world badge):**

- **Game-server** — `GET /rooms/:name/count` endpoint on the Express app. Allowlisted to `world-realm1` + `tavern-realm1` (404 otherwise); uses `matchMaker.query({ name })` to sum `clients` across matching room caches. `Access-Control-Allow-Origin: *` + OPTIONS preflight so the Vercel-origin browser client can poll cross-origin.
- **Client** — `scenes/world/member-count-badge.ts`. `createBadges({ scene, anchors, httpEndpoint })` builds three Phaser Text objects (one per building entrance), polls every `POLL_INTERVAL_MS = 3000`, and renders the count above each entrance. `httpEndpointFor(wssEndpoint)` converts the `NEXT_PUBLIC_COLYSEUS_URL` to an HTTP URL. `BADGE_ROOM_BY_BUILDING` maps `tavern → 'tavern-realm1'`, academy + market → null (render "0" statically). Soft-fail on fetch error — previous value kept.
- **`WorldScene.createBadges()`** — reads the WSS env, anchors badges at each building's `entranceTile` (pixel coords from `tileCenterToPixel`), and hooks scene shutdown to stop the poll.
- **Tests — `member-count-badge.test.ts`** — 8 assertions: `formatBadgeText` renders null/zero/positive correctly; `httpEndpointFor` converts ws(s) → http(s); `BADGE_ROOM_BY_BUILDING` pins the three expected values; `POLL_INTERVAL_MS === 3000`.

**Typecheck gotcha caught + fixed:** game-server `req.params.name` typed `string | undefined` under strict TS; Set.has rejects `undefined`. Added a null-guard to the route handler.

**Done — Step 14 (load-test harness):**

- **`apps/game-server/scripts/loadtest.ts`** — seeds N test users via Supabase service-role `admin.createUser` (idempotent — "already exists" tolerated), populates `memberships.avatar_id` cycling through avatar-01..08, signs each in, connects N Colyseus clients to `world-realm1`, sends MOVE at 20 Hz on a circular path for the configured duration. One observer client (index 0) subscribes to state patches; the "peer 1" client encodes a monotonically-increasing seq into the fractional part of its `x` coordinate so the observer can match send ↔ echo and collect latency samples. Prints p50/p95/p99/max; exits 1 if p95 > `LOADTEST_P95_TARGET_MS` (default 100 ms).
- **Prod-Supabase guard** — refuses to run if `TEST_SUPABASE_URL` contains the prod project ref, mirroring `apps/web/tests/rls-cross-member-leakage.test.ts`.
- **`scripts/loadtest-teardown.ts`** — removes the `load-NN@arcadia.test` users after the run. Same prod-ref guard.
- **Env knobs:** `TEST_SUPABASE_URL`, `TEST_SUPABASE_SERVICE_KEY`, `LOADTEST_COLYSEUS_URL` (defaults `ws://localhost:2567`), `LOADTEST_USER_COUNT` (20), `LOADTEST_DURATION_SEC` (60), `LOADTEST_P95_TARGET_MS` (100).
- **Dev dep** — `colyseus.js@^0.16.0` added to game-server's `devDependencies` so the script can spawn real clients. Not in the runtime bundle.
- **Script scripts lifted to npm** — `npm run loadtest` + `npm run loadtest:teardown`.
- **Not run yet** — execution is deferred to the Week 7 two-tab + load-test verification pass (requires the live game-server + a populated arcadia-test Supabase).

**Verification (Steps 8–14 exit):**

- `npm run typecheck` — ✅ clean across all three workspaces
- `npm run lint` — ✅ clean
- `npm run test` — ✅ **146 passed, 13 RLS skipped (159 total)**. New suites:
  - `scenes/world/__tests__/interpolation.test.ts` (6)
  - `scenes/tavern/__tests__/configs.test.ts` (9)
  - `scenes/world/__tests__/member-count-badge.test.ts` (8)
- `npm run build --workspace @arcadia/web` — ✅ clean. Route sizes (Phaser shared-chunked across /world + /tavern now):
  - `/world` 1.9 kB / 497 kB first-load
  - `/tavern` 4.03 kB / 499 kB
  - `/academy` / `/market` 1.05 kB / 97.2 kB (+ BuildingShellWithTransition wrapper)
  - `/onboarding/avatar` 1.8 kB / 154 kB
- `npm run build --workspace @arcadia/game-server` — ✅ clean.

**Step 15 pending — two-tab + load-test verification on Vercel prod + Railway prod.** Handled by the "push for deploy" flow; observer client exercises MOVE latency once Railway runs the new code. Remote-avatar visual smoke (seeing each other's avatars in `/world` and `/tavern`) is the primary user-verifiable exit.

### Ready to deploy Week 7 — push for Vercel + Railway preview / prod.
