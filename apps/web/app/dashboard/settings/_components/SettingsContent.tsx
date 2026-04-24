// The keeper's-keys tab, in one shared module. Left rail is a
// scriptorium sidebar with 6 anchors (keeper / realm / notifications /
// billing / integrations / security). Right column scrolls through all
// six; the sidebar tracks the section in view and the link click jumps
// to it via a smooth scroll.
//
// Sections mirror the V4.5 kit's Settings.jsx, adapted to the existing
// fixture shape + the new billing / integrations / security adds.

'use client';

import { useEffect, useState } from 'react';

import {
  BrandMark,
  BronzeButton,
  Chip,
  GhostButton,
  Hand,
  Kicker,
  LedgerCard,
  ScrollCard,
  VellumCard,
  VellumField,
  WaxButton,
  WaxSeal,
} from '@/components/scriptorium';
import type {
  BillingData,
  BillingPlan,
  IntegrationStatus,
  IntegrationTile,
  NotificationPref,
  SecurityData,
  SettingsData,
} from '@/lib/fixtures/settings';

const SECTIONS: readonly { id: string; kicker: string; label: string }[] = [
  { id: 'keeper', kicker: 'the scribe', label: 'keeper' },
  { id: 'realm', kicker: 'the room', label: 'realm' },
  { id: 'notifications', kicker: 'the lantern', label: 'notifications' },
  { id: 'billing', kicker: 'the coin', label: 'billing' },
  { id: 'integrations', kicker: 'threads out', label: 'integrations' },
  { id: 'security', kicker: 'wax-sealed', label: 'security' },
];

export function SettingsContent({ data }: { readonly data: SettingsData }): React.JSX.Element {
  const [active, setActive] = useState<string>(SECTIONS[0]!.id);

  // Scrollspy — mark the section closest to the top as active.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActive(visible[0]!.target.id);
      },
      {
        // Fire when the section's header is in the top half of the viewport.
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0,
      },
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(220px, 240px) minmax(0, 1fr)',
        gap: 28,
        alignItems: 'flex-start',
      }}
    >
      <SettingsSidebar active={active} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        <KeeperSection keeper={data.keeper} />
        <RealmSection realm={data.realm} />
        <NotificationsSection prefs={data.notifications} />
        <BillingSection billing={data.billing} />
        <IntegrationsSection tiles={data.integrations} />
        <SecuritySection security={data.security} />
      </div>
    </div>
  );
}

function SettingsSidebar({ active }: { readonly active: string }): React.JSX.Element {
  return (
    <nav
      aria-label="settings sections"
      style={{
        position: 'sticky',
        top: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      {SECTIONS.map((s) => {
        const current = s.id === active;
        return (
          <a
            key={s.id}
            href={`#${s.id}`}
            style={{
              display: 'block',
              padding: '10px 14px',
              borderRadius: 3,
              textDecoration: 'none',
              background: current ? 'rgba(201, 138, 58, 0.18)' : 'transparent',
              borderLeft: current ? '3px solid var(--bronze)' : '3px solid transparent',
              transition: 'background 140ms ease, border-color 140ms ease',
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: 1.3,
                color: current ? 'var(--lantern)' : 'var(--vellum-shadow)',
                textTransform: 'uppercase',
              }}
            >
              {s.kicker}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: 17,
                color: current ? 'var(--vellum)' : 'var(--vellum-2)',
                lineHeight: 1.1,
                marginTop: 2,
              }}
            >
              {s.label}
            </div>
          </a>
        );
      })}
    </nav>
  );
}

function SectionHeader({
  id,
  kicker,
  title,
}: {
  readonly id: string;
  readonly kicker: string;
  readonly title: string;
}): React.JSX.Element {
  return (
    <header id={id} style={{ scrollMarginTop: 20, marginBottom: 10 }}>
      <Kicker onDark>{kicker}</Kicker>
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 32,
          color: 'var(--vellum)',
          margin: '2px 0 0',
          lineHeight: 1,
        }}
      >
        {title}
      </h2>
    </header>
  );
}

function KeeperSection({ keeper }: { readonly keeper: SettingsData['keeper'] }): React.JSX.Element {
  return (
    <section>
      <SectionHeader id="keeper" kicker="the scribe" title="your name, if you please" />
      <VellumCard>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
          <BrandMark letter={keeper.avatarInitial} />
          <div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: 26,
                color: 'var(--ink)',
              }}
            >
              {keeper.displayName}
            </div>
            <Hand>{`~ ${keeper.email} ~`}</Hand>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 16 }}>
          <VellumField label="display name" defaultValue={keeper.displayName} />
          <VellumField
            label="handle"
            defaultValue={keeper.displayName.toLowerCase().replace(/\s+/g, '')}
          />
          <VellumField label="email" defaultValue={keeper.email} disabled />
          <VellumField label="a line about you" defaultValue={keeper.bio} />
        </div>
        <SaveRow />
      </VellumCard>
    </section>
  );
}

function RealmSection({ realm }: { readonly realm: SettingsData['realm'] }): React.JSX.Element {
  return (
    <section>
      <SectionHeader id="realm" kicker="the room" title="your realm" />
      <ScrollCard>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
          <WaxSeal letter={realm.seal} />
          <div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: 26,
                color: 'var(--ink)',
              }}
            >
              {realm.name}
            </div>
            <Hand>{`~ founded ${realm.foundedLabel} ~`}</Hand>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 16 }}>
          <VellumField label="realm name" defaultValue={realm.name} />
          <VellumField label="seal letter" defaultValue={realm.seal} />
          <VellumField label="description" defaultValue={realm.description} />
          <VellumField label="the tavern’s motto" defaultValue={realm.tavernMotto} />
        </div>
        <SaveRow />
      </ScrollCard>
    </section>
  );
}

function NotificationsSection({
  prefs,
}: {
  readonly prefs: readonly NotificationPref[];
}): React.JSX.Element {
  return (
    <section>
      <SectionHeader id="notifications" kicker="the lantern" title="notes from the lantern" />
      <LedgerCard>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 100px 100px',
            gap: 16,
            padding: '8px 0',
            borderBottom: '1.5px solid var(--bronze-deep)',
            fontFamily: 'var(--font-caps)',
            fontSize: 10,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
            color: 'var(--ink-soft)',
            fontWeight: 500,
          }}
        >
          <span>what</span>
          <span style={{ textAlign: 'center' }}>email</span>
          <span style={{ textAlign: 'center' }}>push</span>
        </div>
        {prefs.map((p) => (
          <div
            key={p.key}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 100px 100px',
              gap: 16,
              alignItems: 'center',
              padding: '14px 0',
              borderBottom: '1px dashed rgba(90,63,34,0.2)',
            }}
          >
            <div>
              <div style={{ fontSize: 16, color: 'var(--ink)' }}>{p.label}</div>
              <Hand>~ {p.hint} ~</Hand>
            </div>
            <div style={{ display: 'grid', placeItems: 'center' }}>
              <ToggleSwitch on={p.email} />
            </div>
            <div style={{ display: 'grid', placeItems: 'center' }}>
              <ToggleSwitch on={p.push} />
            </div>
          </div>
        ))}
      </LedgerCard>
    </section>
  );
}

function BillingSection({ billing }: { readonly billing: BillingData }): React.JSX.Element {
  return (
    <section>
      <SectionHeader id="billing" kicker="the coin" title="billing & plan" />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${billing.plans.length}, minmax(0, 1fr))`,
          gap: 14,
          marginBottom: 22,
        }}
      >
        {billing.plans.map((p) => (
          <PlanCard key={p.name} plan={p} />
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 20,
          marginBottom: 22,
        }}
      >
        <VellumCard>
          <Kicker>payment method</Kicker>
          <div
            style={{
              marginTop: 8,
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 22,
              color: 'var(--ink)',
              fontVariantNumeric: 'oldstyle-nums',
            }}
          >
            {billing.paymentMethodLabel}
          </div>
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: 1.3,
              color: 'var(--ink-faint)',
              textTransform: 'uppercase',
              marginTop: 4,
            }}
          >
            expires {billing.paymentMethodExpires}
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <GhostButton size="sm" disabled>
              update card
            </GhostButton>
            <GhostButton size="sm" disabled>
              add backup
            </GhostButton>
          </div>
        </VellumCard>

        <VellumCard>
          <Kicker>billing email</Kicker>
          <div
            style={{
              marginTop: 8,
              fontFamily: 'var(--font-body)',
              fontStyle: 'italic',
              fontSize: 17,
              color: 'var(--ink)',
            }}
          >
            {billing.billingEmail}
          </div>
          <Hand>~ invoices + receipts land here ~</Hand>
          <div style={{ marginTop: 14 }}>
            <GhostButton size="sm" disabled>
              change email
            </GhostButton>
          </div>
        </VellumCard>
      </div>

      <LedgerCard>
        <Kicker>invoice history</Kicker>
        <table style={{ width: '100%', marginTop: 10, borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <SettingsTh>date</SettingsTh>
              <SettingsTh>reference</SettingsTh>
              <SettingsTh align="right">amount</SettingsTh>
              <SettingsTh>status</SettingsTh>
              <SettingsTh align="right">pdf</SettingsTh>
            </tr>
          </thead>
          <tbody>
            {billing.invoices.map((inv) => (
              <tr key={inv.id} style={{ borderTop: '1px dashed rgba(90,63,34,0.25)' }}>
                <SettingsTd>
                  <span className="mono" style={{ color: 'var(--ink)', fontSize: 12 }}>
                    {inv.date}
                  </span>
                </SettingsTd>
                <SettingsTd>
                  <span className="mono" style={{ color: 'var(--ink-faint)', fontSize: 11 }}>
                    {inv.reference}
                  </span>
                </SettingsTd>
                <SettingsTd align="right">
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontStyle: 'italic',
                      color: 'var(--oxblood)',
                      fontSize: 16,
                      fontVariantNumeric: 'oldstyle-nums',
                    }}
                  >
                    ${inv.amount}
                  </span>
                </SettingsTd>
                <SettingsTd>
                  {inv.status === 'paid' ? (
                    <Chip variant="verdigris">paid</Chip>
                  ) : inv.status === 'failed' ? (
                    <Chip variant="wax">failed</Chip>
                  ) : (
                    <Chip>pending</Chip>
                  )}
                </SettingsTd>
                <SettingsTd align="right">
                  <GhostButton size="sm" disabled>
                    download
                  </GhostButton>
                </SettingsTd>
              </tr>
            ))}
          </tbody>
        </table>
      </LedgerCard>
    </section>
  );
}

function PlanCard({ plan }: { readonly plan: BillingPlan }): React.JSX.Element {
  return (
    <VellumCard
      style={{
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        borderLeft: plan.current ? '3px solid var(--bronze)' : '3px solid transparent',
        boxShadow: plan.current
          ? '0 18px 34px rgba(0, 0, 0, 0.55), 0 0 0 2px rgba(184, 140, 82, 0.35)'
          : undefined,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 10,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 22,
            color: 'var(--ink)',
            lineHeight: 1.1,
          }}
        >
          {plan.name}
        </div>
        {plan.current && <Chip variant="verdigris">current</Chip>}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 32,
          color: plan.priceLabel === 'free' ? 'var(--ink-soft)' : 'var(--oxblood)',
          lineHeight: 1,
          fontVariantNumeric: 'oldstyle-nums',
        }}
      >
        {plan.priceLabel}
      </div>
      <Hand>~ {plan.tagline} ~</Hand>
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: '6px 0 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {plan.features.map((f) => (
          <li
            key={f}
            style={{
              display: 'flex',
              gap: 8,
              fontFamily: 'var(--font-body)',
              fontStyle: 'italic',
              fontSize: 13,
              color: 'var(--ink)',
              lineHeight: 1.35,
            }}
          >
            <span aria-hidden="true" style={{ color: 'var(--verdigris-2)' }}>
              ✓
            </span>
            {f}
          </li>
        ))}
      </ul>
      <div
        style={{
          marginTop: 'auto',
          paddingTop: 12,
          borderTop: '1px dashed rgba(90,63,34,0.25)',
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        {plan.current ? (
          <GhostButton size="sm" disabled>
            {plan.cta}
          </GhostButton>
        ) : (
          <BronzeButton size="sm" disabled>
            {plan.cta}
          </BronzeButton>
        )}
      </div>
    </VellumCard>
  );
}

function IntegrationsSection({
  tiles,
}: {
  readonly tiles: readonly IntegrationTile[];
}): React.JSX.Element {
  return (
    <section>
      <SectionHeader id="integrations" kicker="threads out" title="integrations" />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 14,
        }}
      >
        {tiles.map((t) => (
          <IntegrationCard key={t.key} tile={t} />
        ))}
      </div>
    </section>
  );
}

function IntegrationCard({ tile }: { readonly tile: IntegrationTile }): React.JSX.Element {
  return (
    <VellumCard style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div
          aria-hidden="true"
          style={{
            width: 44,
            height: 44,
            borderRadius: 6,
            background: tile.tint,
            color: 'var(--vellum)',
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 22,
            flexShrink: 0,
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.25)',
          }}
        >
          {tile.emblem}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: 19,
                color: 'var(--ink)',
                lineHeight: 1.1,
              }}
            >
              {tile.name}
            </div>
            <IntegrationStatusChip status={tile.status} />
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
            {tile.category}
          </div>
        </div>
      </div>
      <p
        className="body-italic"
        style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.4 }}
      >
        {tile.description}
      </p>
      <div
        style={{
          marginTop: 'auto',
          paddingTop: 10,
          borderTop: '1px dashed rgba(90,63,34,0.2)',
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        {tile.status === 'connected' ? (
          <GhostButton size="sm" disabled>
            manage
          </GhostButton>
        ) : tile.status === 'available' ? (
          <BronzeButton size="sm" disabled>
            connect
          </BronzeButton>
        ) : (
          <GhostButton size="sm" disabled>
            on the way
          </GhostButton>
        )}
      </div>
    </VellumCard>
  );
}

function IntegrationStatusChip({
  status,
}: {
  readonly status: IntegrationStatus;
}): React.JSX.Element {
  if (status === 'connected') return <Chip variant="verdigris">connected</Chip>;
  if (status === 'available') return <Chip>available</Chip>;
  return <Chip variant="wax">soon</Chip>;
}

function SecuritySection({ security }: { readonly security: SecurityData }): React.JSX.Element {
  return (
    <section>
      <SectionHeader id="security" kicker="wax-sealed" title="security" />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20,
          marginBottom: 20,
        }}
      >
        <VellumCard>
          <Kicker>two-factor</Kicker>
          <div
            style={{
              marginTop: 8,
              display: 'flex',
              alignItems: 'baseline',
              gap: 10,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: 24,
                color: 'var(--ink)',
              }}
            >
              {security.twoFactorEnabled ? 'on' : 'off'}
            </div>
            {security.twoFactorEnabled ? (
              <Chip variant="verdigris">via app</Chip>
            ) : (
              <Chip variant="wax">urge</Chip>
            )}
          </div>
          <Hand>~ a second lock on the door ~</Hand>
          <div style={{ marginTop: 14 }}>
            <GhostButton size="sm" disabled>
              {security.twoFactorEnabled ? 'manage 2fa' : 'enable 2fa'}
            </GhostButton>
          </div>
        </VellumCard>

        <VellumCard>
          <Kicker>last login</Kicker>
          <div
            style={{
              marginTop: 8,
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 22,
              color: 'var(--ink)',
              lineHeight: 1.1,
            }}
          >
            {security.lastLogin.when}
          </div>
          <Hand>~ from {security.lastLogin.from} ~</Hand>
        </VellumCard>
      </div>

      <LedgerCard style={{ marginBottom: 20 }}>
        <Kicker>active sessions</Kicker>
        <ul style={{ listStyle: 'none', padding: 0, margin: 10 }}>
          {security.sessions.map((s, i) => (
            <li
              key={s.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '12px 0',
                borderBottom:
                  i === security.sessions.length - 1 ? 'none' : '1px dashed rgba(90,63,34,0.2)',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: s.current ? 'var(--verdigris)' : 'var(--ink-faint)',
                  boxShadow: s.current ? '0 0 8px var(--verdigris)' : 'none',
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontStyle: 'italic',
                    fontSize: 16,
                    color: 'var(--ink)',
                  }}
                >
                  {s.device}{' '}
                  {s.current && <span style={{ color: 'var(--verdigris)' }}>· this session</span>}
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: 1.3,
                    color: 'var(--ink-faint)',
                    textTransform: 'uppercase',
                    marginTop: 2,
                  }}
                >
                  {s.where} · last seen {s.lastSeen}
                </div>
              </div>
              <GhostButton size="sm" disabled>
                {s.current ? 'current' : 'sign out'}
              </GhostButton>
            </li>
          ))}
        </ul>
      </LedgerCard>

      <VellumCard style={{ borderLeft: '3px solid var(--wax)' }}>
        <Kicker>danger · part ways</Kicker>
        <h3
          style={{
            marginTop: 6,
            color: 'var(--ink)',
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 22,
          }}
        >
          close the realm
        </h3>
        <p className="body-italic" style={{ color: 'var(--ink-soft)', marginTop: 8 }}>
          Erases your realm, your ledger, and the folk on the roll. This is sealed in wax; a keeper
          signs it in person. The action isn&rsquo;t wired yet — it lands with the contracts
          chapter.
        </p>
        <div style={{ marginTop: 14 }}>
          <WaxButton disabled>seal the door &amp; leave</WaxButton>
        </div>
      </VellumCard>
    </section>
  );
}

function SaveRow(): React.JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        marginTop: 18,
        paddingTop: 14,
        borderTop: '1px dashed rgba(90,63,34,0.25)',
      }}
    >
      <BronzeButton disabled>seal it</BronzeButton>
      <GhostButton disabled>set aside</GhostButton>
      <span className="hand" style={{ marginLeft: 'auto', alignSelf: 'center' }}>
        ~ saving lands in the next chapter ~
      </span>
    </div>
  );
}

function ToggleSwitch({ on }: { readonly on: boolean }): React.JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? 'on' : 'off'}
      disabled
      style={{
        width: 46,
        height: 24,
        borderRadius: 12,
        border: '1px solid var(--bronze)',
        background: on
          ? 'linear-gradient(135deg, var(--lantern-core), var(--lantern))'
          : 'rgba(20, 10, 0, 0.4)',
        position: 'relative',
        cursor: 'not-allowed',
        opacity: 0.85,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: on ? 22 : 2,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 32% 30%, var(--bronze-bright), var(--bronze) 55%, var(--bronze-deep))',
          boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
          transition: 'left .2s',
        }}
      />
    </button>
  );
}

function SettingsTh({
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

function SettingsTd({
  children,
  align = 'left',
}: {
  readonly children: React.ReactNode;
  readonly align?: 'left' | 'right';
}): React.JSX.Element {
  return <td style={{ padding: '10px', textAlign: align, fontSize: 14 }}>{children}</td>;
}
