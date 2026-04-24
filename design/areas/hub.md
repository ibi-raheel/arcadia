# Area: the hub (member dashboard)

**Route:** `/hub` (design-only; the authenticated root landing at `/` stays untouched for now)
**Lexicon name:** the hub — sometimes "my room" in the nav to give a warmer first-person read
**Reference:** `reference/2026-04-23_v4.5-scriptorium-04-member-dashboard.html`

## Purpose

A member's own keep. Who they are tonight, what they're working on, what kind words they've received, what they felt like writing before closing the candle. This is not a feed, not a timeline — it is a single evening taken slowly.

## Mood (committed 2026-04-23)

Quieter than the host. The lantern is low; the desk is mostly yours. The tone is *take your time* — no streak-shaming, no nudges, no "you're falling behind." Progress is shown as a candle burning down, not a bar filling up (same data, kinder metaphor).

## Signature surfaces

- **Section I · who you are, tonight** — five cards laid out 4/4/4/7/5 across two rows:
  1. **Locket** (corded vellum · col-4) — bronze oval frame with lit gradient ground, member initial, display-italic name, handwritten role byline, three role chips.
  2. **Candle** (vellum · col-4) — SVG candle with animated flame, italic-display level number, gradient XP meter (`--lantern-core → --wax`).
  3. **Streak** (envelope · col-4) — 7-day lantern grid. Lit days glow; today is dashed-outlined; future days sit dark.
  4. **Quests** (journal · col-7) — 5-row checkbox list on graph paper, completed rows struck through with a bronze-filled check.
  5. **Trails** (map · col-5) — small world map with a pulsing "you are here" dot and four building marks.
- **Section II · keepsakes** — 6-column medallion grid on a scroll; 9 earned (cast/aged) + 3 unearned.
- **Section III · notes for you** — 4-column grid of pinned paper notes; each note pinned by a bronze stud with a handwritten sender + italic message + mono timestamp + wavy-underlined reply link.
- **Section IV · tonight, quietly** —
  - **Journal entry** (col-7) — parchment textarea with ruled lines bleeding through, placeholder in Caveat italic, primary `seal it` + ghost `set aside` buttons.
  - **Friends now** (col-5) — 4 "slip" rows pinned with a stud. Avatar initial + display-italic name + Caveat location + wavy-underline "wave gently" link.

## Components used

`NightRoom`, `Topbar`, `PrimaryTagNav`, `PageHead`, `ScribeDivider`, all 6 surface primitives, `Medallion` (cast/aged/unearned), `Chip`, `WaxSeal`, `Kicker`, `Hand`, `Button`, `Endnote`.

## Copy voice

- **Hero:** *"ello, Theo."* · byline: `you lit the lantern seven nights in a row. take your time tonight · no rush.`
- **Section kickers (Caveat gilt on divider):** `~ five cards on the desk ~`, `~ cast in bronze · earned, aged, locked ~`, `~ pinned with a stud ~`, `~ before you close the candle ~`.
- **Locket byline:** `keeper of small things · lvl 14`.
- **Candle:** `level 14 · 68% of the way to 15` / `when the wick runs low, a new candle appears. no pressure.`
- **Streak:** `you've shown up · seven in a row` / `longest ever: 14 · gentle, not grim`.
- **Quests:** `tucked into the lined page` / `3 of 5 done · +95 xp so far`.
- **Trails:** `your own little trail across the world` / `walked three stops today`.
- **Medallions:** `nine earned, three not yet struck`.
- **Notes:** `from Iris — 'saw your map idea and grinned. come host something tuesday?'` · `today · 6:04 pm` · `reply gently`.
- **Journal prompt:** `what was the warmest moment today?`
- **Friends:** `who's about tonight · wave to a friend, gently`.
- **Endnote:** *"small, steady things. that's all this place ever asked of you."* · `— found folded inside your journal`.

## Open questions

- Candle progress: show explicit XP numbers, or only the candle metaphor + a level number? Committed: both (level + `XX% of the way to next`). The metaphor stays; a hint of the number is kept for players who want it.
- Journal entries: private-by-default, with a tiny option to "leave on the windowsill" (publish to the host's feed). Not in v1.
- Friends slips: how does "wave gently" feel? Needs dev-tested animation — a tiny paper wiggle when the wave lands, no sound.

## Review log

- **2026-04-23** — first design-only implementation shipped as Phase E of the frontend build-out. No data wiring. Pure static content; animations are CSS-only (flame flicker, pulse-dot, lantern sway).
- **2026-04-23** — motion pass shipped. `/hub` is now the signature dashboard for the arrival sequence:
  - **Hero** — golden embers (5 motes) drift up through the section behind the drop-cap and byline.
  - **Candle** — XP meter fills liquid-style from 0% to 68% over 2.4s via `xp-fill`. Flame runs the new `flame-random` 14-step flicker on a 3.1s cycle.
  - **Streak** — 7 lantern-day cells ignite sequentially (`light-day`, 150ms cadence). Feels like lighting a row of candles down the desk.
  - **Quests** — completed boxes fill with bronze; check-mark strokes draw themselves (`draw-check`, 0.3s stroke-dashoffset).
  - **Trails** — "you are here" arrives with `trail-arrive` (scale 0 → 1.4 → 1) at t=2.6s, then continues the existing `pulse-dot` forever.
  - **Medallions** — 12 cells `medallion-drop` onto the scroll at 80ms cadence (1.6s–2.56s). Cast/aged medallions then enter ambient `gilt-breath` (6s loop). Hover sweeps a specular `gleam` across the bronze.
  - **Notes** — 4 cards `note-land` onto the desk (150ms cadence from 1.8s), pinned with a bronze stud. Each note keeps its own rest rotation via `--rest-rot` CSS var.
  - **Friends slips** — pin in 100ms apart (2.1s–2.4s).
  - **Cursor lantern** — a warm 320×240 radial pool follows the cursor across the whole viewport, screen-blend-mode, smoothed with rAF lerp 0.12. Provided by `components/kit/LanternCursor.tsx` via `NightRoom`.
  - **Paper breath** — every surface card breathes brightness 1 → 1.015 on a 9–11s cycle, desynced via negative delays.
  - All orchestration respects `prefers-reduced-motion`: the arrival collapses to final state in 1ms, ambient loops halt, and the cursor lantern stops tracking. See `system/motion.md` §3 for the full choreography and §10 for the reduced-motion contract.
