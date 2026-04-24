// `/preview/courses` — public fixture-rendered preview of the kiln
// (courses) tab. Same CoursesContent the real dashboard renders, fed
// by COURSES_FIXTURE. No auth gate; lives outside /dashboard/* so the
// layout's supabase check doesn't fire.

import { CoursesContent } from '@/app/dashboard/courses/_components/CoursesContent';
import {
  BronzeButton,
  Desk,
  DropCap,
  Hand,
  Kicker,
  NightRoom,
  SimulationBadge,
} from '@/components/scriptorium';
import { COURSES_FIXTURE } from '@/lib/fixtures/courses';

export const dynamic = 'force-static';

export default function CoursesPreviewPage(): React.JSX.Element {
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
            <DropCap letter="K" variant="blue" size="sm" />
            <div>
              <Kicker onDark>preview · fixture data</Kicker>
              <h1 style={{ fontSize: 44, margin: 0, lineHeight: 1 }}>
                the <em style={{ color: 'var(--lantern)', fontStyle: 'italic' }}>kiln</em>.
              </h1>
              <Hand onDark>~ publish what&rsquo;s finished, keep what&rsquo;s drying ~</Hand>
            </div>
          </div>
          <BronzeButton disabled>ink a new course →</BronzeButton>
        </header>

        <CoursesContent data={COURSES_FIXTURE} />
      </Desk>
    </NightRoom>
  );
}
