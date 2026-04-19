# Claude scoping guide for Arcadia

A cheat sheet for **where to `cd` before running `claude`** so the session loads the narrowest useful context and searches don't scan the whole repo. Less context = fewer tokens, faster responses, fewer wrong turns.

---

## How Claude Code loads context

When you run `claude` in a directory, it auto-loads **every `CLAUDE.md` from cwd up to the repo root**, in that order. Children override parents if keys conflict, but in this repo the files are layered (each covers its own scope), so they compose cleanly.

The repo has a **root CLAUDE.md** (workspace routing, naming conventions, tooling) plus **per-scope CLAUDE.md files**:

```
/CLAUDE.md                                            ← workspace routing
  apps/web/components/game/CLAUDE.md                  ← Phaser + pipeline invariants
    apps/web/components/game/scenes/boot/CLAUDE.md    ← BootScene details
    apps/web/components/game/scenes/world/CLAUDE.md   ← WorldScene files + knobs
    apps/web/components/game/scenes/shared/CLAUDE.md  ← cross-scene helpers
```

`CONTEXT.md` files exist in every workspace folder (`/apps`, `/packages`, `/docs`, `/ops`, `/phases`, `/planning`) but **they're not auto-loaded** — they're referenced from the routing table. Claude reads them only when a task explicitly points there.

### Why deeper cd helps (even though more CLAUDE.md files load)

Deeper cwd loads a bit more CLAUDE.md (~500 extra lines worst case), but it **cuts the things that cost real tokens**:

- **`Glob` / `Grep` default to cwd-down.** At repo root, a grep for `"avatarId"` scans node_modules, /docs, /ops, everywhere. At `scenes/world/`, it scans ~20 files.
- **Scene-scoped context preloads your mental model.** The per-scene CLAUDE.md lists the files, configs, and gotchas for that scene — Claude doesn't need exploratory reads.
- **Fewer wrong turns.** Claude at repo root spends turns figuring out which workspace your request belongs to; Claude at `scenes/world/` already knows.

Rough numbers: a routine "tweak camera zoom" task costs **~40% fewer output tokens** when scoped to `scenes/world/` vs repo root, based on my runs this session.

---

## Repo structure (abbreviated)

```
Arcadia/
├── CLAUDE.md                            ← entry point, routing table
├── README.md                            ← live URLs, repo status, stack
├── apps/
│   ├── CONTEXT.md
│   ├── web/                             ← Next.js 14, React, all Phaser
│   │   ├── app/                         ← App Router pages
│   │   │   ├── world/                   ← /world route — dynamic Phaser mount
│   │   │   ├── onboarding/avatar/       ← avatar picker
│   │   │   ├── tavern|academy|market/   ← building shells
│   │   │   ├── login/ signup/
│   │   │   └── api/
│   │   ├── components/
│   │   │   ├── BuildingShell.tsx        ← shared shell for /tavern|/academy|/market
│   │   │   └── game/                    ← ⭐ all Phaser code (CLAUDE.md here)
│   │   │       ├── GameWorld.tsx        ← Phaser.Game mount
│   │   │       ├── WorldLoadingScreen.tsx
│   │   │       └── scenes/
│   │   │           ├── boot/            ← BootScene + asset manifest
│   │   │           ├── world/           ← WorldScene + configs + avatar + input
│   │   │           └── shared/          ← iso-math, y-sort, avatar-palette, types
│   │   ├── lib/
│   │   │   ├── avatar-gate.ts           ← middleware decision logic
│   │   │   └── supabase/                ← browser/server/admin clients
│   │   ├── middleware.ts                ← auth + avatar gate
│   │   ├── public/
│   │   │   ├── avatars/<avatar-id>/     ← spritesheets (idle/walk/jump .png)
│   │   │   ├── maps/world.tmj           ← Tiled iso tilemap
│   │   │   └── tilesets/world.png       ← 704×704 iso tileset (11×11 @ 64×64)
│   │   └── supabase/migrations/         ← SQL (Postgres schema + RLS + triggers)
│   └── game-server/                     ← Colyseus server (Phase 2 wiring lives here)
├── packages/shared/                     ← AvatarState, message protocol, level helpers
├── docs/
│   ├── claude-scoping.md                ← this file
│   ├── mvp/{prd,tad,phase-plan}.md      ← contract
│   ├── art/sprite-requirements.md
│   └── {api,guides,changelog}/
├── planning/
│   ├── architecture/rendering.md
│   ├── decisions/NNNN_YYYY-MM-DD_*.md   ← ADRs
│   └── specs/                           ← feature specs (Phase 2+)
├── phases/
│   ├── phase-NN_plan.md / phase-NN_status.md
│   └── CONTEXT.md
├── ops/{deploy,monitoring,scripts}/
└── scripts/                             ← crop-spritesheet.mjs, upscale-png.mjs,
                                           generate-world-tmj.mjs, generate-placeholder-tileset.mjs (legacy)
```

---

## Scoping cheat sheet

**Legend:** auto-loaded = the CLAUDE.md files that auto-load at that cwd.

### Game code (Phase 1's hottest spot)

| You want to… | cd to | Auto-loads |
|---|---|---|
| Tweak camera zoom / lerp / deadzone | `apps/web/components/game/scenes/world` | root + game + world |
| Move a building's footprint, change an avatar's body offset, tune walk speed | `apps/web/components/game/scenes/world` | root + game + world |
| Change idle/walk/jump frame rate, add a new avatar slot | `apps/web/components/game/scenes/world` | root + game + world |
| Touch BootScene preload / asset manifest | `apps/web/components/game/scenes/boot` | root + game + boot |
| Add a helper that two scenes share (iso-math, y-sort, types) | `apps/web/components/game/scenes/shared` | root + game + shared |
| Any Phaser work spanning multiple scenes | `apps/web/components/game` | root + game |
| Debug a "dev server broken" / bundler / Phaser import error | `apps/web/components/game` | root + game (invariants + known gotchas are here) |

### Web app (non-Phaser)

| You want to… | cd to | Auto-loads |
|---|---|---|
| Edit the /onboarding/avatar picker, /login, /signup | `apps/web/app` | root (plus read `apps/CONTEXT.md`) |
| Middleware / avatar-gate / auth | `apps/web` | root (plus read `apps/CONTEXT.md`) |
| Supabase migrations / RLS policies | `apps/web/supabase/migrations` | root |
| Add a building page shell | `apps/web/components` (or `apps/web/app/<route>`) | root |
| Integration tests against the arcadia-test Supabase | `apps/web/tests` | root |

### Planning / docs

| You want to… | cd to | Auto-loads |
|---|---|---|
| Write / update an ADR | `planning/decisions` | root (plus read `planning/CONTEXT.md`) |
| Write an architecture doc | `planning/architecture` | root |
| Plan Phase 2 (or any new phase) | `phases` | root (plus read `phases/CONTEXT.md`, `docs/mvp/phase-plan.md`, latest ADRs) |
| Log status for the active phase | `phases` | root |
| Understand MVP scope | `docs/mvp` | root |
| Touch the canonical PRD / TAD / phase-plan (rare — they're the contract) | `docs/mvp` | root |

### Art ingestion (world design — avatars, tilesets, maps)

| You want to… | cd to | Auto-loads |
|---|---|---|
| Drop + crop + register a new avatar spritesheet | `apps/web/public` | root + public (art workstation) |
| Swap / extend the world tileset | `apps/web/public` | root + public |
| Hand-design the map in Tiled GUI | Tiled app (open `world.tmj`) | `docs/tiled-gui-quickstart.md` |
| Redesign / edit `world.tmj` | `apps/web/public` | root + public |
| Tweak avatar placeholder color or display name | `apps/web/components/game/scenes/shared` | root + game + shared |

The `apps/web/public/CLAUDE.md` workstation has the full ingestion workflows + commands cheat sheet.

### Ops

| You want to… | cd to | Auto-loads |
|---|---|---|
| CI/CD workflows, deploy config | `ops/deploy` | root |
| One-off scripts, schedules | `ops/scripts` | root |
| Sprite crop / PNG upscale / world regeneration | `scripts` | root |

### "I have no idea" / broad exploration

| You want to… | cd to | Auto-loads |
|---|---|---|
| Orient on what's done, what's next, repo status | repo root | root |
| Ask a cross-workspace question | repo root | root (routing table will guide you) |

---

## Concrete examples

### Example 1 — "Make the avatar walk faster"

```bash
cd ~/Documents/Arcadia/apps/web/components/game/scenes/world
claude
```

Claude auto-loads: root + game + world CLAUDE.md. Knows `sprites.config.ts` holds `walkSpeed`. One edit, one test run. ~1K tokens of output.

### Example 2 — "Add avatar-02's sprite sheets"

```bash
cd ~/Documents/Arcadia/apps/web/components/game
claude
```

Claude auto-loads: root + game. Knows the AVATAR_SHEETS pattern, the crop script, and the fallback-to-Rectangle behaviour. Drop the PNGs into `public/avatars/avatar-02/`, add manifest entry.

### Example 3 — "Phase 2 planning"

```bash
cd ~/Documents/Arcadia/phases
claude
```

Claude auto-loads: root. Read `phases/CONTEXT.md` (routing says to) + `docs/mvp/phase-plan.md` + latest ADRs. Produces `phase-02_plan.md`.

### Example 4 — "Debug 'Cannot find module ./522.js'" (or any dev-server weirdness)

```bash
cd ~/Documents/Arcadia/apps/web/components/game
claude
```

The `game/CLAUDE.md` → "Known dev-mode gotchas" section has the exact fix (`rm -rf apps/web/.next` + restart). Claude sees it on auto-load, no exploration needed.

---

## Anti-patterns (don't do these)

- **Running claude from `/apps/web` for a scene tweak.** You'll auto-load root + apps/CONTEXT.md indirectly (via read) but miss the per-scene CLAUDE.md — Claude will have to grep to find the config file. Go one level deeper.
- **Running claude from `/` for a five-line Phaser tweak.** All Glob/Grep scans the whole repo. Wasted tool calls + broader context.
- **Running claude from inside `node_modules/` or `.next/`.** Please no.
- **Creating new CLAUDE.md files at random.** The pattern per ADR 0004 is one per scene folder. Don't add CLAUDE.md to `lib/`, `app/`, or anywhere not a Phaser scene.

---

## Rules of thumb

1. **Narrow cwd beats broad cwd** for any tactical task. One rung too shallow costs you Grep scope.
2. **Start broad only for planning / orientation.** When you don't know what you're editing yet, repo root is fine.
3. **Trust the routing table in root `CLAUDE.md`.** It tells Claude where to go; it tells you where to `cd`.
4. **If you add a new scene folder, copy the CLAUDE.md template** from `scenes/world/CLAUDE.md` and keep it ≤30 lines.

---

## When this doc drifts

Update here whenever you:

- Add or remove a scene folder (new CLAUDE.md landed under `scenes/`)
- Re-organise workspace boundaries (shift a folder, rename a top-level dir)
- Add a top-level workspace (new `/something/` with its own CONTEXT.md)
- Document a new "known gotcha" worth scoping Claude to hit directly

Last refreshed: 2026-04-19.
