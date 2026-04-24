// `/preview/settings` — public fixture preview of the keeper's keys.

import { SettingsContent } from '@/app/dashboard/settings/_components/SettingsContent';
import { Desk, DropCap, Hand, Kicker, NightRoom, SimulationBadge } from '@/components/scriptorium';
import { SETTINGS_FIXTURE } from '@/lib/fixtures/settings';

export const dynamic = 'force-static';

export default function SettingsPreviewPage(): React.JSX.Element {
  return (
    <NightRoom>
      <SimulationBadge />
      <Desk>
        <header style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <DropCap letter="S" variant="blue" size="sm" />
            <div>
              <Kicker onDark>preview · fixture data</Kicker>
              <h1 style={{ fontSize: 44, margin: 0, lineHeight: 1 }}>
                the{' '}
                <em style={{ color: 'var(--lantern)', fontStyle: 'italic' }}>
                  keeper&rsquo;s keys
                </em>
                .
              </h1>
              <Hand onDark>~ the room itself · your name, your realm, the kettle ~</Hand>
            </div>
          </div>
        </header>

        <SettingsContent data={SETTINGS_FIXTURE} />
      </Desk>
    </NightRoom>
  );
}
