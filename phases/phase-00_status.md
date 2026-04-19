# Phase 0 — Status

Source plan: `phase-00_plan.md`. Status entries are chronological, newest at the top.

---

## 2026-04-18 — Phase 0 kickoff

**Done:**

- Step 1 ✅ Stack ADR written at `planning/decisions/0001_2026-04-18_locked-stack.md`. Promotes TAD §2 selections; documents rejected alternatives; notes CF Stream deferral to Phase 3.
- Step 2 ✅ Git initialised (main), initial commit `007329a` (17 files, 2189 insertions), GitHub repo created at **https://github.com/ibi-raheel/arcadia** (private), origin pushed. Auth: `gh` as `ibi-raheel`, token scopes repo + workflow.
  - Noted: git auto-configured committer identity from hostname (`Aria <aria@Arias-Mac-mini.local>`). User can run `git config --global user.email <email>` at their leisure; not modified without permission.

- Step 3 ✅ Root monorepo chassis. Commit `e379aa8`. Files: `package.json` (npm workspaces, Node ≥ 20), `tsconfig.base.json` (strict TS 5, ES2022, bundler resolution, decorators enabled), `eslint.config.mjs` (flat config, single source of truth for all workspaces), `.prettierrc.json` + `.prettierignore`, `vitest.workspace.ts`, `README.md`.
- Step 4 ✅ `/apps/web` scaffolded with Next.js 14.2.35 (App Router) + Tailwind 3.4 + TypeScript 5 + Supabase JS client. Commit `993e925`.
  - `app/api/health/route.ts` returns `{status:'ok', service:'@arcadia/web', time}` — liveness probe for Vercel.
  - `lib/supabase/client.ts` + `lib/supabase/admin.ts` — browser vs. service-role separation; admin client throws if imported outside server runtime.
  - `.env.local.example` lists every TAD §9.1 var; CF Stream vars commented until Phase 3.
  - `next/lint` dropped in favour of the root flat config (resolved eslint 8/9 version conflict between `eslint-config-next` and our root toolchain).
  - Verified: format ✓, lint ✓, typecheck ✓, vitest ✓, `next build` ✓.
- Step 5 ✅ `/apps/game-server` scaffolded with Colyseus 0.17.5 + `@colyseus/ws-transport` + Redis presence/driver. Commit `2e5ef5e`.
  - `src/index.ts` wraps an Express HTTP server with `WebSocketTransport`; Redis is wired when `REDIS_URL` is set (in-memory fallback otherwise).
  - `src/rooms/RealmRoom.ts` — empty room class registered for both `world-realm1` and `tavern-realm1` (TAD §5.1). State schema + message handlers land in Phase 2.
  - `/health` endpoint reports Redis configured/not-configured.
  - Verified: typecheck ✓, build ✓, lint ✓, production binary starts and returns 200 on `/health`.
- Step 6 ✅ `/packages/shared` scaffolded with Colyseus v4 schemas + protocol + level helpers. Commit `15bed4a`.
  - `AvatarState` / `RealmRoomState` match TAD §5.2 verbatim.
  - `MSG` constants + per-message payload interfaces lock the TAD §5.3 protocol.
  - `calculateLevel` + `isValidLevel` mirror the SQL in TAD §8.1 so the client can render levels without a DB round-trip.
  - First real test suite: 22 Vitest assertions covering XP thresholds and invalid inputs. All passing.

- Step 7 ✅ Supabase schema applied to both projects. Commits `6f8dacc`, `c819c65`.
  - `arcadia` (ref `eqbzltiasmuckgsapkye`, West US Oregon): 7 tables + RLS + signup trigger + `mvp-realm` seed applied via `supabase db push`.
  - `arcadia-test` (ref `idxgcrwikmcuqrrxbogj`, East US Ohio): identical schema applied for the cross-member leakage test harness (Step 17).
  - CLI currently linked to `arcadia` for ongoing work.

**Pushed to `origin/main` as of 2026-04-18:** all commits live on GitHub.

- Step 12 ✅ Railway `arcadia` service live at **https://arcadia-production-c635.up.railway.app** (health verified). Redis plugin linked (`REDIS_URL` reference), but code runs in-memory via `USE_REDIS=false` default — Redis ready to flip on when we scale to multiple replicas.
  - **This was the hard step.** Five commits and two hours of blind guessing before the runtime logs revealed `ERR_REQUIRE_ESM` from `@colyseus/better-call → rou3`. Nixpacks' nixpkgs pin resolves `nodejs_22` to Node 22.11, which has `require(ESM)` behind `--experimental-require-module`. Final fix chain: commits `fa965ab` → `f17a8af` → `1fd8366` → `9db7aa1` → `8ded6f3` → `86d84e6`.
  - Lesson noted in memory: on 503 from a deploy target, grab runtime logs BEFORE theorising fixes.
- Vercel `arcadia-web` project live at **https://arcadia-web-swart.vercel.app** (health verified). Env vars wired: Supabase URL, anon key, service key, JWT secret, `NEXT_PUBLIC_COLYSEUS_URL=wss://arcadia-production-c635.up.railway.app`.
- Step 14 ✅ Env vars documented and mirrored across Vercel, Railway, and `.env.example` files.

### Infrastructure snapshot

| Service | Host | Status |
|---|---|---|
| Next.js (web) | https://arcadia-web-swart.vercel.app | ✅ 200 on `/api/health` |
| Colyseus (game-server) | wss://arcadia-production-c635.up.railway.app | ✅ 200 on `/health`, WS upgrade OK |
| Supabase (prod) | https://eqbzltiasmuckgsapkye.supabase.co | ✅ schema + RLS + signup trigger |
| Supabase (test) | https://idxgcrwikmcuqrrxbogj.supabase.co | ✅ identical schema for leakage test |
| Railway Redis plugin | (linked via `REDIS_URL` env ref) | ✅ present, not actively used until scale-up |

**Environment status:**

- Node v24.15.0 LTS + npm 11.12.1 (via nvm)
- `gh` 2.90.0 and `supabase` 2.90.0 installed to `~/.local/bin`
- Mac Mini M4, macOS 26.2, Xcode CLT present
- Homebrew not installed — not required (all CLIs direct-downloaded)

- Step 16 ✅ Next.js auth-gate middleware shipped. Commit `d07da6f`.
  - `@supabase/ssr` wired: `lib/supabase/client.ts` (createBrowserClient) + `lib/supabase/server.ts` (createServerClient bound to next/headers cookies).
  - `middleware.ts` — refreshes session via `supabase.auth.getUser()`; redirects unauthed users on protected routes to `/login?next=<path>`; bounces authed users off `/login`/`/signup`. Public allowlist: `/`, `/login`, `/signup`, `/api/health`, `/api/stream/webhook`, `/spike`.
  - `/login` and `/signup` pages — functional forms calling `supabase.auth.signInWithPassword` / `signUp`.
- Step 17 ✅ Cross-member + cross-realm RLS leakage suite. Commit `e9b8bb2`.
  - 13 Vitest assertions in `apps/web/tests/rls-cross-member-leakage.test.ts` covering: same-realm lesson_progress/enrolments leakage, INSERT/UPDATE spoof attempts, cross-realm leakage (both directions), positive controls.
  - `helpers.ts` refuses to run if `TEST_SUPABASE_URL` points at the production project ref (`eqbzltiasmuckgsapkye`) — hard block against accidental destructive runs.
  - Skips locally when `TEST_SUPABASE_{URL,ANON_KEY,SERVICE_KEY}` env vars are missing; populate `apps/web/.env.test.local` (gitignored) to run. Same var names for GitHub secrets (Step 18).
- Step 18 ✅ GitHub Actions CI workflow. Commit `169a1a6`.
  - `.github/workflows/ci.yml` — runs `format:check`, `lint`, `typecheck`, `test`, and both production builds (web + game-server) on every PR and main push. Node 22, concurrency-cancel on PR updates.
  - Companion doc `ops/deploy/github-actions-secrets.md` lists the three `TEST_SUPABASE_*` secrets to add.
- Step 19 ✅ Isometric spike at `/spike`. Commit `aecfc12`.
  - `apps/web/components/game/` — `SpikeGame.tsx` (dynamic-imported client mount) + `scenes/SpikeScene.ts` (10×10 orthogonal tilemap per TAD §4.1, two y-sorted avatar rectangles bobbing on y-axis, FPS + min-FPS overlay).
  - Procedural textures; real iso art lands in Phase 1 Week 3.
  - `/spike` added to middleware public allowlist for unauth'd testing during Phase 0; remove when Phase 1 ships a real `/world`.
  - `planning/architecture/rendering.md` — design doc + measurement protocol + empty results table to fill after the 6× CPU-throttle run.

### Phase 0 exit criteria — status

| Criterion | Status |
|---|---|
| Stack ADR exists in `planning/decisions/` | ✅ ADR 0001 |
| All three services reachable (`/api/health`, Railway `/health`, Supabase) | ✅ verified 2026-04-18 |
| Supabase schema + RLS + signup trigger + seed live on both projects | ✅ both `arcadia` and `arcadia-test` |
| Next.js auth-gate middleware in place | ✅ Step 16 |
| Cross-member leakage Vitest suite green against `arcadia-test` | ⏳ pending user: add `.env.test.local` + GitHub secrets, confirm green |
| CI on `main` green (format + lint + typecheck + test + both builds) | ⏳ pending user: verify first workflow run at https://github.com/ibi-raheel/arcadia/actions |
| Supabase Auth: user can register → signup trigger → login → session persists | ⏳ pending user: end-to-end test on https://arcadia-web-swart.vercel.app/signup (email/password is default-on; verify) |
| Google OAuth provider enabled | ⏳ pending user: Supabase dashboard → Auth → Providers → Google; add Google Cloud OAuth app credentials |
| Isometric spike sustains 60 FPS for 60 seconds under 6× CPU throttle | ⏳ pending user: run protocol in `planning/architecture/rendering.md` §4, fill §5 measurement log |
| Art: colour palette + 1-character style sample | ⏳ pending user: in-house art delivery (end of Phase 0 Week 2 per plan) |

### Phase 0 code is done. Five things pending user action before Phase 0 exits:

1. **Verify first CI run is green** (`/actions` on the repo). Expect RLS suite to skip until secrets are added. Format, lint, typecheck, and builds should all pass immediately.
2. **Add `TEST_SUPABASE_{URL,ANON_KEY,SERVICE_KEY}` GitHub secrets** per `ops/deploy/github-actions-secrets.md`, then re-run CI. RLS suite should go from 13 skipped → 13 passed.
3. **End-to-end auth test** on the live Vercel URL: `/signup` → confirmation email → `/login` → verify session persists across a refresh. Supabase MCP can confirm a `memberships` row was created for the new user.
4. **Run the 60-FPS spike protocol** on the Mac Mini M4 — `rendering.md` §4 has the exact steps, §5 has the measurement log table to fill.
5. **Enable Google OAuth in Supabase** (if desired for the PRD §4.1 OAuth option — not strictly required if email/password is acceptable for the Loom demo). I can walk through the Google Cloud Console + Supabase dashboard steps when you want.

### Open risk carrying into Phase 1

- Reference mid-range laptop for final 60 FPS validation: not blocking Phase 0 exit (CPU-throttle proxy accepted), but must be resolved before Phase 5 Loom recording.

### Scope decisions standing

- CF Stream deferred Phase 0 → Phase 3.
- Mac Mini M4 as dev device; 60 FPS NFR validated via Chrome DevTools 6× CPU throttle as proxy.
- MVP UI desktop-only; sprites still @1x/@2x/@3x per `/docs/art/sprite-requirements.md`.
- Art produced in-house by user.
- Node 22.x runtime pin + `--experimental-require-module` on the game-server start script (needed because Nixpacks' nixpkgs resolves `nodejs_22` to 22.11 and `require(ESM)` only became unflagged in 22.12). Full rationale in ADR 0001 addendum.
