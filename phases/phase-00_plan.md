## Phase 0 Plan: Foundation

**Source:** `/docs/mvp/phase-plan.md` §Phase 0 (Weeks 1–2). This file is the executable plan; the MVP doc is the contract.

**Goal:** Ship a deployed skeleton — monorepo, Supabase schema with full RLS, auth end-to-end, CI green, and an isometric spike at 60 FPS. No visible product. Rushing Phase 0 compounds debt into every later phase.

---

### Project names (locked)

| Resource | Name |
|---|---|
| GitHub repo | `arcadia` (private, personal account) |
| Vercel project | `arcadia-web` |
| Railway project | `arcadia-game-server` |
| Supabase — production | `arcadia` |
| Supabase — test (cross-member leakage) | `arcadia-test` |
| Colyseus rooms | `world-realm1`, `tavern-realm1` (locked by TAD §5.1) |
| Seed Realm slug | `mvp-realm` (locked by TAD §6.1) |

Domains / custom URLs: defer to Phase 5 polish — use auto-assigned `*.vercel.app` and `*.railway.app` until then.

---

### Local environment prereqs

Dev machine: **Mac Mini M4**, macOS 26.2 (Tahoe), Apple Silicon. Xcode Command Line Tools present.

Install status (all local tooling in place as of 2026-04-18):

| Tool | Version | Install method |
|---|---|---|
| `git` | 2.50 (Apple) | system |
| Xcode CLT | — | system |
| `nvm` | 0.40.1 | curl install script, user-local (`~/.nvm`) |
| Node / npm | **v24.15.0 LTS** / 11.12.1 | `nvm install --lts` (Node 24 is current LTS as of Apr 2026; supersedes the earlier "Node 20" placeholder) |
| `gh` CLI | 2.90.0 | direct binary download to `~/.local/bin/gh` |
| `supabase` CLI | 2.90.0 | direct binary download to `~/.local/bin/supabase` |
| Homebrew | ~~not installed~~ | Not required — all CLIs installed without it. |

Next user-interactive step: `gh auth login` (OAuth-in-browser, one-time). Run via `! gh auth login` in the prompt when we reach Step 2.

User-run accounts (free tier covers Phase 0; create before the step that depends on each):

- GitHub — hosts the `arcadia` repo. Needed for Step 2.
- Vercel — sign in with GitHub. Needed for Step 3 / 4 deploy.
- Railway — sign in with GitHub. Needed for Step 12.
- Supabase — two projects: `arcadia` (Step 7) and `arcadia-test` (Step 11). Free tier supports both.
- ~~Cloudflare Stream~~ — **deferred to Phase 3** per user instruction. See §"Scope changes from baseline" below.

**Note on `mid-range laptop` NFR.** PRD §5 targets *"mid-range laptop (8 GB RAM, integrated GPU, Chrome latest)"*. The Mac Mini M4 is substantially more powerful — sustained 60 FPS on M4 does NOT prove the NFR. Mitigation for the Phase 0 spike: run the spike with Chrome DevTools CPU 6× throttling enabled as a proxy for mid-range hardware. Record both throttled and unthrottled frame-time traces in `planning/architecture/rendering.md`. Flag as a known gap: true PRD NFR validation requires a real mid-range laptop and is deferred until one is available (latest acceptable: Phase 5 before Loom recording).

---

### Steps

**Stack ADR (do first)**

1. Write `planning/decisions/2026-04-18_locked-stack.md` promoting TAD §2 versions to an ADR: Next.js 14+, Phaser 3.88+, Colyseus 0.17+, Supabase, Cloudflare Stream, Tailwind 3+, TypeScript 5+, Tiled (`.tmj`). Record what each replaces and which workspaces depend on it.

**Week 1 — Repo, services, schema**

2. Initialise git at repo root; first commit = existing docs (`CLAUDE.md`, `CONTEXT.md`, `REFERENCES.md`, `/docs/mvp/*`, workspace `CONTEXT.md` files, `phases/phase-00_plan.md`, the stack ADR). Create GitHub repo `arcadia` (private) and push. `main` is protected; merges require passing CI.
3. Initialise monorepo: root `package.json` with npm workspaces (`apps/*`, `packages/*`), shared `tsconfig.base.json`, root ESLint + Prettier + Vitest configs, `.gitignore`, `.env.example` per TAD §9.1.
4. Scaffold `/apps/web` — Next.js 14 (App Router) + Tailwind 3 + TypeScript 5. Add `@supabase/supabase-js`, `.env.local.example`, placeholder landing page, placeholder `/api/health` route.
5. Scaffold `/apps/game-server` — Colyseus 0.17 + TypeScript 5. Empty `RealmRoom` class registered on `world-realm1` and `tavern-realm1` endpoints (no logic yet). Health endpoint. `ioredis` installed; `RedisPresence` + `RedisDriver` wired behind `REDIS_URL`.
6. Scaffold `/packages/shared` — exports `AvatarState` / `RealmRoomState` Colyseus schemas (TAD §5.2), message-type constants (`MOVE`, `ENTER_BUILDING`, `LEAVE_BUILDING`, `UPDATE_LEVEL`), level thresholds constant.
7. Provision Supabase project `arcadia`. Apply migrations creating the **7 MVP tables** verbatim from TAD §6.1 (realms, memberships, courses, sections, lessons, lesson_progress, enrolments, tavern_messages) with all FKs, defaults, timestamps, and uniqueness constraints. Migrations live in `/apps/web/supabase/migrations/`.
8. Seed `realms` with one row (`slug='mvp-realm'`). Insert the seed inside the same migration that creates the table, so fresh environments come up correct.
9. Install signup trigger `create_membership_on_signup()` on `auth.users` INSERT exactly as TAD §6.3.
10. Apply the full RLS policy set (TAD §6.2) across all 7 tables — every SELECT / INSERT / UPDATE covered. RLS enabled on every table with no permissive fallbacks.
11. Provision second Supabase project `arcadia-test`. Apply the same migrations. This project exists solely for the cross-member leakage test suite.
12. Provision Railway project `arcadia-game-server`. Add Redis plugin. Set env vars per TAD §9.1. Deploy once — confirm the WS endpoint is reachable.
13. ~~Cloudflare Stream provisioning~~ — **deferred to Phase 3 Week 9** per user instruction. Account creation + round-trip verification moved. Risk accepted: CF Stream setup issues are discovered during Phase 3 rather than pre-empted in Phase 0. Mitigation: provision the account in Phase 2 Week 8 (one week ahead of Phase 3 use) so any issues surface with buffer.
14. Document all env vars in `.env.example` at root and in each app's `.env.local.example`. Mirror live values into Vercel, Railway, and local `.env.local`. Never commit real values. CF Stream vars (`CF_STREAM_TOKEN`, `CF_ACCOUNT_ID`, `CF_STREAM_WEBHOOK_SECRET`) listed in `.env.example` but commented out until Phase 3.

**Week 2 — Auth, CI, isometric spike**

15. Supabase Auth — enable email/password and Google OAuth providers. Lock JWT settings (issuer, expiry).
16. Next.js auth-gate middleware — `middleware.ts` redirects unauthenticated requests for any non-public route to `/login`. Public routes allowlist: `/`, `/login`, `/signup`, `/api/stream/webhook`.
17. Cross-member leakage test — Vitest suite in `/apps/web` that: creates 2 members in `mvp-realm`, creates a second temporary realm with a 3rd member, inserts rows in `lesson_progress` and `enrolments` for each, then asserts each member's anon-key queries only return their own rows and realm-A members see nothing from realm B. Runs against `arcadia-test` — never mocked. Integration tests must hit a real database.
18. CI — GitHub Actions workflow `.github/workflows/ci.yml` runs on every PR: install → typecheck (`tsc --noEmit` per workspace) → ESLint → Vitest across `/apps/web`, `/apps/game-server`, `/packages/shared`. Merge to `main` triggers Vercel prod and Railway prod deploys. Smoke-test placeholders added in each workspace so Vitest has at least one passing assertion.
19. **Isometric spike** — standalone Phaser 3.88 scene in `/apps/web` loaded via `dynamic(... { ssr: false })` per TAD §3.2. 10×10 orthographic tilemap at 64×32 (2:1) from a hand-written `.tmj`. Two static avatar sprites. Y-sort by `(y + height/2)` every frame. FPS counter overlay. **Target: sustained 60 FPS for 60 continuous seconds** on a mid-range laptop (8 GB RAM, integrated GPU, Chrome latest).
20. Spike outcome written up as `planning/architecture/rendering.md` — approach confirmed or escalated. If escalated, stop and flag before proceeding to Phase 1.

---

### Parallel track: art asset sourcing

Full sprite specification lives in **`/docs/art/sprite-requirements.md`** — this is the complete art-order document and the single source of truth for the art spec. Hand it to an artist or use it to evaluate pre-made packs.

Summary (~220 raster assets total):

- **8 avatar characters** × 24 frames each (4 iso directions × 2 idle + 4 walk) + 1 preview thumbnail per character + 1 shared sparkle overlay = **207 avatar frames**
- **3 tilesets** — outdoor world, Tavern interior, shared props
- **3 building facades** — Tavern, Academy, Market (decorative sprites, not tiles)
- **UI set** — 5 level badges (L1 grey → L5 purple), member-count badge, bitmap font, level-up banner
- **Brand set** — logo (SVG + PNG exports), wordmark, favicon, loading-screen background
- **Tilemaps** — `world.tmj` and `tavern.tmj` authored in-house in Tiled, not part of the art order

**Resolutions:** @1x / @2x / @3x per raster asset. @3x is future-proofing for mobile UI (post-MVP); MVP UI remains desktop-only per PRD §5/§6 (user-confirmed 2026-04-18).

**Phase 0 deliverable from the artist:** locked colour palette + 1 character style sample (1 character, 1 direction, walk cycle) by end of Phase 0 Week 2. Full delivery is Phase 1 Week 3 blocking.

---

### Test criteria (Phase 0 exit)

All must pass before Phase 1 starts:

- A user can register via email/password on the deployed Vercel preview; the signup trigger creates their `memberships` row; they can log in; session persists across refresh.
- Cross-member leakage Vitest suite passes green against the `arcadia-test` Supabase project.
- All three services reachable: Vercel `/api/health` returns 200; Railway Colyseus WS accepts a connection; Supabase REST + Auth endpoints respond.
- CI on `main` is green — typecheck + ESLint + Vitest across all three workspaces.
- Isometric spike sustains 60 FPS for 60 continuous seconds while both avatars move, on the specified mid-range target. Frame-time overlay recorded as a screen capture in `planning/architecture/rendering.md`.
- Cloudflare Stream round-trip verified (upload + signed playback) — logged in `ops/scripts/verify-cf-stream.sh`.
- Stack ADR exists in `planning/decisions/`.
- Art asset sourcing: at least a **colour palette + avatar style sample (1 character, 1 direction, walk cycle)** approved by end of Phase 0 Week 2 so Phase 1 Week 3 can start against the agreed direction. Full avatar + tileset delivery is Phase 1 Week 3 blocking, not Phase 0 exit.

---

### Scope changes from baseline (user decisions, 2026-04-18)

- **CF Stream deferred** from Phase 0 to Phase 3. Phase 0 does not create a Cloudflare account or verify upload / playback. Mitigation: provision one week ahead in Phase 2 Week 8.
- **Dev device: Mac Mini M4.** More powerful than PRD target. 60 FPS NFR validated via Chrome DevTools CPU 6× throttling as a proxy; full-hardware validation deferred until a real mid-range laptop is available (latest: Phase 5 before Loom).
- **MVP stays desktop-only** per PRD §5/§6. Assets still delivered @1x/@2x/@3x to avoid re-commissioning when mobile UI is added post-MVP, but no mobile UI work in MVP.

### Risks / unknowns still open

| # | Item | Action |
|---|---|---|
| 1 | GitHub auth | User runs `! gh auth login` in prompt when Step 2 starts. OAuth-in-browser, one-time. |
| 2 | ~~Artist / art source~~ | **Resolved 2026-04-18:** user produces all art in-house per `/docs/art/sprite-requirements.md`. Style-sample milestone at end of Phase 0 Week 2 is now user-self-delivered. |
| 3 | Google OAuth credentials | Requires Google Cloud project + OAuth consent screen. User creates in Google Cloud Console; I supply exact steps when Step 15 starts. |
| 4 | Reference mid-range laptop for final NFR validation | Not required for Phase 0 exit (CPU throttle proxy accepted). Needed before Phase 5 Loom recording. Source: borrow a Windows laptop or a MacBook Air from 2020–2022 era. |
| 5 | ~~Supabase account + two empty projects~~ | **Resolved 2026-04-18:** user confirms accounts created. Exact project slugs (`arcadia` + `arcadia-test`) to be verified when Step 7 starts. |
| 6 | ~~Vercel + Railway accounts~~ | **Resolved 2026-04-18:** user confirms accounts created. |

**Mobile scope confirmed:** sprites stay at @1x/@2x/@3x per `/docs/art/sprite-requirements.md`. MVP UI desktop-only per PRD §5/§6 unchanged.

---

### Out of scope for Phase 0

Explicitly deferred to later phases: Phaser scenes beyond the spike, Colyseus room state or message handlers, avatar picker UI, tilemap design, CF Stream upload UI, XP functions, any feature pages (`/tavern` / `/academy` / `/market` / `/dashboard`). Phase 0 is plumbing only.

---

**Next:** confirm this plan (or amend) and resolve risks #2 (CF Stream budget), #3 (reference device), #4 (mobile scope), #5 (art source). #1 and #6 I can guide step-by-step the moment we start executing.

Once approved, I open `phases/phase-00_status.md` and begin with Step 1 (the stack ADR), then Step 2 (git init + GitHub repo push) — nothing further until I can verify prereqs.
