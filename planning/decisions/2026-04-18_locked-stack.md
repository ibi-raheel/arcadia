# ADR 0001: Locked MVP tech stack

- **Status:** Accepted
- **Date:** 2026-04-18
- **Deciders:** Arcadia build owner
- **Supersedes:** the earlier candidate list in `REFERENCES.md` (Socket.io / Liveblocks / Ably; Firebase; Mux — all rejected below)
- **Source of truth:** `/docs/mvp/tad.md` §2. This ADR promotes that selection to the decisions log as required by `CLAUDE.md` and `/docs/mvp/tad.md`.

## Context

Arcadia MVP ships in 12 weeks across 6 phases. Every downstream phase (Phase 1 onward) depends on the stack being locked — rendering, multiplayer, data model, and video delivery choices each block calendar time and cannot be safely revisited mid-build.

The PRD (`/docs/mvp/prd.md`) defines what is being built; the TAD (`/docs/mvp/tad.md`) §2 selects the technology for each layer. This ADR records those selections as durable decisions so future contributors can see what was chosen, what was rejected, and why.

## Decisions

### Web framework — Next.js 14+ on Vercel

Next.js 14 (App Router) with SSR for static / catalog pages (`/market`, `/academy`) and CSR for everything Phaser-bound. API routes handle Cloudflare Stream signing, webhooks, and auth middleware. Deployed on Vercel — zero-config Next.js, preview deploys per PR.

**Rejected alternatives:** Remix (less mature Vercel integration for the preview-deploy flow we rely on), Astro (Phaser mount + auth middleware awkward), SvelteKit (team is React-literate, not Svelte-literate — training cost not justified for MVP).

### Game engine — Phaser 3.88+

Phaser 3 has no native isometric renderer. We use **orthographic tilemaps with isometric-style sprites at 2:1 pixel ratio** and y-sort by `(y + height/2)` every frame. This avoids custom projection math while producing a convincing 2.5D isometric look. TAD §4.1 is the binding spec.

**Rejected alternatives:** PixiJS (lower-level — we would reimplement tilemap loading, camera, collision), Babylon.js (3D — wrong product), Three.js (3D — wrong product), a custom WebGL renderer (6+ weeks of work we don't have).

### Multiplayer — Colyseus 0.17+ on Railway, Redis-backed

Colyseus supplies room-based WebSocket state sync with TypeScript schemas — exactly what the `AvatarState` / `RealmRoomState` model in TAD §5.2 needs. Redis (Railway add-on) enables multi-process scaling of Colyseus rooms.

**Rejected alternatives:**
- **Socket.io** — lower-level, we would build the room / schema layer ourselves.
- **Liveblocks / Ably** — managed realtime without the room-state semantics; pricing scales per connection.
- **Supabase Realtime for avatar positions** — Realtime is good for chat (low frequency) but wrong for 20 Hz position updates (per-row UPDATE overhead). Supabase Realtime still used for chat + XP (TAD §8.3).

### Backend — Supabase (Postgres + RLS + Auth + Realtime + Storage)

Supabase bundles the four services we need (DB, Auth, Realtime, Storage) behind one account and gives us Postgres-native RLS for per-member data isolation. Two projects used: `arcadia` (production) and `arcadia-test` (cross-member leakage test harness).

**Rejected alternatives:**
- **Firebase** — NoSQL data model fights the relational structure (realms → memberships → courses → sections → lessons); RLS equivalents are less expressive.
- **Self-hosted Postgres + Auth0 + Pusher** — strictly more operational work for no gain at MVP scale.
- **Convex / Neon / PlanetScale** — reasonable alternatives but none bundle auth + realtime + storage in one tier.

### Video delivery — Cloudflare Stream

Adaptive-bitrate HLS out of the box, signed playback URLs via the Stream API, global CDN, pay-per-minute pricing. Provisioning is **deferred from Phase 0 to Phase 3** per user decision on 2026-04-18 (no code wiring needed until Phase 3 Week 9). The architectural selection stands.

**Rejected alternatives:**
- **Mux** — functionally similar; Cloudflare chosen for bundled CDN pricing and no per-minute minimums at MVP volume.
- **Self-hosted HLS on S3 + CloudFront** — transcode pipeline is our operational problem; MVP cannot afford that scope.
- **YouTube / Vimeo embeds** — no signed access, no per-member progress correlation, brand dilution.

### UI — Tailwind CSS 3+

Utility-first, zero runtime, plays cleanly with Next.js App Router. Team is Tailwind-literate.

**Rejected alternatives:** CSS Modules (more per-component boilerplate for no MVP gain), styled-components (runtime cost in SSR), vanilla CSS (slower iteration).

### Language — TypeScript 5+

One language across `/apps/web`, `/apps/game-server`, `/packages/shared`. `AvatarState` and the Colyseus message protocol are shared types — impossible to keep in sync across a polyglot repo without manual duplication.

**No rejected alternative seriously considered.** JavaScript-only was never on the table; Go / Rust for the game server was considered and rejected on shared-types grounds.

### Map authoring — Tiled Map Editor (`.tmj` format)

Industry-standard tilemap editor; Phaser has a first-party `.tmj` loader. World (`world.tmj`) and Tavern (`tavern.tmj`) maps authored in Tiled, stored in `/apps/web/public/tilemaps/`.

**Rejected alternatives:** hand-authored JSON (slow and error-prone), Ogmo Editor (less Phaser integration), bespoke editor (absurd for MVP scope).

## Consequences

### Workspaces that depend on these choices

| Workspace | Primary stack dependencies |
|---|---|
| `/apps/web` | Next.js, Tailwind, TypeScript, Phaser, Supabase JS client, Cloudflare Stream (API routes only, Phase 3) |
| `/apps/game-server` | Colyseus, TypeScript, ioredis, Supabase Admin SDK (for `onAuth` JWT validation) |
| `/packages/shared` | TypeScript, `@colyseus/schema` |
| `/planning/architecture` | Any architecture docs derived from this stack (`rendering.md` lands in Phase 0; others follow) |
| `/apps/web/supabase/migrations` | Postgres SQL against the Supabase schema in TAD §6.1 |

### What breaks without this

- Without Next.js locked: `/apps/web` scaffold has no framework target.
- Without Phaser locked: the isometric spike (Phase 0 Step 19) has no engine to run on.
- Without Colyseus locked: `/apps/game-server` has no room framework.
- Without Supabase locked: schema + RLS work (Phase 0 Steps 7–11) is undefined.
- Without TypeScript locked: `/packages/shared` has no language to compile.

### Costs and ongoing obligations

- **Vercel** — free tier covers MVP.
- **Railway** — paid tier (~$5–10/mo) for always-on Node + Redis add-on.
- **Supabase** — two free-tier projects for MVP.
- **Cloudflare Stream** — paid add-on (~$5/mo minimum), starts Phase 3.
- **Domain / custom URLs** — defer to Phase 5 polish.

Total MVP infra cost: roughly **$15–25/mo** through Phase 2, rising to **~$25–35/mo** from Phase 3 onward when Cloudflare Stream is active.

### Lock-in

- **Supabase** is the deepest lock-in: Postgres is portable but RLS policies, Realtime subscriptions, Auth triggers, and Storage URLs are Supabase-specific. Migration cost away from Supabase is high but the DB itself is not trapped.
- **Colyseus** schema definitions are framework-specific — porting to Socket.io would mean rewriting `AvatarState` and the message handlers.
- **Cloudflare Stream** video IDs are CF-specific — moving to Mux would require re-uploading every video. Low severity at MVP scale (likely <50 videos).

Lock-in is acceptable given the 12-week window; revisit in V2.

## Revisiting this decision

This ADR stands unless one of the following triggers it:

- Phase 0 isometric spike fails to sustain 60 FPS under throttled conditions — re-evaluate Phaser approach (escalation path in TAD §4.1 does not currently include a fallback engine; opening one would require a new ADR).
- Colyseus 20 CCU load test (Phase 2 Week 7) shows latency above 100 ms — either optimise or re-evaluate the realtime layer.
- Supabase RLS cannot express a required isolation rule — unlikely but a new ADR would document the exception.

Any change to the stack opens a new ADR in this folder; this file stays as the historical record.
