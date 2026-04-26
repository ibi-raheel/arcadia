# Hotfix — server room bounds out of sync with image-backed world

**Date:** 2026-04-25
**PR:** [#44](https://github.com/ibi-raheel/arcadia/pull/44) (`fix(server): align room bounds with image-backed world`)
**Commit on `main`:** `958c6ab`
**Affects:** `@arcadia/game-server` (Railway). **Vercel deploys do not pick this up — Railway must redeploy for the fix to land in prod.**

## Symptom

Two clients connected to the same Colyseus room (e.g. one phone + one PC, both in `/world`) saw each other at **the wrong world positions**, persistently. The disagreement was reproducible and stable: the same wrong coordinates came back from the server every time, just not the coordinates the client had sent.

## Root cause

When `/world` and `/tavern` migrated from the iso 30×30 tilemap to image-backed scenes (2026-04-22, see [`2026-04-22_image-backed-world.md`](2026-04-22_image-backed-world.md)), the *client's* coordinate system changed completely:

- Old iso world: origin `(0, 0)` at the centre, range roughly `±1200 × -100..1000` (screen-space iso projection).
- New image world: origin `(0, 0)` at the **top-left** of each background PNG; range `0..2508 × 0..2508` (square) and `0..1536 × 0..1024` (tavern interior).

The server's `apps/game-server/src/rooms/room-config.ts` was **never updated**. It kept the old iso bounds + spawn coords. Since `applyMove` in `realm-handlers.ts` clamps incoming MOVE coords to those bounds (a DoS guard against absurd values), every coordinate the client sent that fell outside the old iso range got silently truncated:

- Client at `(1800, 1500)` sends `MOVE { x: 1800, y: 1500 }`.
- Server clamps against `(-1200..1200, -100..1000)` → stores `(1200, 1000)` in `AvatarState`.
- Server broadcasts `(1200, 1000)` → other client renders the peer there.

`coworking-realm1` was added the same day as the image swap and got correct bounds (`0..2508`) from day one — that's why coworking didn't show the bug.

## Fix

Snap server bounds + spawn to the actual image dimensions each scene uses on the client:

| Room | Was (iso, stale) | Now (image-backed, matches client) |
|------|-----------------|-----------------------------------|
| `world-realm1` | spawn `(0, 480)`, bounds `±1200 / -100..1000` | spawn `(1254, 1380)`, bounds `0..2508 / 0..2508` |
| `tavern-realm1` | spawn `(0, 0)`, bounds `±600 / -100..600` | spawn `(768, 960)`, bounds `0..1536 / 0..1024` |
| `coworking-realm1` | already correct (added 2026-04-22) | unchanged |

Also rewrote the file's lead comment so future edits know server bounds **must mirror** `apps/web/components/game/scenes/<scene>/sprites.config.ts` + `camera.config.ts` on the client. Drift = silent server-side clamping = peer desync.

## Detection cost

Bug shipped 2026-04-22. User noticed it 2026-04-25 (4 days later, after multi-device testing during the HUD work). Underscores why **multi-client smoke testing should be part of any world-rendering rebuild** — a single-tab dev session never exposes desync.

## What's *not* in this fix

- No client changes. Image dimensions on the client side were correct; server was the broken half.
- No tests changed. `realm-handlers.test.ts` uses synthetic small bounds (`±100 / -50..500`) for unit testing `applyMove` — no fixture pinned to the prod values.
- No new architectural primitive — just a forgotten-config update + a stronger comment.

## How to verify in prod

After Railway redeploys `@arcadia/game-server`:

1. Open `/world` in two browsers (or one phone + one PC).
2. Walk both avatars to a far corner of the square (e.g. north-east, near the bridge).
3. Both clients should see each other in the **same** spot. Before the fix, the peer would visibly snap to the clamped (1200, 1000) zone.
