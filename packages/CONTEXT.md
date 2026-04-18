# Workspace: Packages

## Purpose

Shared code consumed by more than one app in `/apps/*`. Types, constants, protocol definitions, pure utilities.

## Layout

- `/shared` — TypeScript types, Colyseus message payload shapes, XP level thresholds, any cross-service constants. Single source of truth for types used by both `/apps/web` and `/apps/game-server`.

## Conventions

- **Zero runtime dependencies unless essential.** `/packages/shared` should be a pure-types / small-utilities package.
- **No I/O.** No Supabase calls, no Colyseus clients, no fetch. If it touches the network, it belongs in an app, not here.
- **TypeScript 5+.** Exports ES modules. Builds to both ESM and CJS if consumers need it.
- **File naming:** kebab-case modules (`xp-thresholds.ts`, `avatar-state.ts`, `room-ids.ts`).

## What good looks like

- A change to a Colyseus message payload is made in one place (`/packages/shared/src/messages.ts`) and both the client and the game server pick it up on next build.
- XP thresholds live in one constant file; the PL/pgSQL `calculate_level()` function and the client-side level badge logic agree by construction.
- Type tests (`expectTypeOf`) guard any structural contract that would break the wire protocol.

## What to avoid

- Importing from `/apps/*` into `/packages/shared`. Dependencies flow downward only: apps depend on packages, never the reverse.
- Business logic that belongs in an app leaking in here because "it might be shared later."
- Secrets. None of this ships to the browser by accident, but still — never commit keys here.

## Tooling

- `/review` (installed) — before any PR merge.
- **GitHub MCP** (installed — ADR 0002) — linking types changes to the PRs that consume them.

No MCPs beyond that. This is pure code; no integrations to wire in.
