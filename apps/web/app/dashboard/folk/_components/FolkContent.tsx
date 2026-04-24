// All the visual pieces of the /dashboard/folk tab, in one shared
// module so both the auth-gated production page and the public
// `/preview/folk` route can render the same UI against the same props
// shape.
//
// Kept as a pure client component — no Supabase imports — so `/preview`
// doesn't drag the auth bundle along.

'use client';

import {
  Avatar,
  Chip,
  EnvelopeCard,
  GhostButton,
  Hand,
  Kicker,
  LedgerCard,
  StackedBar,
  VellumCard,
} from '@/components/scriptorium';
import type { FolkData, FolkMember, FolkTier } from '@/lib/fixtures/folk';

export function FolkContent({ data }: { readonly data: FolkData }): React.JSX.Element {
  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 18,
          marginBottom: 22,
        }}
      >
        <KpiEnvelope label="paying folk" value={`${data.totalPaying}`} hint="scribes + keepers" />
        <KpiEnvelope label="all folk" value={`${data.totalFolk}`} hint="everyone in the realm" />
        <KpiEnvelope label="new · 7d" value={`${data.newThisWeek}`} hint="arrived this week" />
        <KpiEnvelope
          label="gone quiet"
          value={`${data.churnRisk}`}
          hint="unseen &gt; 14 days"
          variant="wax"
        />
      </div>

      <MRRBlock money={data.money} tiers={data.tiers} />

      {data.tiers.length > 0 && (
        <section style={{ marginTop: 26 }}>
          <div style={{ marginBottom: 10 }}>
            <Kicker onDark>your tiers · five doors, one hearth</Kicker>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${data.tiers.length}, minmax(0, 1fr))`,
              gap: 12,
            }}
          >
            {data.tiers.map((t) => (
              <TierCard key={t.key} tier={t} />
            ))}
          </div>
        </section>
      )}

      <LedgerCard style={{ marginTop: 22 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <Kicker>the roll</Kicker>
          <Hand>~ newest → quietest, by last seen ~</Hand>
        </div>
        <MembersTable members={data.members} />
      </LedgerCard>

      <VellumCard style={{ marginTop: 22 }}>
        <Kicker>writing to folk</Kicker>
        <p className="body-italic" style={{ marginTop: 10, color: 'var(--ink)' }}>
          Sending notes to this roll isn&rsquo;t wired yet — the outgoing missive tray arrives in a
          later chapter. For now, the list above is what&rsquo;s known.
        </p>
      </VellumCard>
    </>
  );
}

function TierCard({ tier }: { readonly tier: FolkTier }): React.JSX.Element {
  const isFree = tier.rate === 0;
  return (
    <VellumCard
      style={{
        padding: '22px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        position: 'relative',
      }}
    >
      {/* Color-coded corner marker so the card signals which slice of
          the MRR composition bar it owns. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 14,
          right: 18,
          width: 10,
          height: 10,
          background: tier.color,
          borderRadius: 2,
        }}
      />
      <div style={{ minHeight: 76, paddingRight: 20 }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 21,
            color: 'var(--ink)',
            lineHeight: 1.1,
            marginBottom: 6,
          }}
        >
          {tier.name}
        </div>
        <div className="hand" style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.3 }}>
          ~ {tier.desc} ~
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        {isFree ? (
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 42,
              color: 'var(--ink-soft)',
              lineHeight: 1,
            }}
          >
            free
          </span>
        ) : (
          <>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: 18,
                color: 'var(--ink-faint)',
              }}
            >
              $
            </span>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: 42,
                color: 'var(--oxblood)',
                lineHeight: 1,
                fontVariantNumeric: 'oldstyle-nums',
              }}
            >
              {tier.rate}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontStyle: 'italic',
                fontSize: 15,
                color: 'var(--ink-faint)',
              }}
            >
              /mo
            </span>
          </>
        )}
      </div>
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {tier.benefits.map((b) => (
          <li
            key={b}
            style={{
              display: 'flex',
              gap: 8,
              fontFamily: 'var(--font-body)',
              fontStyle: 'italic',
              fontSize: 14,
              color: 'var(--ink)',
              lineHeight: 1.35,
            }}
          >
            <span
              aria-hidden="true"
              style={{ color: 'var(--verdigris-2)', fontFamily: 'var(--font-display)' }}
            >
              ✓
            </span>
            {b}
          </li>
        ))}
      </ul>
      <div
        style={{
          marginTop: 'auto',
          paddingTop: 10,
          borderTop: '1px dashed rgba(90, 63, 34, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 22,
              color: 'var(--ink)',
              lineHeight: 1,
              fontVariantNumeric: 'oldstyle-nums',
            }}
          >
            {tier.count.toLocaleString()}
          </div>
          <div
            className="mono"
            style={{
              fontSize: 9,
              letterSpacing: 1.3,
              color: 'var(--ink-faint)',
              textTransform: 'uppercase',
              marginTop: 2,
            }}
          >
            subscribers
          </div>
        </div>
        <GhostButton size="sm" disabled title="Tier editor lands in the next chapter">
          edit
        </GhostButton>
      </div>
    </VellumCard>
  );
}

function MRRBlock({
  money,
  tiers,
}: {
  readonly money: FolkData['money'];
  readonly tiers: readonly FolkTier[];
}): React.JSX.Element {
  const paying = tiers.filter((t) => t.rate > 0);
  const computedTotal = paying.reduce((s, t) => s + t.count * t.rate, 0);
  // Trust the fixture's `money.mrr` when it's set; fall back to the
  // sum so the real-mode "all zeros" path still renders a legible card.
  const total = money.mrr > 0 ? money.mrr : computedTotal;
  const positive = money.mrrDelta > 0;
  const negative = money.mrrDelta < 0;
  const deltaColor = positive ? 'var(--verdigris)' : negative ? 'var(--wax)' : 'var(--ink-faint)';
  const arrow = positive ? '▲' : negative ? '▼' : '·';

  return (
    <LedgerCard style={{ padding: '22px 26px', marginTop: 22 }} rotate={-0.2}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '220px 1fr',
          gap: 30,
          alignItems: 'center',
        }}
      >
        <div>
          <Kicker>recurring · MRR</Kicker>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 56,
              color: 'var(--ink)',
              lineHeight: 1,
              marginTop: 4,
              fontVariantNumeric: 'oldstyle-nums',
            }}
          >
            ${total.toLocaleString()}
          </div>
          {money.mrrDelta !== 0 && (
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: 1.3,
                color: deltaColor,
                marginTop: 6,
                textTransform: 'uppercase',
              }}
            >
              {arrow} {Math.abs(money.mrrDelta).toFixed(1)}% vs prev
            </div>
          )}
          <Hand>~ every moon, while you sleep ~</Hand>
        </div>
        <div>
          {paying.length === 0 ? (
            <p className="body-italic" style={{ color: 'var(--ink-quiet)' }}>
              no paying tiers yet — when you open a tier in settings, the composition bar lights up
              here.
            </p>
          ) : (
            <>
              <StackedBar
                height={18}
                total={total}
                segments={paying.map((t) => ({
                  value: t.count * t.rate,
                  color: t.color,
                  label: `${t.name}: $${t.count * t.rate}`,
                }))}
                style={{
                  border: '1.5px solid var(--bronze-deep)',
                  borderRadius: 2,
                  marginBottom: 10,
                }}
              />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 10,
                }}
              >
                {paying.map((t) => {
                  const mrr = t.count * t.rate;
                  return (
                    <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{ width: 10, height: 10, background: t.color, borderRadius: 2 }}
                      />
                      <span
                        style={{
                          flex: 1,
                          fontFamily: 'var(--font-display)',
                          fontStyle: 'italic',
                          fontSize: 15,
                          color: 'var(--ink)',
                        }}
                      >
                        {t.name}
                      </span>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
                        {t.count}×${t.rate}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontStyle: 'italic',
                          fontSize: 16,
                          color: 'var(--oxblood)',
                          minWidth: 58,
                          textAlign: 'right',
                          fontVariantNumeric: 'oldstyle-nums',
                        }}
                      >
                        ${mrr}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </LedgerCard>
  );
}

function KpiEnvelope({
  label,
  value,
  hint,
  variant = 'envelope',
}: {
  readonly label: string;
  readonly value: string;
  readonly hint: string;
  readonly variant?: 'envelope' | 'wax';
}): React.JSX.Element {
  const color = variant === 'wax' ? 'var(--crimson)' : 'var(--vellum)';
  return (
    <EnvelopeCard>
      <Kicker>{label}</Kicker>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 40,
          color,
          lineHeight: 1,
          marginTop: 6,
        }}
      >
        {value}
      </div>
      <Hand onDark>{`~ ${hint} ~`}</Hand>
    </EnvelopeCard>
  );
}

function RoleChip({ role }: { readonly role: FolkMember['role'] }): React.JSX.Element {
  if (role === 'keeper') return <Chip variant="wax">keeper</Chip>;
  if (role === 'scribe') return <Chip>scribe</Chip>;
  return <Chip variant="verdigris">wanderer</Chip>;
}

function MembersTable({ members }: { readonly members: readonly FolkMember[] }): React.JSX.Element {
  return (
    <table style={{ width: '100%', marginTop: 10, borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <Th>scribe</Th>
          <Th>role</Th>
          <Th>enrolments</Th>
          <Th>level · xp</Th>
          <Th>streak</Th>
          <Th>last seen</Th>
        </tr>
      </thead>
      <tbody>
        {members.map((m) => (
          <tr key={m.id} style={{ borderTop: '1px dashed rgba(90,63,34,0.25)' }}>
            <Td>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                <Avatar letter={m.seal} />
                <span style={{ color: 'var(--ink)' }}>{m.name}</span>
              </span>
            </Td>
            <Td>
              <RoleChip role={m.role} />
            </Td>
            <Td>
              <span className="mono" style={{ color: 'var(--ink-faint)' }}>
                {m.enrolmentCount}
              </span>
            </Td>
            <Td>
              <span style={{ color: 'var(--ink)' }}>
                {m.level}
                <span className="mono" style={{ color: 'var(--ink-faint)', marginLeft: 6 }}>
                  · {m.xp} xp
                </span>
              </span>
            </Td>
            <Td>
              {m.streakDays === 0 ? (
                <span style={{ color: 'var(--ink-quiet)' }}>—</span>
              ) : (
                <span
                  className="mono"
                  style={{ color: 'var(--oxblood)', fontWeight: 500 }}
                >{`${m.streakDays}d`}</span>
              )}
            </Td>
            <Td>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: 'var(--ink)' }}>{m.lastSeen}</span>
                {m.note && <Hand>{m.note}</Hand>}
              </div>
            </Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Th({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  return (
    <th
      style={{
        textAlign: 'left',
        padding: '10px',
        fontFamily: 'var(--font-caps)',
        fontSize: 11,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: 'var(--ink-soft)',
        fontWeight: 500,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  return (
    <td style={{ padding: '10px', fontFamily: 'var(--font-body)', fontSize: 15 }}>{children}</td>
  );
}
