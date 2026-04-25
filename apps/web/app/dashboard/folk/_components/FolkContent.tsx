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
  BarProgress,
  Chip,
  EnvelopeCard,
  GhostButton,
  Hand,
  Kicker,
  LedgerCard,
  StackedBar,
  VellumCard,
} from '@/components/scriptorium';
import { buildSparkline } from '@/lib/charts/sparkline';
import type {
  FolkAcquisitionSource,
  FolkAtRiskEntry,
  FolkCohort,
  FolkData,
  FolkGeoEntry,
  FolkGrowth,
  FolkMember,
  FolkNewsletter,
  FolkRetentionCurve,
  FolkRiskUrgency,
  FolkTier,
} from '@/lib/fixtures/folk';

export function FolkContent({ data }: { readonly data: FolkData }): React.JSX.Element {
  return (
    <>
      {data.growth.totalPeople > 0 && (
        <div style={{ marginBottom: 22 }}>
          <GrowthHero growth={data.growth} paying={data.totalPaying} />
        </div>
      )}

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

      {(data.acquisition.length > 0 || data.geography.length > 0) && (
        <section
          style={{
            marginTop: 22,
            display: 'grid',
            // Kit pairs these 1.2fr/1fr: acquisition gets the extra column
            // because the source labels vary more in length.
            gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
            gap: 20,
          }}
        >
          {data.acquisition.length > 0 ? <AcquisitionCard sources={data.acquisition} /> : <div />}
          {data.geography.length > 0 ? <GeographyCard entries={data.geography} /> : <div />}
        </section>
      )}

      {data.cohorts.length > 0 && (
        <section style={{ marginTop: 22 }}>
          <CohortsCard cohorts={data.cohorts} />
        </section>
      )}

      {data.newsletter && (
        <section style={{ marginTop: 22 }}>
          <NewsletterCard data={data.newsletter} />
        </section>
      )}

      {(data.retentionCurves.length > 0 || data.atRisk.length > 0) && (
        <section
          style={{
            marginTop: 22,
            display: 'grid',
            // `1.3fr 1fr` — retention card reads as the primary surface,
            // at-risk list as the sidebar companion. Collapses to one
            // column under 900px so neither panel squeezes.
            gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)',
            gap: 20,
          }}
        >
          {data.retentionCurves.length > 0 ? (
            <RetentionCurveCard curves={data.retentionCurves} />
          ) : (
            <div />
          )}
          {data.atRisk.length > 0 ? <AtRiskCard risks={data.atRisk} /> : <div />}
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

function GrowthHero({
  growth,
  paying,
}: {
  readonly growth: FolkGrowth;
  readonly paying: number;
}): React.JSX.Element {
  const hasSeries = growth.series.length >= 2;
  const sparkline = hasSeries
    ? buildSparkline(growth.series as readonly number[], { width: 560, height: 150 })
    : null;
  return (
    <VellumCard style={{ padding: '24px 28px' }} rotate={-0.3}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: 30,
          alignItems: 'center',
        }}
      >
        <div>
          <Kicker>every soul in the realm</Kicker>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 64,
              color: 'var(--ink)',
              lineHeight: 1,
              fontVariantNumeric: 'oldstyle-nums',
              marginTop: 4,
            }}
          >
            {growth.totalPeople.toLocaleString()}
          </div>
          <Hand>
            ~ {growth.followers} free · {paying} paying · some just passing ~
          </Hand>
          <div style={{ display: 'flex', gap: 28, marginTop: 18, flexWrap: 'wrap' }}>
            <div>
              <Kicker>new · 30d</Kicker>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontSize: 28,
                  color: 'var(--oxblood)',
                  fontVariantNumeric: 'oldstyle-nums',
                  lineHeight: 1,
                  marginTop: 4,
                }}
              >
                +{growth.new30d.toLocaleString()}
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: 1.3,
                  color: growth.growthDelta >= 0 ? 'var(--verdigris)' : 'var(--wax)',
                  marginTop: 4,
                }}
              >
                {growth.growthDelta >= 0 ? '▲' : '▼'} {Math.abs(growth.growthDelta).toFixed(1)}%
              </div>
            </div>
            <div>
              <Kicker>on the letter</Kicker>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontSize: 28,
                  color: 'var(--ink)',
                  fontVariantNumeric: 'oldstyle-nums',
                  lineHeight: 1,
                  marginTop: 4,
                }}
              >
                {growth.newsletter.toLocaleString()}
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: 1.3,
                  color: 'var(--ink-soft)',
                  marginTop: 4,
                  textTransform: 'uppercase',
                }}
              >
                subscribed
              </div>
            </div>
            <div>
              <Kicker>followers · free</Kicker>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontSize: 28,
                  color: 'var(--ink)',
                  fontVariantNumeric: 'oldstyle-nums',
                  lineHeight: 1,
                  marginTop: 4,
                }}
              >
                {growth.followers.toLocaleString()}
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: 1.3,
                  color: 'var(--ink-soft)',
                  marginTop: 4,
                  textTransform: 'uppercase',
                }}
              >
                wanderers
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '10px 4px' }}>
          {sparkline ? (
            <svg
              viewBox={sparkline.viewBox}
              width="100%"
              height={160}
              preserveAspectRatio="none"
              role="img"
              aria-label="30-day total-people trend"
              style={{ display: 'block' }}
            >
              <path d={sparkline.area} fill="#8f2530" opacity="0.14" />
              <path
                d={sparkline.line}
                fill="none"
                style={{
                  // Hex inline instead of var() — SVG stroke doesn't
                  // resolve CSS variables reliably in Chromium.
                  stroke: '#8f2530',
                  strokeWidth: 2.2,
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round',
                  filter: 'drop-shadow(0 0 6px #8f2530)',
                }}
              />
              <circle cx={sparkline.last.x} cy={sparkline.last.y} r={4} fill="#8f2530" />
            </svg>
          ) : (
            <div className="body-italic" style={{ color: 'var(--ink-soft)', textAlign: 'center' }}>
              ~ thirty days of tallies will bloom here once the counters start ~
            </div>
          )}
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: 1.3,
              color: 'var(--ink-soft)',
              textTransform: 'uppercase',
              marginTop: 8,
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>30 days ago</span>
            <span>today</span>
          </div>
        </div>
      </div>
    </VellumCard>
  );
}

function AcquisitionCard({
  sources,
}: {
  readonly sources: readonly FolkAcquisitionSource[];
}): React.JSX.Element {
  const max = Math.max(1, ...sources.map((s) => s.count));
  return (
    <VellumCard style={{ padding: '22px 26px' }} rotate={0.2}>
      <Kicker>how they found you · 30d</Kicker>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 22,
          color: 'var(--ink)',
          margin: '4px 0 0',
          lineHeight: 1.1,
        }}
      >
        the road in
      </h3>
      <div
        style={{
          marginTop: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {sources.map((s) => (
          <div key={s.source}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 4,
                gap: 10,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontSize: 16,
                  color: 'var(--ink)',
                }}
              >
                {s.source}
              </span>
              <span style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink-soft)' }}>
                  {s.share}%
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontStyle: 'italic',
                    fontSize: 18,
                    color: 'var(--ink)',
                    minWidth: 46,
                    textAlign: 'right',
                    fontVariantNumeric: 'oldstyle-nums',
                  }}
                >
                  {s.count}
                </span>
              </span>
            </div>
            <BarProgress pct={(s.count / max) * 100} color={s.color} height={6} />
          </div>
        ))}
      </div>
    </VellumCard>
  );
}

function GeographyCard({
  entries,
}: {
  readonly entries: readonly FolkGeoEntry[];
}): React.JSX.Element {
  const max = Math.max(1, ...entries.map((e) => e.count));
  return (
    <VellumCard style={{ padding: '22px 26px' }} rotate={-0.2}>
      <Kicker>they live in</Kicker>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 22,
          color: 'var(--ink)',
          margin: '4px 0 0',
          lineHeight: 1.1,
        }}
      >
        across the map
      </h3>
      <div
        style={{
          marginTop: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {entries.map((e) => (
          <div key={e.place}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 4,
                gap: 10,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontSize: 15,
                  color: 'var(--ink)',
                }}
              >
                {e.place}
              </span>
              <span style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink-soft)' }}>
                  {e.share}%
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontStyle: 'italic',
                    fontSize: 17,
                    color: 'var(--ink)',
                    minWidth: 42,
                    textAlign: 'right',
                    fontVariantNumeric: 'oldstyle-nums',
                  }}
                >
                  {e.count}
                </span>
              </span>
            </div>
            <BarProgress pct={(e.count / max) * 100} color="var(--bronze)" height={5} />
          </div>
        ))}
      </div>
    </VellumCard>
  );
}

function CohortsCard({ cohorts }: { readonly cohorts: readonly FolkCohort[] }): React.JSX.Element {
  return (
    <LedgerCard style={{ padding: '22px 26px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 10,
        }}
      >
        <div>
          <Kicker>cohorts · who stayed, who slipped</Kicker>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 22,
              color: 'var(--ink)',
              margin: '4px 0 0',
              lineHeight: 1.1,
            }}
          >
            by the season they joined
          </h3>
        </div>
      </div>
      <table style={{ width: '100%', marginTop: 10, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <CohortTh>season joined</CohortTh>
            <CohortTh align="right">joined</CohortTh>
            <CohortTh align="right">30d retained</CohortTh>
            <CohortTh align="right">90d retained</CohortTh>
            <CohortTh align="right">ltv</CohortTh>
          </tr>
        </thead>
        <tbody>
          {cohorts.map((c, i) => (
            <tr
              key={c.season}
              style={{
                borderTop: '1px dashed rgba(90,63,34,0.25)',
                borderBottom: i === cohorts.length - 1 ? 'none' : '1px dashed rgba(90,63,34,0.1)',
              }}
            >
              <CohortTd>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontStyle: 'italic',
                    fontSize: 16,
                    color: 'var(--ink)',
                  }}
                >
                  {c.season}
                </span>
              </CohortTd>
              <CohortTd align="right">
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontStyle: 'italic',
                    fontSize: 17,
                    color: 'var(--ink)',
                    fontVariantNumeric: 'oldstyle-nums',
                  }}
                >
                  {c.joined}
                </span>
              </CohortTd>
              <CohortTd align="right">
                <CohortPct value={c.retainedAt30d} />
              </CohortTd>
              <CohortTd align="right">
                <CohortPct value={c.retainedAt90d} />
              </CohortTd>
              <CohortTd align="right">
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontStyle: 'italic',
                    fontSize: 17,
                    color: 'var(--oxblood)',
                    fontVariantNumeric: 'oldstyle-nums',
                  }}
                >
                  ${c.ltv}
                </span>
              </CohortTd>
            </tr>
          ))}
        </tbody>
      </table>
    </LedgerCard>
  );
}

function CohortTh({
  children,
  align = 'left',
}: {
  readonly children: React.ReactNode;
  readonly align?: 'left' | 'right';
}): React.JSX.Element {
  return (
    <th
      style={{
        textAlign: align,
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

function CohortTd({
  children,
  align = 'left',
}: {
  readonly children: React.ReactNode;
  readonly align?: 'left' | 'right';
}): React.JSX.Element {
  return <td style={{ padding: '12px 10px', textAlign: align, fontSize: 15 }}>{children}</td>;
}

function CohortPct({ value }: { readonly value: number }): React.JSX.Element {
  const color = value >= 75 ? 'var(--verdigris)' : value >= 55 ? 'var(--ink)' : 'var(--wax)';
  return (
    <span
      className="mono"
      style={{
        fontSize: 14,
        color,
        fontWeight: 500,
      }}
    >
      {value.toFixed(0)}%
    </span>
  );
}

function NewsletterCard({ data }: { readonly data: FolkNewsletter }): React.JSX.Element {
  return (
    <VellumCard style={{ padding: '22px 26px' }} rotate={0.1}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 18,
          marginBottom: 14,
        }}
      >
        <div>
          <Kicker>the letter · post</Kicker>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 22,
              color: 'var(--ink)',
              margin: '4px 0 0',
              lineHeight: 1.1,
            }}
          >
            how the missives land
          </h3>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 22,
            alignItems: 'baseline',
            flexWrap: 'wrap',
          }}
        >
          <NewsletterAvg label="open" value={data.avgOpenRate} />
          <NewsletterAvg label="click" value={data.avgClickRate} />
          <NewsletterAvg label="convert" value={data.avgConversionRate} />
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <CohortTh>subject</CohortTh>
            <CohortTh>sent</CohortTh>
            <CohortTh align="right">to</CohortTh>
            <CohortTh align="right">opens</CohortTh>
            <CohortTh align="right">clicks</CohortTh>
            <CohortTh align="right">conversions</CohortTh>
          </tr>
        </thead>
        <tbody>
          {data.recent.map((s, i) => {
            const openPct = s.sent > 0 ? (s.opens / s.sent) * 100 : 0;
            const clickPct = s.sent > 0 ? (s.clicks / s.sent) * 100 : 0;
            const convPct = s.sent > 0 ? (s.conversions / s.sent) * 100 : 0;
            return (
              <tr
                key={s.subject}
                style={{
                  borderTop: '1px dashed rgba(90,63,34,0.25)',
                  borderBottom:
                    i === data.recent.length - 1 ? 'none' : '1px dashed rgba(90,63,34,0.1)',
                }}
              >
                <CohortTd>
                  <span className="body-italic" style={{ color: 'var(--ink)', fontSize: 15 }}>
                    {s.subject}
                  </span>
                </CohortTd>
                <CohortTd>
                  <span className="mono" style={{ color: 'var(--ink-soft)', fontSize: 11 }}>
                    {s.sentOn}
                  </span>
                </CohortTd>
                <CohortTd align="right">
                  <span className="mono" style={{ color: 'var(--ink-soft)', fontSize: 12 }}>
                    {s.sent}
                  </span>
                </CohortTd>
                <CohortTd align="right">
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontStyle: 'italic',
                      fontSize: 16,
                      color: 'var(--ink)',
                      fontVariantNumeric: 'oldstyle-nums',
                    }}
                  >
                    {s.opens}{' '}
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ink-soft)' }}>
                      {openPct.toFixed(0)}%
                    </span>
                  </span>
                </CohortTd>
                <CohortTd align="right">
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontStyle: 'italic',
                      fontSize: 16,
                      color: 'var(--ink)',
                      fontVariantNumeric: 'oldstyle-nums',
                    }}
                  >
                    {s.clicks}{' '}
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ink-soft)' }}>
                      {clickPct.toFixed(1)}%
                    </span>
                  </span>
                </CohortTd>
                <CohortTd align="right">
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontStyle: 'italic',
                      fontSize: 16,
                      color: 'var(--oxblood)',
                      fontVariantNumeric: 'oldstyle-nums',
                    }}
                  >
                    {s.conversions}{' '}
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ink-soft)' }}>
                      {convPct.toFixed(1)}%
                    </span>
                  </span>
                </CohortTd>
              </tr>
            );
          })}
        </tbody>
      </table>
    </VellumCard>
  );
}

function NewsletterAvg({
  label,
  value,
}: {
  readonly label: string;
  readonly value: number;
}): React.JSX.Element {
  return (
    <div style={{ textAlign: 'right' }}>
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
        {value.toFixed(1)}%
      </div>
      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: 1.3,
          color: 'var(--ink-soft)',
          textTransform: 'uppercase',
          marginTop: 3,
        }}
      >
        avg · {label}
      </div>
    </div>
  );
}

function AtRiskCard({ risks }: { readonly risks: readonly FolkAtRiskEntry[] }): React.JSX.Element {
  const dot: Record<FolkRiskUrgency, string> = {
    high: 'var(--oxblood)',
    medium: 'var(--wax)',
    low: 'var(--lantern)',
  };
  return (
    <EnvelopeCard style={{ padding: '22px 26px' }} rotate={-0.3}>
      <Kicker onDark>at risk · the draughty seats</Kicker>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 22,
          color: 'var(--vellum)',
          margin: '4px 0 0',
          lineHeight: 1.1,
        }}
      >
        who may leave the hearth
      </h3>
      <div
        style={{
          marginTop: 14,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {risks.map((r, i) => (
          <div
            key={`${r.who}-${i}`}
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: i === risks.length - 1 ? 'none' : '1px dashed rgba(232, 213, 165, 0.2)',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 8,
                height: 8,
                flexShrink: 0,
                borderRadius: '50%',
                background: dot[r.urgency],
                boxShadow: `0 0 8px ${dot[r.urgency]}`,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontSize: 16,
                  color: 'var(--vellum)',
                  lineHeight: 1.1,
                }}
              >
                {r.who}
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: 1.3,
                  color: 'var(--vellum-shadow)',
                  textTransform: 'uppercase',
                  marginTop: 3,
                }}
              >
                {r.tier} · {r.reason}
              </div>
            </div>
            <GhostButton
              size="sm"
              onDark
              disabled
              title="Outgoing-missive tray lands in a later chapter"
            >
              reach out
            </GhostButton>
          </div>
        ))}
      </div>
    </EnvelopeCard>
  );
}

function RetentionCurveCard({
  curves,
}: {
  readonly curves: readonly FolkRetentionCurve[];
}): React.JSX.Element {
  const width = 640;
  const height = 200;
  const pad = 28;
  const monthsPerCurve = Math.max(1, ...curves.map((c) => c.data.length));
  const step = (width - pad * 2) / Math.max(1, monthsPerCurve - 1);

  const paths = curves.map((c) => {
    const d = c.data
      .map((v, j) => {
        const x = pad + j * step;
        const y = pad + ((100 - v) / 100) * (height - pad * 2);
        return `${j ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
    return { label: c.label, color: c.color, d };
  });

  return (
    <VellumCard style={{ padding: '22px 26px' }} rotate={0.3}>
      <Kicker>how long they stay · by tier</Kicker>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 22,
          color: 'var(--ink)',
          margin: '4px 0 0',
          lineHeight: 1.1,
        }}
      >
        retention curves
      </h3>

      <svg
        role="img"
        aria-label="Per-tier retention curves over 12 months"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{
          display: 'block',
          marginTop: 14,
          width: '100%',
          height: 'auto',
          overflow: 'visible',
        }}
      >
        {/* Dashed horizontal gridlines at 0/25/50/75/100 %. */}
        {[0, 25, 50, 75, 100].map((p) => {
          const y = pad + ((100 - p) / 100) * (height - pad * 2);
          return (
            <g key={p}>
              <line
                x1={pad}
                y1={y}
                x2={width - pad}
                y2={y}
                stroke="rgba(90, 63, 34, 0.22)"
                strokeDasharray="2 3"
              />
              <text
                x={pad - 6}
                y={y + 3}
                textAnchor="end"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fill: 'var(--ink-faint)',
                }}
              >
                {p}%
              </text>
            </g>
          );
        })}
        {/* Month labels along the bottom — every third month keeps the
            axis from crowding. */}
        {[0, 3, 6, 9, monthsPerCurve - 1].map((m) => (
          <text
            key={m}
            x={pad + m * step}
            y={height - 6}
            textAnchor="middle"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fill: 'var(--ink-faint)',
            }}
          >
            mo {m + 1}
          </text>
        ))}
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            fill="none"
            style={{
              // Inline style.stroke (rather than the stroke attribute)
              // so CSS variables resolve reliably in Chromium — the
              // presentation attribute version rendered transparent
              // under puppeteer even though it worked in dev.
              stroke: p.color,
              strokeWidth: 2.2,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              filter: `drop-shadow(0 0 4px ${p.color})`,
            }}
          >
            <title>{p.label}</title>
          </path>
        ))}
      </svg>

      <div
        style={{
          display: 'flex',
          gap: 18,
          marginTop: 10,
          flexWrap: 'wrap',
        }}
      >
        {curves.map((c) => (
          <div key={c.label} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span aria-hidden="true" style={{ width: 18, height: 2, background: c.color }} />
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: 14,
                color: 'var(--ink)',
              }}
            >
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </VellumCard>
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
                color: 'var(--ink-soft)',
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
                color: 'var(--ink-soft)',
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
              fontSize: 10,
              letterSpacing: 1.3,
              color: 'var(--ink-soft)',
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
            <p className="body-italic" style={{ color: 'var(--ink-soft)' }}>
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
                      <span className="mono" style={{ fontSize: 10, color: 'var(--ink-soft)' }}>
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
              <span className="mono" style={{ color: 'var(--ink-soft)' }}>
                {m.enrolmentCount}
              </span>
            </Td>
            <Td>
              <span style={{ color: 'var(--ink)' }}>
                {m.level}
                <span className="mono" style={{ color: 'var(--ink-soft)', marginLeft: 6 }}>
                  · {m.xp} xp
                </span>
              </span>
            </Td>
            <Td>
              {m.streakDays === 0 ? (
                <span style={{ color: 'var(--ink-soft)' }}>—</span>
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
