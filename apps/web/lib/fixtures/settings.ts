// Settings fixture — realm profile, keeper account, notifications. Real
// mode will read current Supabase rows in follow-ups; Phase 8 ships
// the visual.

export type SettingsData = {
  readonly realm: {
    readonly name: string;
    readonly seal: string;
    readonly foundedLabel: string;
    readonly description: string;
    readonly tavernMotto: string;
  };
  readonly keeper: {
    readonly displayName: string;
    readonly email: string;
    readonly bio: string;
    readonly avatarInitial: string;
  };
  readonly notifications: readonly {
    readonly key: string;
    readonly label: string;
    readonly hint: string;
    readonly enabled: boolean;
  }[];
};

export const SETTINGS_FIXTURE: SettingsData = {
  realm: {
    name: 'the Rook & Lantern',
    seal: 'R',
    foundedLabel: 'spring · XXIII',
    description:
      'A small school for hand-work — charcoal, forge, ink, wax. Lit by lamplight, kept by hand.',
    tavernMotto: 'evenings long, ink patient.',
  },
  keeper: {
    displayName: 'Rosalind Ash',
    email: 'rosalind@rook-lantern.arcadia',
    bio: 'Teaches the slow crafts. Was once an archivist.',
    avatarInitial: 'R',
  },
  notifications: [
    {
      key: 'new-enrolment',
      label: 'a new scribe enrols',
      hint: 'a wax-seal letter lands',
      enabled: true,
    },
    {
      key: 'lesson-complete',
      label: 'a scribe finishes a course',
      hint: 'a medallion is struck',
      enabled: true,
    },
    {
      key: 'daily-roll',
      label: 'the day&rsquo;s roll',
      hint: 'one note, each morning',
      enabled: false,
    },
    {
      key: 'payout-arrived',
      label: 'a payout arrives',
      hint: 'coin in the jar',
      enabled: true,
    },
    {
      key: 'tavern-message',
      label: 'mention in the tavern',
      hint: 'a voice calls your name',
      enabled: false,
    },
  ],
};
