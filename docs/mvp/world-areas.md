# Arcadia · the regions

A handbook of every walkable area, who it serves, and what
interactions live there. The Sage NPC reads from this so it can
answer "what's the coworking space?" / "what's the tavern?" / "what
do I do at the academy?" without guessing.

## The Square (`/world`)

The central outdoor town square. The first place a member sees
when they enter the world. Image-backed (a hand-painted top-down
PNG). 2508×2508 pixels at 1.0× zoom. Multiplayer — Colyseus
auto-shards at 20 clients per room.

Four cardinal exits, all ENTER-gated:

- **North → the Academy grounds** (`/academy-outside`)
- **East → the Taverns** (`/tavern-outside`)
- **South → the Market** (`/market`)
- **West → the Coworking grove** (`/coworking`)

A small lodge sits in the top-right corner; ENTER returns to the
member's home landing (`/`).

The bearded merchant on the rug in the upper-left is **the Wanderer**
— an AI guide. Walk near him + ENTER to open a chat popup. He
answers questions about Arcadia from the curated documentation.

## The Academy (`/academy`)

Indoor course hall. Members browse + watch courses they've been
granted access to. Course videos play via embedded YouTube unlisted
players (MVP scope per ADR 0006); written lessons render from
markdown via the academy viewer.

Outside (`/academy-outside`): single-player courtyard with a
prompt at the entrance. ENTER walks into `/academy`.

Inside (`/academy/[courseId]`): per-course viewer with section /
lesson navigation, resume position, and 80%-completion tracking.

## The Taverns (`/tavern?b=<id>`)

Three named taverns share the same interior art but are separate
multiplayer rooms — `tavern-a` (The Three Ravens), `tavern-b` (The
Iron Chalice), `tavern-c` (The Sleeping Hollow). Members in
different taverns never see each other.

Each tavern is the realm's chat hub. **Tab** opens the chat bar;
messages float as speech bubbles above the speaker's avatar. A
live XP leaderboard pins to the side.

A **tablet** mounted on the back wall opens an async feed (Phase
9): creator posts + scheduled events surfaced like "what happened
while I was gone." When a creator goes live (their event's start
time has passed and end time hasn't), a verdigris "live now" banner
drops at the top and a YouTube stage embed pops over the bar TV.

Outside (`/tavern-outside`): single-player courtyard with three
distinct doors, each leading to its corresponding tavern shard.

## The Market (`/market`)

The course catalogue. Scrollable Phaser hall with one stall per
published course. Click a stall to open the React StallView modal:
full description, section + lesson list, free preview lessons
playable inline, an Enrol CTA (inactive in MVP — payments
deferred). A search HUD filters stalls by keyword.

Bottom edge of the square + the prompt-gated archway both lead
here.

## The Coworking grove (`/coworking`)

Outdoor area west of the square. Single-player, image-backed.
Five tents form a small grove — each tent is its own multiplayer
room (Colyseus shards on `coworking-realm1` with `filterBy
(['building'])`). Walk up to a tent, press ENTER → the interior
loads at `/coworking/inside?b=tent-1` (or `tent-2..tent-5`).

The interior is currently a basic tilemap with avatar presence —
members can see each other walking around. The grove is the
**social productivity zone** — quiet by design, a place to "body
double" with peers while doing focused work. Phase-12+ candidates
discussed in `/planning` include shared Pomodoro timers, "deep
work / available" status above the avatar, ambient audio rooms,
and a tent-scoped whiteboard.

## The Lodge (`/`)

The member's home landing. Doorways to the world, the market, and
the dashboard. Role-aware: creators see a "studio" doorway; members
see a "tavern" doorway instead. Reached from anywhere by walking
into the cabin in the top-right of the square (lodge entry trigger).

## The Studio (`/dashboard`)

Creator-only — the keeper's studio. Six tabs:

- **studio** — overview + activity feed
- **courses** — list of authored courses; conjure-with-the-scribe button (Phase 10)
- **events** — schedule live events (Phase 9)
- **folk** — members + audience
- **payouts** — revenue + Stripe connect (post-MVP)
- **settings** — realm + creator preferences

Two AI surfaces live here:

- `/dashboard/courses/conjure` — **the Scribe**, an AI course maker
  (Phase 10). Drop in source documents, write a brief, and Gemini
  drafts an outline → lesson bodies → images across four
  approvable streaming stages. Seal materializes a real course
  tree in the database.
- TipTap WYSIWYG lesson editor at `/dashboard/courses/[id]` —
  replaced the old `@uiw/react-md-editor` split-pane in Phase 10.

## Movement + interaction (every scene)

- **W / A / S / D** or arrows — move
- **Click** on the floor — click-to-move
- **Space** — one-shot jump (in scenes that allow it)
- **ENTER** — interact with whatever the proximity prompt above
  the avatar names (sage, tablet, stall, archway, etc.)
- **Tab** — open chat bar (tavern only)
- **Esc** — close any overlay (sage dialogue, feed, modal)
