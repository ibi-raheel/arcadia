// `/` — the realm gate. Unauthed visitors see a polished front-of-the-
// scriptorium landing. Authed visitors get the three doorways (world /
// market / dashboard) as hand-placed cards on the desk.

import Link from 'next/link';

import {
  BronzeButton,
  Desk,
  DropCap,
  Hand,
  Kicker,
  LedgerCard,
  NightRoom,
  ScrollCard,
  VellumCard,
  WaxButton,
  WaxSeal,
} from '@/components/scriptorium';
import { UpcomingEventPill } from '@/components/events/UpcomingEventPill';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function Home(): Promise<React.JSX.Element> {
  const supabase = getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <Gate />;

  const { data: membership } = await supabase
    .from('memberships')
    .select('role, display_name')
    .eq('member_id', user.id)
    .maybeSingle();

  const role = membership?.role ?? 'member';
  const displayName = (membership?.display_name as string | null) ?? user.email ?? 'friend';
  const isCreator = role === 'creator' || role === 'admin';
  const firstLetter = displayName.charAt(0).toUpperCase() || 'A';

  return (
    <NightRoom>
      <Desk>
        <div
          style={{
            maxWidth: 1080,
            margin: '0 auto',
            padding: '60px 28px 40px',
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
              maxWidth: 720,
            }}
          >
            <DropCap letter={firstLetter} variant="blue" />
            <div style={{ flex: 1 }}>
              <Kicker onDark>~ the realm stirs for you ~</Kicker>
              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontSize: 58,
                  lineHeight: 1,
                  color: 'var(--vellum)',
                  margin: '4px 0 0',
                  letterSpacing: '-0.5px',
                }}
              >
                Arcadia
              </h1>
              <p
                className="body-italic"
                style={{
                  marginTop: 8,
                  color: 'var(--vellum-2)',
                  fontSize: 17,
                }}
              >
                Welcome back, {displayName}.
              </p>
            </div>
          </header>

          <UpcomingEventPill onDark />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 22,
              width: '100%',
              marginTop: 4,
            }}
          >
            <DoorwayCard
              href="/world"
              kicker="to play"
              title="Enter the world"
              body="Walk the square, chat in the tavern, cross paths with other folk."
              variant="scroll"
              seal="W"
              sealVariant="verdigris"
              rotate={-0.6}
            />
            <DoorwayCard
              href="/market"
              kicker="to browse"
              title="Visit the market"
              body="Wander the stalls; find the work of other creators in your realm."
              variant="vellum"
              seal="M"
              sealVariant="wax"
              rotate={0.4}
            />
            {isCreator ? (
              <DoorwayCard
                href="/dashboard"
                kicker="to create"
                title="Open the dashboard"
                body="Ink new chapters, watch your folk, tend the coin jar."
                variant="ledger"
                seal="C"
                sealVariant="gilt"
                rotate={-0.3}
              />
            ) : (
              <VellumCard
                rotate={-0.3}
                style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: 0.7 }}
              >
                <Kicker>creator access</Kicker>
                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontStyle: 'italic',
                    fontSize: 24,
                    margin: '4px 0 0',
                    color: 'var(--ink-soft)',
                  }}
                >
                  Not yet yours
                </h3>
                <Hand>~ ask a keeper to promote your account ~</Hand>
              </VellumCard>
            )}
          </div>

          <form
            action="/api/auth/signout"
            method="post"
            style={{ marginTop: 12, textAlign: 'center' }}
          >
            <button
              type="submit"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-caps)',
                fontSize: 11,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: 'var(--vellum-shadow)',
                padding: '6px 12px',
              }}
            >
              · sign out ·
            </button>
          </form>
        </div>
      </Desk>
    </NightRoom>
  );
}

type DoorwayProps = {
  readonly href: string;
  readonly kicker: string;
  readonly title: string;
  readonly body: string;
  readonly variant: 'scroll' | 'vellum' | 'ledger';
  readonly seal: string;
  readonly sealVariant: 'verdigris' | 'wax' | 'gilt';
  readonly rotate?: number;
};

function DoorwayCard({
  href,
  kicker,
  title,
  body,
  variant,
  seal,
  sealVariant,
  rotate,
}: DoorwayProps): React.JSX.Element {
  const Shell = variant === 'scroll' ? ScrollCard : variant === 'ledger' ? LedgerCard : VellumCard;
  const sealBg =
    sealVariant === 'verdigris'
      ? 'radial-gradient(circle at 30% 25%, #88a080 0%, var(--verdigris) 55%, var(--verdigris-2))'
      : sealVariant === 'gilt'
        ? 'radial-gradient(circle at 30% 25%, var(--gilt) 0%, var(--gilt-deep) 55%, #7a5a1a)'
        : undefined;
  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
      <Shell
        rotate={rotate}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          minHeight: 180,
          position: 'relative',
          cursor: 'pointer',
          transition: 'transform 200ms ease',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
          }}
        >
          {sealBg ? (
            <div
              className="wax-seal"
              style={{
                background: sealBg,
                color: sealVariant === 'gilt' ? 'var(--night)' : 'var(--vellum)',
              }}
            >
              {seal}
            </div>
          ) : (
            <WaxSeal letter={seal} />
          )}
        </div>
        <Kicker>{kicker}</Kicker>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 26,
            margin: '4px 0 0',
            color: 'var(--ink)',
            lineHeight: 1.1,
            paddingRight: 44,
          }}
        >
          {title}
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
          {body}
        </p>
        <span
          style={{
            marginTop: 'auto',
            paddingTop: 10,
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 14,
            color: 'var(--bronze-deep)',
          }}
        >
          step through →
        </span>
      </Shell>
    </Link>
  );
}

function Gate(): React.JSX.Element {
  return (
    <NightRoom>
      <Desk>
        <div
          style={{
            maxWidth: 720,
            margin: '0 auto',
            padding: '80px 28px 60px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
            <DropCap letter="A" variant="blue" />
          </div>
          <div>
            <Kicker onDark>~ the realm of makers ~</Kicker>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: 72,
                lineHeight: 1,
                color: 'var(--vellum)',
                margin: '8px 0 0',
                letterSpacing: '-0.5px',
              }}
            >
              Arcadia
            </h1>
          </div>
          <p
            className="body-italic"
            style={{
              maxWidth: 520,
              margin: '0 auto',
              color: 'var(--vellum-2)',
              fontSize: 18,
              lineHeight: 1.55,
            }}
          >
            A 2.5D isometric world for creators and their communities — a square to wander, a tavern
            to gather in, an academy to learn by lantern.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <BronzeButton>open the door →</BronzeButton>
            </Link>
            <Link href="/signup" style={{ textDecoration: 'none' }}>
              <WaxButton>stamp a new name</WaxButton>
            </Link>
          </div>
          <Hand onDark>~ enrolment is free while we&rsquo;re in beta ~</Hand>
        </div>
      </Desk>
    </NightRoom>
  );
}
