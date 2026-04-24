// `/preview/payouts` — public fixture-rendered preview of the coin jar.
// Lives outside /dashboard/* so the layout auth gate doesn't fire.

import { PayoutsContent } from '@/app/dashboard/payouts/_components/PayoutsContent';
import { Desk, DropCap, Hand, Kicker, NightRoom, SimulationBadge } from '@/components/scriptorium';
import { PAYOUTS_FIXTURE } from '@/lib/fixtures/payouts';

export const dynamic = 'force-static';

export default function PayoutsPreviewPage(): React.JSX.Element {
  return (
    <NightRoom>
      <SimulationBadge />
      <Desk>
        <header
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: 24,
            gap: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <DropCap letter="J" variant="blue" size="sm" />
            <div>
              <Kicker onDark>preview · fixture data</Kicker>
              <h1 style={{ fontSize: 44, margin: 0, lineHeight: 1 }}>
                the <em style={{ color: 'var(--lantern)', fontStyle: 'italic' }}>coin jar</em>.
              </h1>
              <Hand onDark>~ what&rsquo;s earned, what&rsquo;s in transit, where it lands ~</Hand>
            </div>
          </div>
        </header>

        <PayoutsContent data={PAYOUTS_FIXTURE} />
      </Desk>
    </NightRoom>
  );
}
