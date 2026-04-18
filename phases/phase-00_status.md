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

**Pushed to `origin/main` as of 2026-04-18:** all 8 commits live on GitHub.

**In flight — Steps 12 (Railway) and 4-deploy (Vercel) running in parallel:**

- Railway: `railway.json` committed (`c819c65`). User-driven setup via web UI: import repo → add Redis plugin → set `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `COLYSEUS_MONITOR=false` → generate domain → verify `/health`. Output: Railway service URL, to be saved as `NEXT_PUBLIC_COLYSEUS_URL` (wss://) in Vercel env + local `.env.local`.
- Vercel: `apps/web/vercel.json` committed locally (pending commit below). User-driven setup via web UI: import repo → Root Directory `apps/web` → env vars (Supabase anon key, URL, Colyseus URL once Railway returns one) → deploy. Auto-detects Next.js.

**Environment status:**

- Node v24.15.0 LTS + npm 11.12.1 (via nvm)
- `gh` 2.90.0 and `supabase` 2.90.0 installed to `~/.local/bin`
- Mac Mini M4, macOS 26.2, Xcode CLT present
- Homebrew not installed — not required (all CLIs direct-downloaded)

**Blockers:**

- `gh auth login` — user must run via `! gh auth login` in next turn.
- Supabase project slugs — user to confirm `arcadia` and `arcadia-test` project refs when Step 7 begins.
- Google Cloud OAuth credentials — deferred until Step 15.

**Open risks (from plan §Risks):** item #4 (real mid-range laptop for final NFR validation) unresolved — not blocking for Phase 0 exit, needs resolution before Phase 5 Loom.

**Scope decisions today:**

- CF Stream deferred Phase 0 → Phase 3 (user instruction).
- Mac Mini M4 as dev device; 60 FPS NFR validated via Chrome DevTools CPU 6× throttling as proxy.
- MVP UI desktop-only; sprites still @1x/@2x/@3x per `/docs/art/sprite-requirements.md`.
- Art produced in-house by user (not commissioned, not CC0 pack).

**Next:** git init locally, stage initial commit, wait on `gh auth login` before pushing.
