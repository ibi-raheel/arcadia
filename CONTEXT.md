# Current Project

## What we are building

Arcadia is a browser-based 2.5D isometric virtual world platform. Creators host communities called Realms. Members join free, move as avatars, chat in real time (Tavern), take courses (Academy), and browse offerings (Market). V1 uses a shared engine for all Realms. V2 introduces customisable worlds via swappable sprites on the same codebase.

## Technical scope

- Browser-based, no downloads required
- 2.5D isometric rendering
- Real-time multiplayer (avatars, chat)
- Course delivery (video, written, interactive)
- Gamification layer (progression, achievements)
- Creator dashboard (theme config, course upload, pricing)
- Member auth — one account, multiple Realms

## What good looks like

- Code is clean, modular, and built to scale incrementally
- Each phase is planned before it starts and tested before moving on
- Bugs and bad architectural decisions are caught early, not patched later
- The build follows a logical sequence — no skipping ahead

## What to avoid

- Skipping the plan step before a phase or sub-phase
- Moving on before the current step is tested and confirmed working
- Patching over a fundamentally broken approach instead of flagging it
- Over-engineering V1 — the engine is shared; deep customisation is a V2 problem
- Making assumptions about stack, infra, or libraries without confirming first
