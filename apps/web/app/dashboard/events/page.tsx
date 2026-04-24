// `/dashboard/events` — creator-side events management. Schedule a
// live event, edit its details, point it at a YouTube stream URL,
// delete when it's over. Shell matches the other dashboard tabs; the
// real work lives in `_components/EventsContent.tsx` so both the
// auth-gated route and a (future) public preview can share it.

'use client';

import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Hand, LedgerCard } from '@/components/scriptorium';
import { loadEvents } from '@/app/_actions/feed';
import { EVENTS_FIXTURE, type EventsData } from '@/lib/fixtures/events';
import { useFetchOrMock } from '@/lib/fetch-or-mock';

import { EventsContent } from './_components/EventsContent';

async function loadEventsReal(): Promise<EventsData> {
  const result = await loadEvents();
  if (!result.ok) return { events: [] };
  return { events: result.value.events };
}

export default function EventsPage(): React.JSX.Element {
  const { data, loading, error } = useFetchOrMock<EventsData>(loadEventsReal, EVENTS_FIXTURE);

  return (
    <DashboardShell
      kicker="live events"
      title={
        <>
          the <em style={{ color: 'var(--lantern)', fontStyle: 'italic' }}>stage</em>.
        </>
      }
      tagline="~ the weekly Q&amp;A, the kickoff, the office hour ~"
    >
      {loading && <Hand onDark>~ checking the calendar ~</Hand>}
      {error && (
        <LedgerCard>
          <p style={{ color: 'var(--crimson)' }}>Couldn&rsquo;t load: {error.message}</p>
        </LedgerCard>
      )}
      {data && <EventsContent data={data} />}
    </DashboardShell>
  );
}
