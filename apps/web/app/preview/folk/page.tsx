// `/preview/folk` — public fixture-rendered preview of the folk tab.
// Lives outside /dashboard/* so it skips the layout's auth gate. Used
// for visual review without a session. Mirrors the same FolkContent
// the real dashboard route renders, fed by FOLK_FIXTURE.

import { FolkContent } from '@/app/dashboard/folk/_components/FolkContent';
import { Desk, DropCap, Hand, Kicker, NightRoom, SimulationBadge } from '@/components/scriptorium';
import { FOLK_FIXTURE } from '@/lib/fixtures/folk';

export const dynamic = 'force-static';

export default function FolkPreviewPage(): React.JSX.Element {
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
            <DropCap letter="F" variant="blue" size="sm" />
            <div>
              <Kicker onDark>preview · fixture data</Kicker>
              <h1 style={{ fontSize: 44, margin: 0, lineHeight: 1 }}>
                your <em style={{ color: 'var(--lantern)', fontStyle: 'italic' }}>folk</em>.
              </h1>
              <Hand onDark>~ who&rsquo;s paid, who&rsquo;s stayed, who&rsquo;s drifted ~</Hand>
            </div>
          </div>
        </header>

        <FolkContent data={FOLK_FIXTURE} />
      </Desk>
    </NightRoom>
  );
}
