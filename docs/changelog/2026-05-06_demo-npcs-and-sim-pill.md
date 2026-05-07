# Demo NPCs + simulation toggle pill

**Date:** 2026-05-06
**PR:** #62 (six commits — cc54b81 → b9313ed)
**Adds:** `apps/web/components/game/scenes/shared/npc-swarm.ts`, `apps/web/components/game/scenes/shared/speech-bubble.ts`, `<SimulationPill />` export in `components/scriptorium/simulation.tsx`, exported `SIM_CHANGE_EVENT` constant in `lib/simulation-mode.ts`. Wires NPCs into all 8 Phaser scenes.
**Drops:** `<SimulationBadge />` mount from `DashboardShell` (component itself preserved for `/kit` + `/preview/*` routes).

Demo polish for Loom recordings — the world feels noticeably alive when the simulation toggle is flipped on. Player can be the only one in every scene by default; click the bottom-left pill to populate every map with autonomous folk wandering, idling, and chattering in the same speech-bubble visual the tavern chat already uses.

## What shipped

### Demo NPCs in every Phaser scene

New shared module `apps/web/components/game/scenes/shared/npc-swarm.ts` exports the `NpcSwarm` class. Each NPC uses the existing `avatar-renderer` + `avatar-animations` pipeline so it visually reads identical to a real remote peer — same sprites, same nameplate (gilt level badge + mono name), same `walk-<dir>` cardinal animations.

**Behaviour** is a tiny state machine per NPC:

1. Pick a random target inside the scene's bounds rect.
2. Walk toward it at the scene's player `walkSpeed` (so NPCs read as "more peers", not slow ambient extras).
3. On arrival (within 6 px), snap, idle 1–4 s, repeat.
4. Independently of the move loop: every 5–14 s, pop a random speech bubble above the NPC's head for 5 s.

`velocityToCardinal()` picks the `n/e/s/w` facing for the walk anim (dominant axis wins; horizontal ties pick e/w, matching the world's existing convention). `playAnim()` is debounced so re-entering the same direction doesn't restart the cycle each frame.

**Persona pool** (8) alternates avatar-01 (knight) + avatar-02 (LPC female) with placeholder names borrowed from the market fixtures: Roan / Mira / Hollis / Tama / Idris / Lyra / Nox / Cassia. Per-NPC level is randomised in `1–12` so the badges show a mix of digits.

**Trade-offs:**

- **Visual-only.** No physics body, no collider awareness — NPCs walk straight lines and may pass through scene props (chairs, the central crystal, lecterns). Acceptable for demo polish.
- **Client-only.** Not synced via Colyseus — different tabs see different NPC arrangements. For single-tab demo recordings, fine; avoids polluting `state.avatars` (which would confuse the Tavern leaderboard etc).

### Per-scene wiring

Each of the 8 scenes gets a 3-line patch (field + spawn after `registerAvatarAnimations()` + tick in `update()`):

| Scene | NPCs | Speed | Bounds inset |
|---|---|---|---|
| Square (`/world`) | 6 | 325 (=`walkSpeed`) | 320 px |
| Market | 5 | 200 | 200 px |
| Academy | 5 | 200 | 200 px |
| Tavern | 5 | 200 | 200 px |
| Coworking-inside | 5 (locked) | 270 | 300 px |
| Each outdoor (×3) | 5 | 325 | 320 px |

Total ~36 NPCs across the world when sim is on.

### Random ambient speech bubbles

30 hand-authored lines in `NPC_MESSAGES` (npc-swarm.ts) — mix of in-character scriptorium voice ("the lantern moved on its own", "three coins for that?") and lighter creator-life ("brb refilling the inkwell", "tomorrow. I will start tomorrow."). First-bubble offsets are staggered across the full max delay so the swarm doesn't chatter in sync.

### Extracted shared bubble factory

`apps/web/components/game/scenes/shared/speech-bubble.ts` exports `createSpeechBubble`, `SPEECH_BUBBLE_DEPTH` (10_000), `SPEECH_BUBBLE_DURATION_MS` (5_000), `SPEECH_BUBBLE_Y_OFFSET` (110). TavernScene now imports from shared; its local copies + the orphaned `addCrispText` import (only used inside the now-removed factory) are dropped. One implementation, no drift between tavern chat and NPC chatter.

**Bubble visuals also bumped up** (per user feedback "appears very shrinked"):

- Font: 14 → **18 px**
- Max-width: 200 → **290 px**
- Padding: 6/10 → **9/14 px**

Affects both NPC bubbles and player tavern chat.

### `<SimulationPill />` toggle + sim-aware swarm

NPC swarm is now gated on the existing simulation toggle. When sim is OFF (default), the player is alone in every Phaser scene; when ON, the demo NPCs spawn and start wandering + chattering. Toggle flips take effect immediately — no scene reload.

**Wiring:**

- `lib/simulation-mode.ts` — exported `SIM_CHANGE_EVENT` (was a module-private constant). Non-React subscribers (Phaser scenes) now have a canonical event name.
- `components/scriptorium/simulation.tsx` — new `<SimulationPill />` export. Fixed bottom-left always-visible toggle: off-state outline, on-state lantern-gradient fill, mirrors the bottom-right ambient-music mute button. Path-gates to skip /login, /signup, /onboarding/*. **Hidden inside iframes** (so the in-world `DashboardOverlay`'s iframe doesn't render its own pill on top of the dashboard). z-index **70** (below the dashboard overlay's z-80 frosted-glass backdrop).
- `app/layout.tsx` — `<SimulationPill />` mounted as a sibling of `<AmbientMusic />`.
- `npc-swarm.ts` — constructor reads `isSimulationOnClient()`. If sim is on, immediately calls `spawnAll()`; otherwise the swarm sits as a no-op shell. Window listener on `SIM_CHANGE_EVENT` flips between `spawnAll()` (sim on) and `despawnAll()` (sim off, destroys all NPCs + their pending bubbles).

### Dashboard de-duplication

`<SimulationBadge />` removed from `DashboardShell.tsx` — it was a floating top-right pill that duplicated the inline `<SimulationToggle />` already in the dashboard header. The component itself is kept for `/kit` + `/preview/*` debug routes.

**Net result: one sim control per surface.** Inside the dashboard view, only the inline `SIMULATION · ON` tag in the header. In-world views, only the bottom-left `◈ SIM · ON` pill. Both flip the same `useSimulationMode` state, so toggling either updates the other instantly via `SIM_CHANGE_EVENT`.

## Files added

- `apps/web/components/game/scenes/shared/npc-swarm.ts` — the swarm class + 30 ambient lines + 8-persona pool.
- `apps/web/components/game/scenes/shared/speech-bubble.ts` — extracted bubble factory + constants.
- `docs/changelog/2026-05-06_demo-npcs-and-sim-pill.md` — this file.

## Files changed

- `apps/web/components/game/scenes/square/SquareScene.ts` — NPC swarm wiring (6 NPCs).
- `apps/web/components/game/scenes/market/MarketScene.ts` — NPC swarm wiring (5).
- `apps/web/components/game/scenes/academy/AcademyScene.ts` — NPC swarm wiring (5).
- `apps/web/components/game/scenes/tavern/TavernScene.ts` — NPC swarm wiring (5) + bubble factory imports from shared (replaces local copy).
- `apps/web/components/game/scenes/coworking-inside/CoworkingInsideScene.ts` — NPC swarm wiring (5, locked).
- `apps/web/components/game/scenes/shared/outdoor-scene-base.ts` — NPC swarm wiring (5) — applies to all three outdoor scenes via inheritance.
- `apps/web/lib/simulation-mode.ts` — exported `SIM_CHANGE_EVENT`.
- `apps/web/components/scriptorium/simulation.tsx` — new `<SimulationPill />`; iframe detect + lower z-index.
- `apps/web/components/dashboard/DashboardShell.tsx` — `<SimulationBadge />` mount removed.
- `apps/web/app/layout.tsx` — `<SimulationPill />` mounted as sibling of `<AmbientMusic />`.

## Tests + verification

Local CI:

- `npm run format:check` — clean
- `npm run lint` — clean (`--max-warnings=0`)
- `npm run typecheck` — clean
- `npx vitest run` — 254 passing, 23 skipped
- `next build` — production compile green

Visual checklist (deferred to user):

- Sign in. By default no NPCs visible — player alone in every scene.
- Click bottom-left `SIM · OFF` pill → ~36 NPCs spawn across the world; each scene shows its 5–6 NPCs walking around with their nameplates + level badges.
- Each NPC pops a random speech bubble every 5–14 s; bubble follows them as they walk; auto-destroys after 5 s.
- Click pill again → all NPCs + their pending bubbles despawn instantly; back to solo.
- Open the creator dashboard overlay → bottom-left pill is hidden behind the frosted backdrop (z-70 vs z-80); the dashboard itself shows only the inline `SIMULATION · ON` toggle in the header.
