// Shared types for the four-category market view.
//
// Courses are real (DB-backed) — Patterns, Tools, Exclusives are
// simulated fixtures for the demo. The shape is the same across all
// four so `<CategoryView>` doesn't need to branch on category, just on
// preview kind + price kind.

export type MarketCategoryId = 'courses' | 'templates' | 'tools' | 'exclusives';

export type MarketPrice =
  | { readonly kind: 'free' }
  | { readonly kind: 'paid'; readonly coin: number };

export type MarketPreview =
  | { readonly kind: 'text'; readonly body: string }
  | { readonly kind: 'list'; readonly items: readonly string[] }
  | { readonly kind: 'mock-screenshot'; readonly caption: string };

export type MarketItem = {
  readonly id: string;
  readonly category: MarketCategoryId;
  readonly title: string;
  readonly creatorName: string;
  readonly kicker: string;
  readonly tagline: string;
  readonly description: string;
  readonly price: MarketPrice;
  readonly preview: MarketPreview;
  /** Pre-owned (Courses set this from real `enrolments`; the
   *  fixtures leave it false and the UI tracks owned-this-session). */
  readonly owned: boolean;
  /** For Exclusives: short labels of what's inside (rendered as
   *  pills under the title). */
  readonly bundleContents?: readonly string[];
};

export type CategoryMeta = {
  readonly id: MarketCategoryId;
  /** Visible label, lowercase (matches scriptorium voice). */
  readonly label: string;
  /** One-line "what is this category" line under the label. */
  readonly tagline: string;
  /** Short copy on the picker card. */
  readonly blurb: string;
  /** Single letter for the `<WaxSeal>`. */
  readonly seal: string;
  /** Drives the doorway-card colour. Mirrors the realm-hub palette. */
  readonly accent: 'verdigris' | 'wax' | 'gilt' | 'bronze';
  /** Verb shown on the action button when claiming a free item. */
  readonly freeVerb: string;
  /** Verb shown on the action button when buying a paid item. */
  readonly paidVerb: string;
  /** Verb shown when the item is already owned (downloads / opens). */
  readonly ownedVerb: string;
};

export const CATEGORY_META: Record<MarketCategoryId, CategoryMeta> = {
  courses: {
    id: 'courses',
    label: 'courses',
    tagline: 'long-form lessons by lamplight',
    blurb: 'Step-by-step teachings from the keepers of this realm. Each scroll is a journey.',
    seal: 'C',
    accent: 'verdigris',
    freeVerb: 'seal the pact',
    paidVerb: 'pay & enrol',
    ownedVerb: 'step inside →',
  },
  templates: {
    id: 'templates',
    label: 'templates',
    tagline: 'templates, swipe files, blueprints',
    blurb:
      'Templates you can reach for when the page is blank — Notion docs, design files, copy starters.',
    seal: 'T',
    accent: 'wax',
    freeVerb: 'claim the template',
    paidVerb: 'pay & download',
    ownedVerb: 'download →',
  },
  tools: {
    id: 'tools',
    label: 'tools',
    tagline: 'software, scripts, plugins',
    blurb:
      'Sharpened implements — small programs, browser extensions, automation scripts the keeper has forged.',
    seal: 'W',
    accent: 'bronze',
    freeVerb: 'claim the tool',
    paidVerb: 'pay & download',
    ownedVerb: 'download →',
  },
  exclusives: {
    id: 'exclusives',
    label: 'exclusives',
    tagline: 'sealed bundles · members-only',
    blurb:
      'A coffer of mixed goods — a course, a few patterns, a tool — bundled at a kinder price than the parts alone.',
    seal: 'E',
    accent: 'gilt',
    freeVerb: 'unbind the coffer',
    paidVerb: 'pay & unbind',
    ownedVerb: 'open the coffer →',
  },
};

export const CATEGORY_ORDER: ReadonlyArray<MarketCategoryId> = [
  'courses',
  'templates',
  'tools',
  'exclusives',
];
