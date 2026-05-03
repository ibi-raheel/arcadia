// One-category view: list rail on the left, preview/check pane on the
// right, action footer below the preview. Selecting a row swaps the
// pane; the action button changes shape based on price + ownership.
//
// For Courses, the action button calls the real `enrolInCourse` server
// action. For Templates / Tools / Exclusives the "purchase" is
// simulated — a short delay + a local-state flip — and the parent
// (Market.tsx) tracks ownership for the rest of the session.

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';

import {
  BronzeButton,
  Chip,
  Desk,
  DropCap,
  GhostButton,
  Hand,
  Kicker,
  MapCard,
  NightRoom,
  ScrollCard,
  WaxButton,
  WaxSeal,
} from '@/components/scriptorium';

import type { CategoryMeta, MarketItem, MarketPreview } from '@/lib/market/types';

import { enrolInCourse } from '../actions';

type Props = {
  readonly meta: CategoryMeta;
  readonly items: ReadonlyArray<MarketItem>;
  readonly onBack: () => void;
  readonly onAcquired: (id: string) => void;
};

export function CategoryView({ meta, items, onBack, onAcquired }: Props): React.JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);
  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? items[0] ?? null,
    [items, selectedId],
  );

  // Esc returns to the picker.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onBack();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onBack]);

  return (
    <NightRoom>
      <Desk>
        <div
          style={{
            maxWidth: 1480,
            margin: '0 auto',
            padding: '40px 28px 60px',
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
          }}
        >
          <header
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 18,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
              <DropCap letter={meta.seal} variant="blue" />
              <div>
                <Kicker onDark>~ a stall in the market · {meta.tagline} ~</Kicker>
                <h1
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontStyle: 'italic',
                    fontSize: 42,
                    color: 'var(--vellum)',
                    margin: '4px 0 0',
                    lineHeight: 1,
                    textTransform: 'capitalize',
                  }}
                >
                  {meta.label}
                </h1>
                <Hand onDark>~ {items.length === 1 ? '1 item' : `${items.length} items`} ~</Hand>
              </div>
            </div>
            <GhostButton onClick={onBack} size="sm" onDark>
              ← back to the market
            </GhostButton>
          </header>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(320px, 420px) 1fr',
              gap: 24,
              alignItems: 'start',
            }}
          >
            <ItemList
              items={items}
              selectedId={selected?.id ?? null}
              onSelect={setSelectedId}
              meta={meta}
            />
            <PreviewPane item={selected} meta={meta} onAcquired={onAcquired} />
          </div>
        </div>
      </Desk>
    </NightRoom>
  );
}

// ─── list rail ──────────────────────────────────────────────────────

type ItemListProps = {
  readonly items: ReadonlyArray<MarketItem>;
  readonly selectedId: string | null;
  readonly onSelect: (id: string) => void;
  readonly meta: CategoryMeta;
};

function ItemList({ items, selectedId, onSelect, meta }: ItemListProps): React.JSX.Element {
  if (items.length === 0) {
    return (
      <ScrollCard>
        <p className="body-italic" style={{ color: 'var(--ink-soft)' }}>
          this stall is being set out. come back by lamplight.
        </p>
      </ScrollCard>
    );
  }
  return (
    <ScrollCard style={{ padding: 14 }}>
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          maxHeight: '70vh',
          overflowY: 'auto',
        }}
      >
        {items.map((item) => (
          <li key={item.id}>
            <ItemRow
              item={item}
              selected={item.id === selectedId}
              onSelect={() => onSelect(item.id)}
              meta={meta}
            />
          </li>
        ))}
      </ul>
    </ScrollCard>
  );
}

type ItemRowProps = {
  readonly item: MarketItem;
  readonly selected: boolean;
  readonly onSelect: () => void;
  readonly meta: CategoryMeta;
};

function ItemRow({ item, selected, onSelect }: ItemRowProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        all: 'unset',
        boxSizing: 'border-box',
        width: '100%',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '7px 10px',
        borderRadius: 3,
        border: selected ? '1px solid var(--bronze)' : '1px solid rgba(138, 106, 58, 0.18)',
        background: selected ? 'rgba(212, 165, 116, 0.16)' : 'rgba(255, 244, 210, 0.4)',
        transition: 'background 120ms ease, border-color 120ms ease',
      }}
      aria-pressed={selected}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 15,
            color: 'var(--ink)',
            lineHeight: 1.15,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
            flex: 1,
          }}
        >
          {item.title}
        </span>
        <PriceTag item={item} compact />
      </div>
      <span
        className="mono"
        style={{
          fontSize: 9,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: 'var(--ink-soft)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        by {item.creatorName}
      </span>
    </button>
  );
}

// ─── preview pane ───────────────────────────────────────────────────

type PreviewPaneProps = {
  readonly item: MarketItem | null;
  readonly meta: CategoryMeta;
  readonly onAcquired: (id: string) => void;
};

function PreviewPane({ item, meta, onAcquired }: PreviewPaneProps): React.JSX.Element {
  if (!item) {
    return (
      <MapCard>
        <p className="body-italic" style={{ color: 'var(--ink-soft)' }}>
          pick something on the left to see it up close.
        </p>
      </MapCard>
    );
  }

  return (
    <MapCard style={{ padding: 28 }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 18,
          paddingBottom: 18,
          borderBottom: '1px dashed rgba(90, 63, 34, 0.3)',
        }}
      >
        <div style={{ flex: 1 }}>
          <Kicker>{item.kicker}</Kicker>
          <h2
            style={{
              fontSize: 30,
              margin: '4px 0 0',
              color: 'var(--ink)',
              lineHeight: 1.1,
            }}
          >
            {item.title}
          </h2>
          <Hand>~ by {item.creatorName} ~</Hand>
          <p
            className="body-italic"
            style={{ marginTop: 10, color: 'var(--ink-soft)', fontSize: 15, lineHeight: 1.55 }}
          >
            {item.tagline}
          </p>
        </div>
        {item.owned && <WaxSeal letter="✓" />}
      </header>

      {item.bundleContents && item.bundleContents.length > 0 && (
        <section style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {item.bundleContents.map((c) => (
            <Chip key={c}>{c}</Chip>
          ))}
        </section>
      )}

      <section style={{ marginTop: 18 }}>
        <p style={{ color: 'var(--ink)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          {item.description}
        </p>
      </section>

      <PreviewBlock preview={item.preview} />

      <CheckoutFooter item={item} meta={meta} onAcquired={onAcquired} />
    </MapCard>
  );
}

function PreviewBlock({ preview }: { readonly preview: MarketPreview }): React.JSX.Element {
  if (preview.kind === 'text') {
    return (
      <section
        style={{
          marginTop: 18,
          padding: 14,
          borderRadius: 4,
          border: '1px dashed rgba(90, 63, 34, 0.3)',
          background: 'rgba(20, 10, 5, 0.04)',
        }}
      >
        <Kicker>preview</Kicker>
        <pre
          className="mono"
          style={{
            marginTop: 8,
            whiteSpace: 'pre-wrap',
            color: 'var(--ink-soft)',
            fontSize: 12,
            lineHeight: 1.6,
            fontFamily: 'var(--font-mono)',
          }}
        >
          {preview.body}
        </pre>
      </section>
    );
  }
  if (preview.kind === 'list') {
    return (
      <section
        style={{
          marginTop: 18,
          padding: 14,
          borderRadius: 4,
          border: '1px dashed rgba(90, 63, 34, 0.3)',
          background: 'rgba(20, 10, 5, 0.04)',
        }}
      >
        <Kicker>preview</Kicker>
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: '8px 0 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {preview.items.map((line) => (
            <li
              key={line}
              className="mono"
              style={{
                fontSize: 12,
                color: 'var(--ink-soft)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {line}
            </li>
          ))}
        </ul>
      </section>
    );
  }
  return (
    <section
      style={{
        marginTop: 18,
        padding: 18,
        borderRadius: 4,
        border: '1px dashed rgba(90, 63, 34, 0.3)',
        background: 'rgba(20, 10, 5, 0.06)',
        textAlign: 'center',
      }}
    >
      <Kicker>preview · sketch</Kicker>
      <p
        className="body-italic"
        style={{
          marginTop: 8,
          color: 'var(--ink-soft)',
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        {preview.caption}
      </p>
    </section>
  );
}

// ─── checkout footer ────────────────────────────────────────────────

type CheckoutFooterProps = {
  readonly item: MarketItem;
  readonly meta: CategoryMeta;
  readonly onAcquired: (id: string) => void;
};

function CheckoutFooter({ item, meta, onAcquired }: CheckoutFooterProps): React.JSX.Element {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCourse = item.category === 'courses';

  const handleAction = (): void => {
    if (item.owned) {
      // Owned: route to academy for courses; placeholder for others.
      if (isCourse) router.push(`/academy/${item.id}`);
      // Templates/Tools/Exclusives "download" — no-op; future: real
      // download URL. The state already shows ✓ so we don't flip.
      return;
    }
    setError(null);
    if (isCourse) {
      // Real DB write through the existing server action.
      startTransition(async () => {
        const result = await enrolInCourse(item.id);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        onAcquired(item.id);
      });
      return;
    }
    // Simulated purchase / claim — short delay so the user sees a
    // "stamping…" affordance and the state flip feels intentional.
    setSimulating(true);
    window.setTimeout(() => {
      setSimulating(false);
      onAcquired(item.id);
    }, 700);
  };

  const busy = pending || simulating;

  return (
    <footer
      style={{
        marginTop: 22,
        paddingTop: 18,
        borderTop: '1px dashed rgba(90, 63, 34, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <PriceTag item={item} />
        {error && <span style={{ color: 'var(--crimson)', fontSize: 13 }}>{error}</span>}
      </div>
      {item.owned ? (
        <BronzeButton onClick={handleAction}>{meta.ownedVerb}</BronzeButton>
      ) : item.price.kind === 'free' ? (
        <WaxButton onClick={handleAction} disabled={busy}>
          {busy ? 'sealing…' : meta.freeVerb}
        </WaxButton>
      ) : (
        <BronzeButton onClick={handleAction} disabled={busy}>
          {busy ? 'stamping…' : `${meta.paidVerb} · $${item.price.coin}`}
        </BronzeButton>
      )}
    </footer>
  );
}

// ─── shared price tag ───────────────────────────────────────────────

function PriceTag({
  item,
  compact = false,
}: {
  readonly item: MarketItem;
  readonly compact?: boolean;
}): React.JSX.Element {
  // List-rail (`compact`) renders a tight inline mono pill — the
  // standard `<Chip>` was too large there and dominated the row.
  // The footer (non-compact) keeps the full Chip so the action
  // bar reads at full weight.
  if (compact) {
    const label = item.owned
      ? 'owned'
      : item.price.kind === 'free'
        ? 'free'
        : `$${item.price.coin}`;
    return (
      <span
        className="mono"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: 1.2,
          color: 'var(--bronze-deep)',
          whiteSpace: 'nowrap',
          padding: '2px 6px',
          borderRadius: 8,
          border: '1px dashed rgba(138, 106, 58, 0.35)',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}
      >
        {label}
      </span>
    );
  }
  if (item.owned) {
    return <Chip>owned</Chip>;
  }
  if (item.price.kind === 'free') {
    return <Chip>free</Chip>;
  }
  return (
    <span
      className="mono"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 13,
        letterSpacing: 1.3,
        color: 'var(--bronze-deep)',
        whiteSpace: 'nowrap',
      }}
    >
      ${item.price.coin}
    </span>
  );
}
