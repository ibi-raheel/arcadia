# Motion — what moves and how

The scriptorium is a mostly still room, but it is not a dead one. Motion here is physical — the lantern swings, the wick flickers, paper breathes, embers drift, a hand pulls a warm pool of light across the desk. Nothing spins, nothing springs in from off-screen, nothing blinks for attention. Everything moves as if it had mass.

Source: animations and transforms in `reference/2026-04-23_v4.5-scriptorium-01-design-system.html`, extended by the motion pass shipped 2026-04-23 (see `apps/web/app/globals.css`).

## 1. The lantern sway (ambient)

The only top-level ambient motion on every page.

```css
@keyframes sway {
  0%, 100% { transform: translateX(-50%) rotate(-0.8deg); }
  50%      { transform: translateX(-50%) rotate( 0.8deg); }
}
/* Applied to .lantern-rig svg after the lantern-drop completes.
   transform-origin: 50% -80px (the chain pivot). */
animation: sway 6s ease-in-out infinite;
```

- 6-second cycle. Slower than a heartbeat. Don't speed this up.
- ±0.8° max rotation. Off-axis pivot at the chain attachment point — it must swing *from* the chain, not spin around its own center.
- Runs indefinitely on every page that renders the hanging lantern.
- Respects `prefers-reduced-motion`.

## 2. Hand-placement rotations (static)

Every surface card carries a small, fixed rotation so nothing reads as pixel-aligned. These are NOT animations — they're one-time transforms.

| Element | Rotation |
|---------|----------|
| Surface cards (generic) | ±0.4° to ±1.2° |
| Vellum tags (nav) | ±2° |
| Wax seal | `-8°` (at rest; starts at `-30°` during stamp) |
| Byline / hand notes | `-1°` to `-2°` |
| Swatches | `-1.2°`, `+1°`, `-0.4°` (cycled via `:nth-child`) |

**Rule:** adjacent cards rotate in OPPOSITE directions so they read as hand-placed, never as a grid.

## 3. Arrival orchestration (new — 2026-04-23)

When a page loads, the room comes to life in a fixed order. This is the signature moment — the feeling a visitor remembers.

| t (s) | What happens | Easing |
|-------|---------------|--------|
| 0.00–0.15 | Night vignette settles, desk radial-gradient resolves. No motion. | — |
| 0.15–1.75 | **Lantern drop** — hanging lantern falls from `translateY(-140px) rotate(-3deg) opacity 0` with a single overshoot at 60% (`+12px`, `1.4deg`) and tiny settle at 78%, landing at rest. | `cubic-bezier(0.34, 1.56, 0.64, 1)` — the ONE bouncy easing the kit permits, reserved exclusively for this. |
| 0.35–2.35 | **Staggered card reveal** — `.stagger > *` sets all direct children to `opacity: 0` with a `settle-card` animation (18px rise + 2px blur clearing + scale 0.985 → 1). Delay increments 0.1s per child up to 20 children. Children beyond 20 all fire at 2.35s. | `cubic-bezier(0.2, 0.8, 0.2, 1)` — ease-out-quint, no overshoot. |
| 0.25–1.15 | **Drop-cap illumination** — gilt letter fades in at 0.25s; ink-red corner dots appear at 1.15s. | `cubic-bezier(0.2, 0.8, 0.2, 1)` |
| 0.55–1.55 | **Page-head h2** reveals; byline at 0.85s. | ease-out-quint |
| 0.9–1.6 | **Wax seals stamp** — each `.wax` starts `scale(2.2) rotate(-30deg) opacity 0`, overshoots to `scale(0.92) rotate(-5deg)` at 60%, then settles at rest. | `cubic-bezier(0.25, 1.2, 0.5, 1)` |
| 1.8–2.0 | **Sway begins** on the lantern. | ease-in-out |

Nested set-pieces layer on top. They are page-specific and fire inside the arrival window:

**`/hub`**
- `1.1–2.0s` — tally marks wouldn't appear here (those are `/host`), but **embers** start drifting (5 motes, staggered durations 6.2–9s, infinite thereafter).
- `0.6–3.0s` — **candle XP meter** fills `width: 0% → 68%` over 2.4s with a 0.6s lead-in.
- `0.9–1.95s` — **streak days** light sequentially, 0.15s apart (`light-day` keyframe: dark → lantern-core radial with bright `box-shadow` glow → final resting glow).
- `1.6–2.56s` — **medallions drop** onto the scroll, 12 cells, 80ms apart, each with a 0.7s `medallion-drop` (overshoot on land).
- `1.8–2.9s` — **notes pin to the desk** with `note-land`, 0.15s apart. Stud lands at `translateY(-22px)` and paper settles behind it.
- `2.1–2.9s` — **friend slips** pin in, 0.1s apart.
- `2.6–3.4s` — **trails "you are here" pulse** arrives (`trail-arrive` scale 0 → 1.4 → 1), then continues the 2.4s infinite `pulse-dot` cycle.

**`/host`**
- `1.1–2.15s` — **tally marks scratch in** (`tally-scratch` clip-path wipe), 7 groups × 0.15s cadence.
- `1.2–3.4s` — **journal chart ink lines draw left-to-right** via `stroke-dashoffset` with `pathLength="1"`. Primary (wax) line starts at 1.2s / 2.2s. Secondary (ink-blue) line at 1.8s / 2.4s. Data points fade in along the path at `1.5s + i * 0.3s`.
- `1.8–2.15s` — **person cards pin on** the corded vellum, 70ms apart.

## 4. Ambient life (continuous)

These run forever. They are low-amplitude, desynced, and must not trend toward a synchronized breath — that would feel mechanical. Stagger durations and delays.

| Element | Animation | Duration | Notes |
|---------|-----------|----------|-------|
| `.lantern-rig svg` | `sway` | 6s | ±0.8° |
| Candle flames (inline + big) | `flame-random` | 2.6s / 3.1s | 14 irregular keyframe steps; different durations per instance so no two sync. Replaces the old `flickr` keyframe. |
| `.vellum-card`, `.scroll-card`, `.ledger-card`, `.journal-card`, `.map-card` | `page-breathe` | 9–11s | `filter: brightness(1) → 1.015 saturate(1) → 1.02`. Even-indexed cards desynced with negative animation-delay so the page doesn't pulse in unison. |
| `.medallion:not(.unearned)` | `gilt-breath` | 6s | Inner glow box-shadow rises and falls. Unearned medallions hold still. |
| `.firefly` (doorway scene) | `drift-firefly` | 6.6–9s | 5 motes, each with a distinct delay + duration. |
| `.window-glow`, `.window-glow.w2` | `flicker-window` | 3.6s / 4.2s | Opacity 0.78 → 1, desynced. |
| `.smoke` | `rise-smoke` | 8s | Chimney plume translates -100px and fades. Two smoke paths offset by 2.6s. |
| `.ember` (×5) | `ember-float` | 6.2–9s | Tiny gold motes rise 22px, drift 10px right, fade opacity 0.3 → 0.9 → 0.55 → 0.9 → 0.3. |
| `.trails-pulse` | `trail-arrive` then `pulse-dot` | 0.8s + 2.4s inf. | Arrives once with a scale pop; then pulses forever. Only use ONE pulsing dot per page. |

## 5. The cursor lantern (new — 2026-04-23)

A warm radial pool (`320px × 240px`, peak `rgba(255, 184, 74, 0.13)`) tracks the cursor across the viewport. It sits above the desk (`z-index: 4`), uses `mix-blend-mode: screen` so it only *adds* light — never darkens — and is smoothed with `requestAnimationFrame` (lerp factor `0.12`) so it drifts after the cursor instead of snapping to it.

```css
.cursor-lantern {
  position: fixed; inset: 0;
  pointer-events: none;
  z-index: 4;
  background: radial-gradient(
    320px 240px at var(--cursor-x, 50%) var(--cursor-y, 50%),
    rgba(255, 184, 74, 0.13),
    rgba(255, 184, 74, 0.05) 35%,
    transparent 62%
  );
  mix-blend-mode: screen;
  transition: background 0.12s linear;
}
```

Implementation: `components/kit/LanternCursor.tsx` updates `--cursor-x` / `--cursor-y` via rAF. Under `prefers-reduced-motion`, the component renders but doesn't track — the pool holds still at its initial centered position.

**Never** use the cursor lantern to highlight affordances (that's what hover states are for). It is ambient; it says "the room knows you're here," not "click this."

## 6. Hover states

### Paper surfaces — `.scroll-card` / `.vellum-card` / `.ledger-card` / `.envelope-card` / `.journal-card` / `.map-card`

```css
:hover {
  transform: var(--rest-transform, none) translateY(-3px);
  filter: brightness(1.03);
  transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), filter 0.35s;
}
```

Lift 3px, brighten 3%. The `--rest-transform` var preserves any per-card rotation.

### Buttons — `.btn-primary`

```css
transition: transform .25s, box-shadow .25s;
:hover { transform: translateY(-2px); filter: brightness(1.08); }
```

Lift 2px, brighten 8%. No scale, no shadow growth beyond brightness.

### Vellum tags — `.vtag`

```css
:hover { transform: rotate(0deg) translateY(-3px); filter: brightness(1.05); }
```

The tag **straightens up** to be read (rotation resets to 0°) and lifts 3px.

### Medallions — `.medallion`

```css
:hover .gleam::before { animation: gleam 1.3s ease-out forwards; }
```

A specular highlight (40% wide, linear gradient `transparent → rgba(255,232,180,0.55) → transparent`, `skewX(-14deg)`) sweeps from `translateX(-120%)` to `translateX(220%)`. Reserved for `.cast` and `.aged` states; unearned medallions don't gleam.

### Ghost button — `.btn-ghost`

```css
:hover { background: rgba(184, 140, 82, 0.12); }
```

Subtle bronze wash. No lift.

## 7. Field focus

```css
.field {
  border-bottom: 1.5px solid var(--bronze);
  transition: border-bottom-color .2s;
}
.field:focus { border-bottom-color: var(--lantern); }
```

Bronze → lantern on focus. No halo, no outline, no scale.

## 8. Keyframe roster (canonical)

These are the keyframes that ship in `apps/web/app/globals.css`. Don't introduce a new keyframe without adding it here.

| Keyframe | Purpose |
|----------|---------|
| `sway` | Hanging lantern idle |
| `lantern-drop` | Hanging lantern arrival (one-shot) |
| `flame-random` | Candle / lantern flame flicker — 14 irregular steps |
| `flicker-window` | Cottage window glow (doorway scene) |
| `drift-firefly` | Firefly back-and-forth (doorway scene) |
| `rise-smoke` | Chimney smoke (doorway scene) |
| `settle-card` | Generic surface appearance — opacity + rise + blur clear |
| `stamp` | Wax seal arrival |
| `gleam` | Specular highlight sweep (bronze, medallion, brand-mark) |
| `gilt-breath` | Medallion inner-glow breathe |
| `draw-path` | SVG stroke draws left-to-right (pairs with `pathLength="1"`) |
| `draw-check` | Check-mark stroke inside a filled quest box |
| `xp-fill` | Candle XP meter liquid fill |
| `tally-scratch` | Tally mark clip-path wipe |
| `light-day` | Streak-day lantern ignition |
| `medallion-drop` | Medallion drop onto scroll |
| `note-land` | Paper note lands + pins to the desk |
| `trail-arrive` | "You are here" scale pop on first paint |
| `pulse-dot` | Trail dot idle pulse (after arrive) |
| `ember-float` | Golden mote rise-and-drift |
| `page-breathe` | Paper brightness/saturation breath |
| `appear` | Generic opacity + 8px rise (legacy helper) |

## 9. Anti-rules (revised)

- **No bouncing easings** on anything except the single lantern drop on arrival. No springs on card reveals, button clicks, or hovers.
- **No parallax on scroll.** The desk does not tilt. The lantern does not shift with scroll position.
- **No auto-rotating carousels.** If content needs to rotate, let the user turn the page.
- **No hover effects on non-interactive elements.** If a card is clickable it lifts; if it isn't, it stays put.
- **No blinking or flashing.** The flame *flickers* (low amplitude, no hard on/off); the trail dot *pulses* (slow, once per page, only for "you are here"). Nothing strobes.
- **No more than one persistent pulse per page.** Ambient motion (breath, flicker, drift, gleam) can layer freely because it's low-amplitude; pulses draw the eye, so one is the limit.
- **Cursor lantern never highlights affordances.** It is ambient warmth, not a pointer.

## 10. Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  .lantern-rig svg,
  .candle-flame { animation: none !important; }
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}
```

Effective behavior under reduced motion:
- Lantern holds still (no sway, no drop — first paint state is the resting state).
- Flames hold still.
- Page-breathe stops.
- Arrival orchestration collapses — everything snaps to its final state within 1ms.
- Cursor lantern still renders, but `LanternCursor` detects the preference and stops tracking; the pool rests centered.
- Static rotations (hand-placement) stay; they're transforms, not animations.
- Hover transitions disappear (instant state change).
