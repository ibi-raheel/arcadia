# References

- "https://codetavern.world/signup"
- "https://github.com/workadventure/workadventure"

## Product structure (technical summary)

Each Realm contains:
- **Tavern** — real-time chat and social gathering
- **Academy** — course content (video, written, interactive) for enrolled members
- **Market** — course catalog; browse, preview, enroll

Building names are cosmetic aliases — the underlying components are the same across all Realms.

## V1 vs V2 distinction

- **V1:** one shared engine; all Realms run identical code, differ only in theme/naming config
- **V2:** creators can template or describe custom worlds — same codebase, swappable sprites
- Do not build V2 concerns into V1 architecture unless they are genuinely required for V1 to function

## Canonical MVP documents

The source of truth for scope, architecture, and sequencing is in `/docs/mvp/`:

- `/docs/mvp/prd.md` — Product Requirements Document (MVP v1.1)
- `/docs/mvp/tad.md` — Technical Architecture Document (MVP v1.1)
- `/docs/mvp/phase-plan.md` — 12-week phased build (MVP v1.1)

All three should be read in full before starting MVP work. If anything in this file conflicts with those, the `/docs/mvp/` files win.

## Locked stack (MVP)

See `/docs/mvp/tad.md` §2 for full rationale and versions.

- **Web framework:** Next.js 14+ on Vercel
- **Game engine:** Phaser 3 (3.88+) — orthographic tilemap with 2:1 iso-style sprites; no custom iso renderer
- **Multiplayer:** Colyseus 0.16.x on Railway (Redis-backed) — server + client matched per ADR 0005
- **Backend / auth / DB / realtime:** Supabase (Postgres + RLS + Auth + Realtime + Storage)
- **Video delivery:** Cloudflare Stream (signed playback URLs)
- **UI:** Tailwind CSS 3+
- **Language:** TypeScript 5+
- **Map authoring:** Tiled Map Editor (`.tmj` format)

The earlier candidate lists (Socket.io / Liveblocks / Ably; Firebase; Mux) were MVP-stage options and are now superseded by the selections above.

## Phase planning template

Before each phase or sub-phase, produce a plan in this format:

```
## Phase [X] Plan: [Name]

**Goal:** What this phase delivers
**Steps:**
1. Step one
2. Step two
3. ...
**Test criteria:** How we confirm it is working before moving on
**Risks / unknowns:** Anything that could go wrong or needs clarification
```

## Notes

- "Browser-based, no downloads" is a hard constraint — nothing that requires installation
- Multiplayer presence (seeing other avatars move) is a core V1 feature, not a nice-to-have
- Keep the data model clean on the creator/member distinction — they are separate user types with different permissions
