# Phase 0 — Status

Source plan: `phase-00_plan.md`. Status entries are chronological, newest at the top.

---

## 2026-04-18 — Phase 0 kickoff

**Done:**

- Step 1 ✅ Stack ADR written at `planning/decisions/2026-04-18_locked-stack.md`. Promotes TAD §2 selections; documents rejected alternatives; notes CF Stream deferral to Phase 3.
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

**Remaining Phase 0 steps:**

- Step 15 — Supabase Auth config (email/password + Google OAuth). Dashboard work; user-driven. I'll provide step-by-step instructions for the OAuth consent screen when we start.
- Step 16 — Next.js auth-gate middleware. Pure code.
- Step 17 — Cross-member leakage test (Vitest against `arcadia-test`). Pure code.
- Step 18 — GitHub Actions CI (typecheck + lint + vitest on PRs). Pure code.
- Step 19 — Isometric spike (Phaser scene, 60 FPS under Chrome 6× CPU throttle). Pure code + user verification on Mac Mini M4.

**Open risks:** reference mid-range laptop for final NFR validation still unresolved. Not blocking Phase 0 exit (CPU-throttle proxy accepted). Needed before Phase 5 Loom recording.

**Scope decisions standing:**

- CF Stream deferred Phase 0 → Phase 3.
- Mac Mini M4 as dev device; 60 FPS NFR validated via Chrome DevTools 6× CPU throttle as proxy.
- MVP UI desktop-only; sprites still @1x/@2x/@3x per `/docs/art/sprite-requirements.md`.
- Art produced in-house by user.
- Node 22 across all three workspaces (bumped from original Node 20 plan — 20 broke on Colyseus's ESM-only `rou3` transitive dep).

**Next:** Step 16 (Next.js auth-gate middleware) — pure code, doesn't depend on anything external being reconfigured.
