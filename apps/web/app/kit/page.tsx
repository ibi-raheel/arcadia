// `/kit` — live design-system browser. Shows every primitive + token
// that the Phase-8 sub-phases compose from, so a builder or reviewer
// can see all of them on one scroll. Mirrors the 21
// design/kit/preview/*.html files but rendered through the production
// TSX components under `apps/web/components/scriptorium/`.
//
// Public route (2026-04-24). The kit is a design reference — same
// status as /login or /. It contains no member-scoped data, so the
// auth gate was removed from both middleware.ts and this page.

import {
  Avatar,
  BarProgress,
  BrandMark,
  BronzeButton,
  ChapterDivider,
  Chip,
  Desk,
  Donut,
  DropCap,
  EnvelopeCard,
  GhostButton,
  Hand,
  JournalCard,
  Kicker,
  LedgerCard,
  MapCard,
  Medallion,
  NightRoom,
  ScrollCard,
  SimulationBadge,
  SimulationToggle,
  StackedBar,
  Stat,
  Stud,
  TagNav,
  VellumCard,
  VellumField,
  WaxButton,
  WaxSeal,
} from '@/components/scriptorium';

export const dynamic = 'force-dynamic';

type ColorSwatch = { readonly name: string; readonly token: string; readonly note?: string };

const PRIMARY_COLORS: readonly ColorSwatch[] = [
  { name: 'night', token: 'var(--night)', note: 'page ground' },
  { name: 'night-deep', token: 'var(--night-deep)' },
  { name: 'desk', token: 'var(--desk)' },
  { name: 'desk-warm', token: 'var(--desk-warm)' },
  { name: 'bronze', token: 'var(--bronze)' },
  { name: 'bronze-hi', token: 'var(--bronze-hi)' },
  { name: 'lantern', token: 'var(--lantern)', note: 'accent' },
  { name: 'wax', token: 'var(--wax)' },
  { name: 'gilt', token: 'var(--gilt)' },
  { name: 'ink-blue', token: 'var(--ink-blue)' },
  { name: 'ink-red', token: 'var(--ink-red)' },
  { name: 'verdigris', token: 'var(--verdigris)' },
];

const PAPER_COLORS: readonly ColorSwatch[] = [
  { name: 'vellum', token: 'var(--vellum)' },
  { name: 'vellum-2', token: 'var(--vellum-2)' },
  { name: 'parchment', token: 'var(--parchment)' },
  { name: 'scroll', token: 'var(--scroll)' },
  { name: 'ledger', token: 'var(--ledger)' },
  { name: 'leather', token: 'var(--leather)' },
  { name: 'leather-dark', token: 'var(--leather-dark)' },
];

const SEMANTIC_COLORS: readonly ColorSwatch[] = [
  { name: '--bg', token: 'var(--bg)', note: 'page' },
  { name: '--surface', token: 'var(--surface)', note: 'vellum default' },
  { name: '--fg1', token: 'var(--fg1)', note: 'body on vellum' },
  { name: '--fg-on-dark', token: 'var(--fg-on-dark)', note: 'body on night' },
  { name: '--glow', token: 'var(--glow)', note: 'halo' },
];

function Swatch({ swatch }: { readonly swatch: ColorSwatch }) {
  return (
    <div style={{ textAlign: 'left' }}>
      <div
        style={{
          height: 72,
          background: swatch.token,
          borderRadius: 3,
          boxShadow: 'inset 0 -6px 14px rgba(0,0,0,0.22)',
        }}
      />
      <div style={{ marginTop: 6, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
        {swatch.name}
      </div>
      {swatch.note && (
        <div className="hand" style={{ fontSize: 14, marginTop: 2 }}>
          {swatch.note}
        </div>
      )}
    </div>
  );
}

function SwatchGrid({ swatches }: { readonly swatches: readonly ColorSwatch[] }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 16,
      }}
    >
      {swatches.map((s) => (
        <Swatch key={s.name} swatch={s} />
      ))}
    </div>
  );
}

const ORNAMENT_GLYPHS = ['✦', '✧', '☉', '❦', '◈', '❂', '†', '✝', '✥'];

export default function KitPage(): React.JSX.Element {
  const navItems = [
    { key: 'hub', label: 'hub', href: '/' },
    { key: 'doorway', label: 'doorway', href: '/login' },
    { key: 'host', label: 'host', href: '/dashboard' },
    { key: 'the kit', label: 'the kit', href: '/kit' },
  ];

  return (
    <NightRoom>
      <SimulationBadge />
      <Desk>
        <header
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 30,
            gap: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <BrandMark letter="A" />
            <div>
              <h2 style={{ fontSize: 36, lineHeight: 1, margin: 0 }}>Arcadia</h2>
              <div className="hand on-dark" style={{ fontSize: 15 }}>
                ~ the kit · midnight scriptorium ~
              </div>
            </div>
          </div>
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}
          >
            <TagNav items={navItems} active="the kit" />
            <SimulationToggle />
          </div>
        </header>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 22, marginBottom: 28 }}>
          <DropCap letter="T" variant="blue" />
          <div style={{ paddingTop: 4 }}>
            <Kicker onDark>a live spec · every token, every primitive</Kicker>
            <h1 style={{ fontSize: 52, margin: 0, lineHeight: 1 }}>
              the kit,{' '}
              <em style={{ color: 'var(--lantern)', fontStyle: 'italic' }}>by lamplight</em>.
            </h1>
            <Hand onDark>~ scroll through · click nothing · trust the tokens ~</Hand>
          </div>
        </div>

        <ChapterDivider chapter="I. colours" />
        <VellumCard style={{ marginBottom: 22 }}>
          <Kicker>primary palette</Kicker>
          <div style={{ marginTop: 14 }}>
            <SwatchGrid swatches={PRIMARY_COLORS} />
          </div>
        </VellumCard>
        <LedgerCard style={{ marginBottom: 22 }}>
          <Kicker>paper surfaces</Kicker>
          <div style={{ marginTop: 14 }}>
            <SwatchGrid swatches={PAPER_COLORS} />
          </div>
        </LedgerCard>
        <VellumCard style={{ marginBottom: 22 }}>
          <Kicker>semantic aliases</Kicker>
          <div style={{ marginTop: 14 }}>
            <SwatchGrid swatches={SEMANTIC_COLORS} />
          </div>
        </VellumCard>

        <ChapterDivider chapter="II. lettering" />
        <VellumCard style={{ marginBottom: 22 }}>
          <Kicker>display · italic · im fell english</Kicker>
          <h1 style={{ color: 'var(--ink)' }}>a room by lamplight.</h1>
          <h2 style={{ color: 'var(--ink)' }}>the tavern is open.</h2>
          <h3>a keeper&rsquo;s record.</h3>
          <h4>a scribe&rsquo;s note.</h4>
        </VellumCard>
        <VellumCard style={{ marginBottom: 22 }}>
          <Kicker>small caps · im fell english sc</Kicker>
          <p className="caps" style={{ fontSize: 22, marginTop: 10 }}>
            monastic · ceremonial · quiet
          </p>
        </VellumCard>
        <VellumCard style={{ marginBottom: 22 }}>
          <Kicker>body · eb garamond</Kicker>
          <p style={{ marginTop: 10 }}>
            A little world, kept by hand. Everything here is built for the long hours — when the
            lantern is lit and the room is quiet and your folk are finding their way back in.
          </p>
          <p className="body-italic" style={{ marginTop: 10 }}>
            The italic cut — for emphasis, pull-quotes, or the voice of the scribe.
          </p>
        </VellumCard>
        <VellumCard style={{ marginBottom: 22 }}>
          <Kicker>hand · caveat &middot; mono · jetbrains mono</Kicker>
          <p className="hand" style={{ fontSize: 24, marginTop: 10 }}>
            ~ bring tea ~
          </p>
          <p className="mono" style={{ marginTop: 12 }}>
            FOL · XVII · 09·41 PM · LANTERN LIT
          </p>
        </VellumCard>

        <ChapterDivider chapter="III. surfaces" />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 22,
            marginBottom: 24,
          }}
        >
          <VellumCard rotate={-0.6}>
            <Kicker>a flat leaf of vellum</Kicker>
            <h4>bound at the spine</h4>
            <p className="body-italic" style={{ fontSize: 15 }}>
              Held by a leather cord at the top. Lies flat. Good for lists, forms, contents.
            </p>
          </VellumCard>
          <ScrollCard rotate={1}>
            <Kicker>a rolled scroll</Kicker>
            <h4>the royal missive</h4>
            <p className="body-italic" style={{ fontSize: 15 }}>
              Both ends curl inward, bound by gravity and old habit.
            </p>
          </ScrollCard>
          <LedgerCard rotate={-0.4}>
            <Kicker>a ledger page</Kicker>
            <h4>a keeper&rsquo;s record</h4>
            <p className="body-italic" style={{ fontSize: 15 }}>
              Ruled horizontal lines, double-stitched spine.
            </p>
          </LedgerCard>
          <EnvelopeCard rotate={0.8}>
            <Kicker>a sealed letter</Kicker>
            <h4 style={{ color: 'var(--vellum)' }}>sealed with wax</h4>
            <p style={{ color: 'var(--vellum)', fontStyle: 'italic', fontSize: 15 }}>
              Dark leather-brown. For stats, the heavy numbers.
            </p>
          </EnvelopeCard>
          <JournalCard rotate={-0.3}>
            <Kicker>a graph-paper page</Kicker>
            <h4>the scribe&rsquo;s journal</h4>
            <p className="body-italic" style={{ fontSize: 15 }}>
              Thin grid bleeding through — for charts, tallies, ink lines.
            </p>
          </JournalCard>
          <MapCard rotate={0.4}>
            <Kicker>an aged map</Kicker>
            <h4>terra cognita</h4>
            <p className="body-italic" style={{ fontSize: 15 }}>
              For hand-drawn world maps and trails.
            </p>
          </MapCard>
        </div>

        <ChapterDivider chapter="IV. hardware" />
        <VellumCard style={{ marginBottom: 22 }}>
          <Kicker>seals · studs · brand · avatars</Kicker>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: 18,
              alignItems: 'center',
              justifyItems: 'center',
              marginTop: 16,
            }}
          >
            <WaxSeal letter="A" />
            <Stud />
            <BrandMark letter="R" />
            <Avatar letter="M" />
          </div>
        </VellumCard>

        <ChapterDivider chapter="V. illumination" />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 22,
            marginBottom: 24,
          }}
        >
          <VellumCard>
            <Kicker>drop cap · blue ground</Kicker>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginTop: 10 }}>
              <DropCap letter="W" variant="blue" size="sm" />
              <p className="body-italic" style={{ fontSize: 14 }}>
                elcome to the scriptorium. The first letter is gilded, pressed into lapis.
              </p>
            </div>
          </VellumCard>
          <VellumCard>
            <Kicker>drop cap · wax ground</Kicker>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginTop: 10 }}>
              <DropCap letter="O" variant="wax" size="sm" />
              <p className="body-italic" style={{ fontSize: 14 }}>
                n a wax-red ground, the gilt letter glows deeper.
              </p>
            </div>
          </VellumCard>
          <VellumCard>
            <Kicker>drop cap · verdigris</Kicker>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginTop: 10 }}>
              <DropCap letter="T" variant="verdigris" size="sm" />
              <p className="body-italic" style={{ fontSize: 14 }}>
                hose aged by years of salt air sit on verdigris.
              </p>
            </div>
          </VellumCard>
        </div>

        <ChapterDivider chapter="VI. actions" />
        <VellumCard style={{ marginBottom: 22 }}>
          <Kicker>buttons</Kicker>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 14 }}>
            <BronzeButton>step inside →</BronzeButton>
            <WaxButton>seal it</WaxButton>
            <GhostButton>set aside</GhostButton>
            <BronzeButton size="sm">small</BronzeButton>
          </div>
        </VellumCard>

        <VellumCard style={{ marginBottom: 22 }}>
          <Kicker>fields</Kicker>
          <div style={{ display: 'grid', gap: 20, marginTop: 14 }}>
            <VellumField
              label="your name, if you please"
              placeholder="Theo Marrow"
              defaultValue="Theo Marrow"
            />
            <VellumField
              type="password"
              label="the word that lets you in"
              placeholder="·········"
              defaultValue="·········"
            />
          </div>
        </VellumCard>

        <VellumCard style={{ marginBottom: 22 }}>
          <Kicker>chips</Kicker>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <Chip>scribe</Chip>
            <Chip variant="wax">keeper</Chip>
            <Chip variant="verdigris">wanderer</Chip>
            <Chip variant="gilt">guild</Chip>
          </div>
        </VellumCard>

        <ChapterDivider chapter="VII. medallions" />
        <VellumCard style={{ marginBottom: 22 }}>
          <Kicker>earned · aged · locked</Kicker>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 20,
              justifyItems: 'center',
              marginTop: 14,
            }}
          >
            <Medallion emblem="✦" label="first hello" state="earned" />
            <Medallion emblem="☉" label="seven suns" state="earned" />
            <Medallion emblem="❦" label="kind word" state="aged" />
            <Medallion emblem="◈" label="host a circle" state="locked" />
            <Medallion emblem="❂" label="fortnight long" state="locked" />
          </div>
        </VellumCard>

        <ChapterDivider chapter="VIII. ornaments" />
        <VellumCard style={{ marginBottom: 22 }}>
          <Kicker>geometric glyphs · in gilt</Kicker>
          <div
            style={{
              display: 'flex',
              gap: 20,
              flexWrap: 'wrap',
              fontSize: 32,
              color: 'var(--gilt)',
              marginTop: 14,
            }}
          >
            {ORNAMENT_GLYPHS.map((g) => (
              <span key={g}>{g}</span>
            ))}
          </div>
        </VellumCard>

        <ChapterDivider chapter="IX. charts" />
        <VellumCard style={{ marginBottom: 22 }}>
          <Kicker>stat · big ledger number</Kicker>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 28,
              marginTop: 14,
            }}
          >
            <Stat label="revenue · 30d" value="$12,430" delta={6.4} />
            <Stat label="active subscribers" value={184} delta={3.2} />
            <Stat label="return on spend" value="4.2×" delta={-1.3} />
          </div>
        </VellumCard>

        <VellumCard style={{ marginBottom: 22 }}>
          <Kicker>bar progress · fill + glow</Kicker>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              marginTop: 14,
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  color: 'var(--ink)',
                }}
              >
                <span>the coin of venice</span>
                <span className="mono" style={{ color: 'var(--ink-soft)' }}>
                  68%
                </span>
              </div>
              <BarProgress pct={68} color="var(--lantern)" />
            </div>
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  color: 'var(--ink)',
                }}
              >
                <span>sealing wax · by lantern</span>
                <span className="mono" style={{ color: 'var(--ink-soft)' }}>
                  42%
                </span>
              </div>
              <BarProgress pct={42} color="var(--oxblood)" height={4} />
            </div>
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  color: 'var(--ink)',
                }}
              >
                <span>the lantern's trim</span>
                <span className="mono" style={{ color: 'var(--ink-soft)' }}>
                  92%
                </span>
              </div>
              <BarProgress pct={92} color="var(--verdigris)" height={8} />
            </div>
          </div>
        </VellumCard>

        <VellumCard style={{ marginBottom: 22 }}>
          <Kicker>donut · proportional ring</Kicker>
          <div
            style={{
              display: 'flex',
              gap: 24,
              alignItems: 'center',
              marginTop: 14,
            }}
          >
            <Donut
              size={150}
              thickness={22}
              segments={[
                { share: 42, color: 'var(--lantern)', label: 'courses' },
                { share: 28, color: 'var(--bronze)', label: 'memberships' },
                { share: 18, color: 'var(--oxblood)', label: 'workshops' },
                { share: 12, color: 'var(--verdigris)', label: 'tips' },
              ]}
              label={
                <div style={{ textAlign: 'center' }}>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--ink-soft)' }}>
                    30D
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontStyle: 'italic',
                      fontSize: 22,
                      color: 'var(--ink)',
                      fontVariantNumeric: 'oldstyle-nums',
                    }}
                  >
                    $12,430
                  </div>
                </div>
              }
            />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'courses', color: 'var(--lantern)', share: 42, amount: 5220 },
                { label: 'memberships', color: 'var(--bronze)', share: 28, amount: 3480 },
                { label: 'workshops', color: 'var(--oxblood)', share: 18, amount: 2237 },
                { label: 'tips', color: 'var(--verdigris)', share: 12, amount: 1493 },
              ].map((s) => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      background: s.color,
                      borderRadius: 2,
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontFamily: 'var(--font-display)',
                      fontStyle: 'italic',
                      fontSize: 16,
                      color: 'var(--ink)',
                    }}
                  >
                    {s.label}
                  </span>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--ink-soft)' }}>
                    {s.share}%
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontStyle: 'italic',
                      fontSize: 16,
                      color: 'var(--ink)',
                      minWidth: 60,
                      textAlign: 'right',
                      fontVariantNumeric: 'oldstyle-nums',
                    }}
                  >
                    ${s.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </VellumCard>

        <VellumCard style={{ marginBottom: 22 }}>
          <Kicker>stacked bar · composition</Kicker>
          <div style={{ marginTop: 14 }}>
            <StackedBar
              height={18}
              segments={[
                { value: 48, color: 'var(--bronze)', label: 'guildling' },
                { value: 96, color: 'var(--lantern)', label: 'lantern-bearer' },
                { value: 24, color: 'var(--wax)', label: 'hearth-keeper' },
                { value: 6, color: 'var(--oxblood)', label: 'patron' },
              ]}
            />
            <div className="hand" style={{ marginTop: 10, color: 'var(--ink-soft)' }}>
              ~ hover any slice to see its tally ~
            </div>
          </div>
        </VellumCard>

        <div
          style={{
            marginTop: 40,
            paddingTop: 24,
            borderTop: '1px dashed var(--bronze)',
            textAlign: 'center',
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 20,
            color: 'var(--gilt)',
          }}
        >
          an opinion kept by the scribe: a room is only as warm as its lantern.
          <div
            style={{
              display: 'block',
              fontFamily: 'var(--font-hand)',
              fontSize: 17,
              color: 'var(--ink-soft)',
              marginTop: 6,
            }}
          >
            — inscribed in the margin, folio xxvii
          </div>
        </div>
      </Desk>
    </NightRoom>
  );
}
