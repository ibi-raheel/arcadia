// The four flip cards shown in the Sage's welcome popup. Pure data —
// no rendering decisions in here. Edit the copy, ship: there is no
// migration, no LLM, no API call.
//
// Per ADR 0017, the Sage stopped being an LLM-backed chat in Phase 13
// and became a static welcome surface. This file is the entire body of
// content the Sage now serves.

export type SageCard = {
  /** Stable id; used for React keys + analytics if we ever add it. */
  readonly id: 'academy' | 'square' | 'tavern' | 'coworking';
  /** Title shown on the front face. */
  readonly label: string;
  /** Single uppercase letter rendered as a wax seal on the front. */
  readonly sigil: string;
  /** ≤ 60 chars. One-line teaser on the front. */
  readonly tagline: string;
  /** 2–3 short sentences. Body of the back face. */
  readonly body: string;
  /** Navigation cue. Where to go next, in plain prose. */
  readonly hint: string;
};

export const SAGE_CARDS: readonly SageCard[] = [
  {
    id: 'academy',
    label: 'The Academy',
    sigil: 'A',
    tagline: 'Where members learn from your courses.',
    body: 'The academy is a hall of study scrolls. Each course is a wing; each lesson opens like a chapter you can read at your own pace. Progress is tracked as you go, and finishing a course earns you sigils.',
    hint: 'Walk north of the square, and weave through the doors.',
  },
  {
    id: 'square',
    label: 'The Square',
    sigil: 'S',
    tagline: 'The crossroads where every traveller passes.',
    body: "This is the central plaza. Other members wander here too — walk close and you'll see who they are. Doorways lead to every neighbourhood, and the wanderer (that's me) keeps a rug in the upper-left corner.",
    hint: "You're standing in it now.",
  },
  {
    id: 'tavern',
    label: 'The Tavern',
    sigil: 'T',
    tagline: 'Gather, chat, watch the leaderboard, follow the feed.',
    body: 'The tavern is the social hall. Pull up a chair to chat with whoever is there, glance at the leaderboard for the top travellers, and read the feed for ongoing discussions. The tavern also hosts live events — livestreams, Q&As, AMAs.',
    hint: 'Walk east from the square; pick any of the three tavern doors.',
  },
  {
    id: 'coworking',
    label: 'The Coworking Grove',
    sigil: 'C',
    tagline: 'A quiet tent for working alongside others.',
    body: 'The coworking grove is body-doubling, by design. Step inside, queue an ambient track on the jukebox, start a Pomodoro on the hourglass, set what you are working on — and other travellers can do the same beside you, quietly.',
    hint: 'Walk west from the square, and enter any tent you like.',
  },
] as const;
