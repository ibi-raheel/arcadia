# ADR 0008 — Phaser Arcade auto-scales the physics body with `sprite.scale`; keep `bodyOffset` in frame units

**Date:** 2026-04-23
**Status:** Accepted
**Context:** `image-backed-outdoor-world` iteration, PR #10. Cost ~3 debugging rounds of "cannot exit via bottom edge" reports before the root cause was isolated.

## Context

Arcadia renders every avatar as a 64×64 frame spritesheet with `setDisplaySize(w, h)` to draw it at a bigger on-screen size (90 px for the MVP, 135 px after the 2026-04-22 readability bump, 202 px on the square as the focal hub). Each scene also declares a `bodyOffset: { x, y, width, height }` for the Arcade Physics feet-box, tuned so the collider sits under the avatar's feet rather than wrapping the whole sprite frame.

During the `image-backed-outdoor-world` iteration we scaled the avatar up and, reasoning that "the body should scale with the sprite," pre-scaled the `bodyOffset` values by the same factor (× 1.5 from 90 to 135, × 2.25 from 90 to 202). Avatars worked visually but **edge-exit triggers along the bottom of every image-backed scene stopped firing** — the user could walk as far south as they wanted and nothing happened. The bug stayed undiscovered for several deploy rounds because Phaser didn't crash, the trigger code looked correct, and the thresholds were generous enough that small physics-body drift should have been invisible.

## Decision

**`bodyOffset` stays in frame-space coordinates** (based on the authored 64×64 frame, not the displayed size). Phaser scales it automatically.

Concretely:

```ts
// sprites.config.ts — CORRECT
avatar: {
  size: { width: 135, height: 135 },      // display size, grows as we like
  bodyOffset: { x: 22, y: 62, width: 45, height: 22 }, // frame units, DO NOT pre-scale
}
```

```ts
// sprites.config.ts — WRONG (double-scales)
avatar: {
  size: { width: 135, height: 135 },
  bodyOffset: { x: 33, y: 93, width: 68, height: 33 }, // pre-scaled ×1.5 — Phaser scales it AGAIN
}
```

## Why

Arcade Physics applies `sprite.scaleX/scaleY` to both the body size and the offset during every position update. From `Phaser.Physics.Arcade.Body`:

```ts
// setSize(width, height, center = true)
this.width = width * this._sx;      // _sx = sprite.scaleX
this.height = height * this._sy;
```

And during frame update:

```ts
this.position.x = sprite.x - sprite.displayOriginX + (sprite.scaleX * this.offset.x);
this.position.y = sprite.y - sprite.displayOriginY + (sprite.scaleY * this.offset.y);
```

So for a 135-px avatar with `scaleX = 135/64 ≈ 2.109`:

| bodyOffset in config | Body width in world | Body height in world | Body bottom offset from sprite.y |
|---|---|---|---|
| `{x: 22, y: 62, width: 45, height: 22}` (frame units) | 45 × 2.109 ≈ 95 | 22 × 2.109 ≈ 46 | `y + 109.7` |
| `{x: 33, y: 93, width: 68, height: 33}` (pre-scaled) | 68 × 2.109 ≈ 143 | 33 × 2.109 ≈ 70 | `y + 198.2` |

And for a 202-px avatar (`scaleX ≈ 3.156`) with pre-scaled offsets `{50, 140, 102, 50}`:

- Body bottom at `sprite.y + 499` in world.
- Image height 2508 → `sprite.y` clamps at `2508 − 499 = 2009`.
- Bottom-edge trigger threshold 250 fires at `y >= 2258`.
- **2009 < 2258 → trigger never fires**, no matter how long the member walks.

The double-scale pushes the physics body so far below the sprite that `setCollideWorldBounds` clamps the avatar well before any edge-based trigger band. The visual sprite looks correct because display size drives what the user sees, but the body is nowhere near it.

## Consequences

**Good**
- One authoritative place to tune the feet-box: frame-space units. Phaser handles the rest.
- Avatars scale without touching bodyOffset, and old scenes with 90-px avatars migrate to 135 / 202 unchanged.
- Edge-trigger math only needs `image_height − body_bottom_offset`, where `body_bottom_offset` can be computed from the frame-space offset × current scale.

**Bad / to watch**
- It's a non-obvious behaviour. Reviewing a PR that adds a bigger avatar is easy; reviewing one that *also* "fixes" the body offset looks right at a glance. A lint rule checking that `bodyOffset.x ≤ size.width / 2` would have caught this.
- If a future sheet is authored at a different frame size (e.g. 128×128 instead of 64×64), the body offsets need to be re-tuned — same numbers are no longer correct relative to the new source.

## References

- Root-cause report: `docs/changelog/2026-04-23_image-backed-world-complete.md` (merged to main 2026-04-23).
- Commits landing the fix: `c79d04a` (revert double-scaled offsets; threshold bumps).
- Phaser source referenced: [`Body.setSize`](https://github.com/photonstorm/phaser/blob/v3.85.0/src/physics/arcade/Body.js) and [`Body.updatePosition`](https://github.com/photonstorm/phaser/blob/v3.85.0/src/physics/arcade/Body.js).
