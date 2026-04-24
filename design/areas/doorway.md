# Area: the doorway (login)

**Route:** `/doorway` (design-only). The wired auth page remains at `/login` until the reskin lands (Phase C merge, post-MVP).
**Lexicon name:** the doorway — never "login" or "sign in"
**Reference:** `reference/2026-04-23_v4.5-scriptorium-02-login.html`

## Purpose

The arrival. A visitor crosses from the dark world outside into the lit scriptorium. The left half shows where they have been (a moonlit landscape, a cottage in the distance, its windows flickering). The right half shows where they are going (a scroll on the desk, fields for their name and the word that lets them in). The two columns read as a single sentence: *the world is dark — the lantern is lit*.

## Mood (committed 2026-04-23)

Late, but not lonely. The cottage windows flicker because someone is home; fireflies drift because the night is kind. The scroll glows because the lantern overhead has been lit expressly for the visitor. No "welcome to Arcadia!" — just an open door and a page on the desk.

## Signature surfaces

- **Two-column stage** — left: `.doorway-scene` (night, moon, cottage SVG, fireflies); right: `.doorway-desk` (oak, scroll). Single shared bronze-corner frame holds them together. Split 1.15 : 1 (scene gets the extra width because it is the composition).
- **Moon** — `Moon` SVG in the top-right of the scene with a pale gold halo.
- **Cottage** — inline SVG. Walls, pitched roof, chimney with rising smoke animation, two flickering windows, path with three stones receding into dark. Low, warm, not twee.
- **Fireflies** — 5 small golden circles with a `drift-firefly` loop. Staggered delays so they never blink in unison.
- **Scene caption** — two-line closer in display + Caveat ("the world is dark. the *lantern* is lit." / "~ come in ~").
- **Side-mounted lantern** — smaller `Lantern` hung from the top-right of the desk column. Sways.
- **Scroll form** — rotated -0.6° on the desk. Curled ends. Houses the heading, two fields, remember checkbox, primary button, alt-auth pair, and a first-time link.
- **Wax seal** — bottom-right of the scroll, tilted -10°. Signs the page.
- **Resting quill** — bottom-left of the scroll column, rotated -18°. Decorative only.

## Components used

`NightRoom` (with `hideLantern` — the doorway uses the side-mounted variant) OR a custom wrapper with its own top nav. For Phase C I'm rendering a thin topbar above the stage rather than the full desk, because the stage IS the composition.

Primitives: `Topbar`, `PrimaryTagNav`, `Moon`, `Lantern`, `Quill`, `Field`, `Button`, `WaxSeal`.

## Copy voice

- **Scene caption:** *"the world is dark. the **lantern** is lit."* / `~ come in ~`
- **Scroll heading:** *"enter the scriptorium"* · *"step **inside**."* / `~ your name and the word that lets you in ~`
- **Field labels:** `your name, if you please` · `the word that lets you in`
- **Remember line:** `keep me inside for a while`
- **Primary button:** `step inside →`
- **Divider:** `or by another door`
- **Alt auth:** `with google` · `with github` (ghost-bronze)
- **First-time:** `first time here? ask the doorkeeper for a key.`
- **Empty error state (future):** `the ink ran. try that again.`

## Open questions

- Third-party auth: which providers? For now the design carries Google + GitHub as placeholders to preserve the "or by another door" pairing.
- The scene composition should feel different on the signup path. Proposal: a second lit window, no fireflies yet — a world in the process of waking.
- Keyboard focus order: field → field → remember → primary. Alt-auth buttons come after the primary by design (they are a side door).

## Review log

- **2026-04-23** — first implementation shipped as a design-only static page. No auth wiring. Scene is composed of inline SVG + CSS animations (firefly drift, window flicker, smoke rise, lantern sway). Wired `/login` auth untouched.
- **2026-04-23** — motion pass: the doorway deliberately sits OUTSIDE the main `NightRoom` (it's a two-column stage, not the centered desk), so the cursor lantern, orchestrated grid-stagger, and embers do NOT fire here. What does fire:
  - **Side-mounted lantern** sways (6s cycle) — but does NOT run the full `lantern-drop` entrance, since the stage wants to feel already-lit when a visitor arrives, not performatively assembled.
  - **Cottage scene** continues to run firefly drift (5 motes, 6.6–9s), window flicker (3.6s / 4.2s), chimney smoke (8s × 2 offset).
  - **Wax seal** on the scroll stamps down via the shared `stamp` keyframe at t=0.9s.
  - **Fields + button** inherit the kit's hover + focus motion (bronze underline → lantern on focus, primary lift 2px).
  - We could later add a subtle `scroll-unfurl` on first paint (the scroll unrolls from rolled to flat), but that's a bigger set-piece than this surface needs — resisted in this pass. See `system/motion.md` §9 for why restraint matters here.
