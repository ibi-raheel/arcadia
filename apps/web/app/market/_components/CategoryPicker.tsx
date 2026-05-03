// Four-card landing for the market: Courses · Templates · Tools ·
// Exclusives. Layout is **3 on top, 1 wide on bottom** — the wide
// bottom card is Exclusives, with a pulsing gilt halo to signal
// premium-tier ("highly prominent" per user feedback 2026-05-02).
// The top three share the same VellumCard primitive so they read
// as a cohesive set; only the wax-seal sigil + accent colour
// differs between them. Pre-2026-05-02 the top three used three
// different shells (Scroll / Vellum / Vellum), which read as
// inconsistent in the user's screenshot.

'use client';

import {
  Desk,
  DropCap,
  Hand,
  Kicker,
  LedgerCard,
  NightRoom,
  VellumCard,
} from '@/components/scriptorium';

import { CATEGORY_META, type CategoryMeta, type MarketCategoryId } from '@/lib/market/types';

type Props = {
  readonly counts: Readonly<Record<MarketCategoryId, number>>;
  readonly onPick: (id: MarketCategoryId) => void;
};

const TOP_ROW: ReadonlyArray<MarketCategoryId> = ['courses', 'templates', 'tools'];

export function CategoryPicker({ counts, onPick }: Props): React.JSX.Element {
  return (
    <NightRoom>
      <Desk>
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '60px 28px 60px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
          }}
        >
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              textAlign: 'left',
              width: '100%',
              maxWidth: 760,
            }}
          >
            <DropCap letter="M" variant="blue" />
            <div style={{ flex: 1 }}>
              <Kicker onDark>~ the market is open ~</Kicker>
              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontSize: 54,
                  lineHeight: 1,
                  color: 'var(--vellum)',
                  margin: '4px 0 0',
                  letterSpacing: '-0.5px',
                }}
              >
                The Market
              </h1>
              <p
                className="body-italic"
                style={{
                  marginTop: 8,
                  color: 'var(--vellum-2)',
                  fontSize: 17,
                }}
              >
                Pick a stall. Long-form lessons, ready-made templates, sharpened tools, or sealed
                coffers — the keepers of this realm have laid them all out.
              </p>
            </div>
          </header>

          {/* Top row — three equal cards. Responsive: 3 → 2 → 1
              columns as the viewport narrows (see globals.css
              `.market-picker-top-row` media queries). */}
          <div className="market-picker-top-row">
            {TOP_ROW.map((id) => (
              <PickerCard
                key={id}
                meta={CATEGORY_META[id]}
                count={counts[id]}
                onPick={() => onPick(id)}
              />
            ))}
          </div>

          {/* Bottom row — Exclusives spans the full width with a
              pulsing gilt halo. */}
          <div style={{ width: '100%' }}>
            <ExclusiveCard
              meta={CATEGORY_META.exclusives}
              count={counts.exclusives}
              onPick={() => onPick('exclusives')}
            />
          </div>
        </div>
      </Desk>
    </NightRoom>
  );
}

type PickerCardProps = {
  readonly meta: CategoryMeta;
  readonly count: number;
  readonly onPick: () => void;
};

/** The three top-row cards. Same shell + layout, only the seal
 *  + tilt + tagline change. */
function PickerCard({ meta, count, onPick }: PickerCardProps): React.JSX.Element {
  const tilt = ({ courses: -0.6, templates: 0.4, tools: -0.3 } as const)[
    meta.id as 'courses' | 'templates' | 'tools'
  ];
  return (
    <button
      type="button"
      onClick={onPick}
      style={{
        all: 'unset',
        display: 'block',
        cursor: 'pointer',
        width: '100%',
      }}
      aria-label={`open the ${meta.label} stall (${count} items)`}
    >
      <VellumCard
        rotate={tilt}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          minHeight: 220,
          position: 'relative',
          transition: 'transform 200ms ease',
        }}
      >
        <CardSeal meta={meta} />
        <Kicker>~ {meta.tagline} ~</Kicker>
        <h3 style={cardTitleStyle}>{meta.label}</h3>
        <p className="body-italic" style={cardBlurbStyle}>
          {meta.blurb}
        </p>
        <CardFooter count={count} />
      </VellumCard>
    </button>
  );
}

/** The wide bottom-row Exclusives card. Same content shape as the
 *  top row but: full width, slightly taller, LedgerCard primitive
 *  (gilt-leaf surface). The `.market-exclusives-glow` className is
 *  applied directly to the LedgerCard so the pulsing box-shadow
 *  follows the card's actual rounded edge — wrapping it in a div
 *  with mismatched border-radius left a visible gap (user
 *  feedback 2026-05-02). */
function ExclusiveCard({ meta, count, onPick }: PickerCardProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onPick}
      style={{
        all: 'unset',
        display: 'block',
        cursor: 'pointer',
        width: '100%',
      }}
      aria-label={`open the ${meta.label} stall (${count} items)`}
    >
      <LedgerCard
        rotate={0.3}
        className="market-exclusives-glow"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          minHeight: 200,
          position: 'relative',
          transition: 'transform 200ms ease',
        }}
      >
        <CardSeal meta={meta} />
        <Kicker>~ {meta.tagline} ~</Kicker>
        <h3 style={{ ...cardTitleStyle, fontSize: 34 }}>{meta.label}</h3>
        <p className="body-italic" style={{ ...cardBlurbStyle, fontSize: 15, maxWidth: 720 }}>
          {meta.blurb}
        </p>
        <CardFooter count={count} cta="open the coffer →" />
      </LedgerCard>
    </button>
  );
}

function CardSeal({ meta }: { readonly meta: CategoryMeta }): React.JSX.Element {
  const sealBg =
    meta.accent === 'verdigris'
      ? 'radial-gradient(circle at 30% 25%, #88a080 0%, var(--verdigris) 55%, var(--verdigris-2))'
      : meta.accent === 'gilt'
        ? 'radial-gradient(circle at 30% 25%, var(--gilt) 0%, var(--gilt-deep) 55%, #7a5a1a)'
        : meta.accent === 'bronze'
          ? 'radial-gradient(circle at 30% 25%, var(--bronze-bright) 0%, var(--bronze) 55%, var(--bronze-deep))'
          : 'radial-gradient(circle at 30% 25%, #c87b6a 0%, var(--wax) 55%, #6e2a1f)';
  const sealColor =
    meta.accent === 'gilt' || meta.accent === 'bronze' ? 'var(--night)' : 'var(--vellum)';
  return (
    <div style={{ position: 'absolute', top: 12, right: 12 }}>
      <div
        className="wax-seal"
        style={{
          background: sealBg,
          color: sealColor,
        }}
      >
        {meta.seal}
      </div>
    </div>
  );
}

function CardFooter({
  count,
  cta = 'step in →',
}: {
  readonly count: number;
  readonly cta?: string;
}): React.JSX.Element {
  return (
    <div
      style={{
        marginTop: 'auto',
        paddingTop: 12,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <Hand>~ {count === 1 ? '1 item' : `${count} items`} ~</Hand>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 14,
          color: 'var(--bronze-deep)',
        }}
      >
        {cta}
      </span>
    </div>
  );
}

const cardTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontStyle: 'italic',
  fontSize: 28,
  margin: '4px 0 0',
  color: 'var(--ink)',
  lineHeight: 1.05,
  paddingRight: 44,
  textTransform: 'capitalize',
};

const cardBlurbStyle: React.CSSProperties = {
  marginTop: 4,
  color: 'var(--ink-soft)',
  fontSize: 14,
  lineHeight: 1.55,
};
