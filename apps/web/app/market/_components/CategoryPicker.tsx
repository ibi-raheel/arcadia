// Four-card landing for the market: Courses · Patterns · Tools ·
// Exclusives. Same vibe as the realm-hub doorway cards on `/`. Each
// card carries a distinct `<WaxSeal>`-style sigil colour and a count
// of how many items are inside that category.

'use client';

import {
  Desk,
  DropCap,
  Hand,
  Kicker,
  LedgerCard,
  NightRoom,
  ScrollCard,
  VellumCard,
} from '@/components/scriptorium';

import {
  CATEGORY_META,
  CATEGORY_ORDER,
  type CategoryMeta,
  type MarketCategoryId,
} from '@/lib/market/types';

type Props = {
  readonly counts: Readonly<Record<MarketCategoryId, number>>;
  readonly onPick: (id: MarketCategoryId) => void;
};

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

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 22,
              width: '100%',
              marginTop: 4,
            }}
          >
            {CATEGORY_ORDER.map((id) => (
              <PickerCard
                key={id}
                meta={CATEGORY_META[id]}
                count={counts[id]}
                onPick={() => onPick(id)}
              />
            ))}
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

function PickerCard({ meta, count, onPick }: PickerCardProps): React.JSX.Element {
  const Shell =
    meta.accent === 'verdigris' ? ScrollCard : meta.accent === 'gilt' ? LedgerCard : VellumCard;
  const sealBg =
    meta.accent === 'verdigris'
      ? 'radial-gradient(circle at 30% 25%, #88a080 0%, var(--verdigris) 55%, var(--verdigris-2))'
      : meta.accent === 'gilt'
        ? 'radial-gradient(circle at 30% 25%, var(--gilt) 0%, var(--gilt-deep) 55%, #7a5a1a)'
        : meta.accent === 'bronze'
          ? 'radial-gradient(circle at 30% 25%, var(--bronze-bright) 0%, var(--bronze) 55%, var(--bronze-deep))'
          : 'radial-gradient(circle at 30% 25%, #c87b6a 0%, var(--wax) 55%, #6e2a1f)';
  const sealColor =
    meta.accent === 'gilt'
      ? 'var(--night)'
      : meta.accent === 'bronze'
        ? 'var(--night)'
        : 'var(--vellum)';
  const tilt = ({ courses: -0.6, templates: 0.4, tools: -0.3, exclusives: 0.5 } as const)[meta.id];

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
      <Shell
        rotate={tilt}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          minHeight: 200,
          position: 'relative',
          transition: 'transform 200ms ease',
        }}
      >
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
        <Kicker>~ {meta.tagline} ~</Kicker>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 28,
            margin: '4px 0 0',
            color: 'var(--ink)',
            lineHeight: 1.05,
            paddingRight: 44,
            textTransform: 'capitalize',
          }}
        >
          {meta.label}
        </h3>
        <p
          className="body-italic"
          style={{
            marginTop: 4,
            color: 'var(--ink-soft)',
            fontSize: 14,
            lineHeight: 1.55,
          }}
        >
          {meta.blurb}
        </p>
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
            step in →
          </span>
        </div>
      </Shell>
    </button>
  );
}
