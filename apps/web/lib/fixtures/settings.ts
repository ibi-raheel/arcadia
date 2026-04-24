// Settings fixture — realm profile, keeper account, notifications,
// billing, integrations, security. Real mode will read Supabase + Stripe
// + third-party connectors in follow-ups; Phase 8 ships the visual.

export type NotificationPref = {
  readonly key: string;
  readonly label: string;
  readonly hint: string;
  readonly email: boolean;
  readonly push: boolean;
};

export type BillingPlan = {
  readonly name: string;
  readonly priceLabel: string; // "$19/mo" or "free"
  readonly tagline: string;
  readonly features: readonly string[];
  readonly current: boolean;
  readonly cta: string; // "current plan" / "switch" / "downgrade"
};

export type BillingInvoice = {
  readonly id: string;
  readonly date: string; // "Apr 1, 2026"
  readonly reference: string;
  readonly amount: number;
  readonly status: 'paid' | 'pending' | 'failed';
};

export type BillingData = {
  readonly plans: readonly BillingPlan[];
  readonly paymentMethodLabel: string; // "Visa ••4242"
  readonly paymentMethodExpires: string; // "10/28"
  readonly billingEmail: string;
  readonly invoices: readonly BillingInvoice[];
};

export type IntegrationStatus = 'connected' | 'available' | 'coming-soon';
export type IntegrationTile = {
  readonly key: string;
  readonly name: string;
  readonly category: string; // "payments" / "newsletter" / etc
  readonly description: string;
  readonly status: IntegrationStatus;
  /** Short emblem — rendered in the tile's colored square. */
  readonly emblem: string;
  readonly tint: string; // CSS color
};

export type SecurityData = {
  readonly twoFactorEnabled: boolean;
  readonly lastLogin: { readonly when: string; readonly from: string };
  readonly sessions: readonly {
    readonly id: string;
    readonly device: string;
    readonly where: string;
    readonly lastSeen: string;
    readonly current: boolean;
  }[];
};

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
  readonly notifications: readonly NotificationPref[];
  readonly billing: BillingData;
  readonly integrations: readonly IntegrationTile[];
  readonly security: SecurityData;
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
      email: true,
      push: true,
    },
    {
      key: 'lesson-complete',
      label: 'a scribe finishes a course',
      hint: 'a medallion is struck',
      email: true,
      push: false,
    },
    {
      key: 'daily-roll',
      label: 'the day’s roll',
      hint: 'one note, each morning',
      email: false,
      push: false,
    },
    {
      key: 'payout-arrived',
      label: 'a payout arrives',
      hint: 'coin in the jar',
      email: true,
      push: true,
    },
    {
      key: 'tavern-message',
      label: 'mention in the tavern',
      hint: 'a voice calls your name',
      email: false,
      push: true,
    },
    {
      key: 'review-posted',
      label: 'a review is posted',
      hint: 'the book of names grows',
      email: true,
      push: false,
    },
  ],
  billing: {
    plans: [
      {
        name: 'wanderer',
        priceLabel: 'free',
        tagline: 'try the tools, keep the vellum',
        features: [
          'one published course',
          'up to 50 folk',
          'the letter (1 send/month)',
          'Arcadia watermark on the seal',
        ],
        current: false,
        cta: 'downgrade',
      },
      {
        name: 'keeper',
        priceLabel: '$19/mo',
        tagline: 'a realm, lit by lantern',
        features: [
          'unlimited courses + lessons',
          'unlimited folk',
          'custom seal + colophon',
          'the letter (unlimited)',
          'standard support · 2 days',
        ],
        current: true,
        cta: 'current plan',
      },
      {
        name: 'patron',
        priceLabel: '$49/mo',
        tagline: 'for keepers with a following',
        features: [
          'everything in keeper',
          'custom domain',
          'members-only audio room',
          'priority support · same day',
          'early access · new parchments',
        ],
        current: false,
        cta: 'step up',
      },
    ],
    paymentMethodLabel: 'Visa ••4242',
    paymentMethodExpires: '10/28',
    billingEmail: 'rosalind@rook-lantern.arcadia',
    invoices: [
      { id: 'i1', date: 'Apr 1, 2026', reference: 'in_Qp24Ax3L', amount: 19, status: 'paid' },
      { id: 'i2', date: 'Mar 1, 2026', reference: 'in_QmJ19Bs0', amount: 19, status: 'paid' },
      { id: 'i3', date: 'Feb 1, 2026', reference: 'in_Qk9Z4tB2', amount: 19, status: 'paid' },
      { id: 'i4', date: 'Jan 1, 2026', reference: 'in_QhJ3R9eP', amount: 19, status: 'paid' },
      { id: 'i5', date: 'Dec 1, 2025', reference: 'in_QeL0M1Ay', amount: 19, status: 'paid' },
    ],
  },
  integrations: [
    {
      key: 'stripe',
      name: 'Stripe',
      category: 'payments',
      description: 'collect from scribes, pay yourself from the jar.',
      status: 'connected',
      emblem: 'S',
      tint: '#635bff',
    },
    {
      key: 'mailhouse',
      name: 'Mailhouse',
      category: 'the letter · newsletter',
      description: 'send your weekly letter to folk who opted in.',
      status: 'connected',
      emblem: '✉',
      tint: '#f2c469',
    },
    {
      key: 'bookpost',
      name: 'Bookpost',
      category: 'outgoing post',
      description: 'scheduled drips and welcome notes when a scribe enrols.',
      status: 'available',
      emblem: '❦',
      tint: '#8f2530',
    },
    {
      key: 'analytics',
      name: 'the Chronicler',
      category: 'analytics',
      description: 'page visits, retention, journey maps — all quill-drawn.',
      status: 'available',
      emblem: '✦',
      tint: '#5a7a5c',
    },
    {
      key: 'discord',
      name: 'Discord',
      category: 'the tavern · off-site',
      description: 'mirror tavern chat to your server, and the other way.',
      status: 'coming-soon',
      emblem: 'D',
      tint: '#5865f2',
    },
    {
      key: 'zapier',
      name: 'Zapier',
      category: 'threads to everywhere',
      description: 'wire enrolments + payouts into anything else you run.',
      status: 'coming-soon',
      emblem: 'Z',
      tint: '#ff4a00',
    },
  ],
  security: {
    twoFactorEnabled: true,
    lastLogin: { when: '2 hours ago', from: 'Edinburgh · Scotland' },
    sessions: [
      {
        id: 's1',
        device: 'Chrome · macOS',
        where: 'Edinburgh · Scotland',
        lastSeen: 'now',
        current: true,
      },
      {
        id: 's2',
        device: 'Safari · iPhone',
        where: 'Edinburgh · Scotland',
        lastSeen: '4 hours ago',
        current: false,
      },
      {
        id: 's3',
        device: 'Firefox · Windows',
        where: 'Berlin · Germany',
        lastSeen: '3 days ago',
        current: false,
      },
    ],
  },
};
