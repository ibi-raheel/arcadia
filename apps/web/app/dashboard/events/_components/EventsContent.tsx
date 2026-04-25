// Creator-side events management UI — live event scheduling + list.
// Lives under _components so /preview/events (future) can render the
// same surface against fixture data.

'use client';

import { useMemo, useState, useTransition } from 'react';

import { createEvent, deleteEvent, updateEvent } from '@/app/_actions/feed';
import {
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
} from '@/components/scriptorium';
import { eventStatus, formatEventWhen } from '@/lib/events/status';
import type { EventsData, LiveEvent } from '@/lib/fixtures/events';

type Props = {
  readonly data: EventsData;
  readonly onChanged?: () => void;
};

export function EventsContent({ data, onChanged }: Props): React.JSX.Element {
  const [creating, setCreating] = useState(false);
  const notify = (): void => {
    onChanged?.();
  };

  const sorted = useMemo(
    () => [...data.events].sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt)),
    [data.events],
  );
  const now = new Date();
  const live = sorted.filter((e) => eventStatus(e, now) === 'live');
  const upcoming = sorted
    .filter((e) => eventStatus(e, now) === 'upcoming')
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const past = sorted.filter((e) => eventStatus(e, now) === 'past');

  return (
    <>
      {/* KPI strip */}
      <LedgerCard style={{ padding: '18px 22px', marginBottom: 22 }} rotate={-0.2}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          <EventStat label="live now" value={`${live.length}`} color="var(--verdigris)" />
          <EventStat label="upcoming · 7d" value={`${countWithin(upcoming, 7, now)}`} />
          <EventStat label="scheduled · all" value={`${upcoming.length}`} />
          <EventStat label="past · held" value={`${past.length}`} />
        </div>
      </LedgerCard>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 10,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <Kicker onDark>schedule a new event</Kicker>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 26,
              color: 'var(--vellum)',
              margin: '2px 0 0',
              lineHeight: 1,
            }}
          >
            ink the calendar
          </h2>
        </div>
        {!creating && (
          <BronzeButton size="sm" onClick={() => setCreating(true)}>
            + new event
          </BronzeButton>
        )}
      </div>

      {creating && (
        <CreateEventForm
          onCancel={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            notify();
          }}
        />
      )}

      {live.length > 0 && (
        <EventSection
          kicker="live now · in this realm"
          title="on the hearth"
          accent="var(--verdigris)"
          events={live}
          onChanged={notify}
        />
      )}

      {upcoming.length > 0 && (
        <EventSection
          kicker="upcoming · scheduled"
          title="the calendar"
          accent="var(--lantern)"
          events={upcoming}
          onChanged={notify}
        />
      )}

      {past.length > 0 && (
        <EventSection
          kicker="past · held"
          title="the record"
          accent="var(--ink-faint)"
          events={past}
          dimmed
          onChanged={notify}
        />
      )}

      {data.events.length === 0 && (
        <LedgerCard>
          <p
            className="body-italic"
            style={{ fontSize: 17, color: 'var(--ink)', textAlign: 'center' }}
          >
            no events yet. ink one above and members see it immediately in the tavern feed.
          </p>
          <Hand>~ weekly Q&amp;A · office hours · cohort kickoff — all live in the tavern ~</Hand>
        </LedgerCard>
      )}
    </>
  );
}

function countWithin(events: readonly LiveEvent[], days: number, now: Date): number {
  const horizon = now.getTime() + days * 86_400_000;
  return events.filter((e) => Date.parse(e.startsAt) <= horizon).length;
}

function EventStat({
  label,
  value,
  color = 'var(--ink)',
}: {
  readonly label: string;
  readonly value: string;
  readonly color?: string;
}): React.JSX.Element {
  return (
    <div>
      <Kicker>{label}</Kicker>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 30,
          color,
          lineHeight: 1,
          marginTop: 4,
          fontVariantNumeric: 'oldstyle-nums',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function EventSection({
  kicker,
  title,
  accent,
  events,
  dimmed = false,
  onChanged,
}: {
  readonly kicker: string;
  readonly title: string;
  readonly accent: string;
  readonly events: readonly LiveEvent[];
  readonly dimmed?: boolean;
  readonly onChanged?: () => void;
}): React.JSX.Element {
  return (
    <section style={{ marginTop: 22 }}>
      <div style={{ marginBottom: 10 }}>
        <Kicker onDark>{kicker}</Kicker>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 22,
            color: 'var(--vellum)',
            margin: '2px 0 0',
            lineHeight: 1,
          }}
        >
          {title}
        </h3>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 14,
          opacity: dimmed ? 0.75 : 1,
        }}
      >
        {events.map((e) => (
          <EventCard key={e.id} event={e} accent={accent} onChanged={onChanged} />
        ))}
      </div>
    </section>
  );
}

function EventCard({
  event,
  accent,
  onChanged,
}: {
  readonly event: LiveEvent;
  readonly accent: string;
  readonly onChanged?: () => void;
}): React.JSX.Element {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const status = eventStatus(event);

  const onDelete = (): void => {
    if (!window.confirm(`Delete "${event.title}"? This can't be undone.`)) return;
    startTransition(async () => {
      const result = await deleteEvent(event.id);
      if (result.ok) onChanged?.();
    });
  };

  if (editing) {
    return (
      <EditEventForm
        event={event}
        onDone={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          onChanged?.();
        }}
      />
    );
  }

  return (
    <VellumCard
      style={{
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        borderLeft: `3px solid ${accent}`,
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 10,
          alignItems: 'flex-start',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <Kicker>{event.location}</Kicker>
          <h4
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 20,
              color: 'var(--ink)',
              margin: '2px 0 0',
              lineHeight: 1.1,
            }}
          >
            {event.title}
          </h4>
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: 1.3,
              color: 'var(--ink-soft)',
              textTransform: 'uppercase',
              marginTop: 4,
            }}
          >
            {formatEventWhen(event)}
          </div>
        </div>
        {status === 'live' ? (
          <Chip variant="verdigris">live</Chip>
        ) : status === 'upcoming' ? (
          <Chip variant="gilt">scheduled</Chip>
        ) : (
          <Chip>past</Chip>
        )}
      </header>
      {event.description && (
        <p
          className="body-italic"
          style={{
            margin: 0,
            color: 'var(--ink-soft)',
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          {event.description}
        </p>
      )}
      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: 1.2,
          color: 'var(--ink-soft)',
          textTransform: 'uppercase',
        }}
      >
        {event.streamUrl ? 'stream · wired' : 'stream · not yet set'}
      </div>
      <div
        style={{
          marginTop: 'auto',
          paddingTop: 10,
          borderTop: '1px dashed rgba(90, 63, 34, 0.22)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
        }}
      >
        <GhostButton size="sm" onClick={onDelete} disabled={pending}>
          {pending ? '…' : 'delete'}
        </GhostButton>
        <GhostButton size="sm" onClick={() => setEditing(true)}>
          edit
        </GhostButton>
      </div>
    </VellumCard>
  );
}

// --- Create / edit forms ---

function isoLocalToDate(value: string): string {
  // Input[type=datetime-local] gives "YYYY-MM-DDTHH:MM" with no tz —
  // we interpret as local, then push to UTC ISO.
  const d = new Date(value);
  return d.toISOString();
}

function dateToIsoLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number): string => `${n}`.padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

const DEFAULT_LOCATION = 'tavern-a';
const LOCATIONS: readonly { readonly value: string; readonly label: string }[] = [
  { value: 'tavern-a', label: 'The Three Ravens' },
  { value: 'tavern-b', label: 'The Iron Chalice' },
  { value: 'tavern-c', label: 'The Sleeping Hollow' },
];

function CreateEventForm({
  onCancel,
  onCreated,
}: {
  readonly onCancel: () => void;
  readonly onCreated?: () => void;
}): React.JSX.Element {
  const nowLocal = dateToIsoLocal(new Date(Date.now() + 3_600_000).toISOString());
  const endLocal = dateToIsoLocal(new Date(Date.now() + 2 * 3_600_000).toISOString());

  return (
    <ScrollCard style={{ padding: '22px 24px', marginBottom: 22 }}>
      <header style={{ marginBottom: 12 }}>
        <Kicker>new event</Kicker>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 24,
            color: 'var(--ink)',
            margin: '4px 0 0',
          }}
        >
          schedule the next gathering
        </h3>
        <Hand>~ members see it in the feed the moment you seal it ~</Hand>
      </header>
      <EventForm
        initial={{
          title: '',
          description: '',
          startsAt: nowLocal,
          endsAt: endLocal,
          streamUrl: '',
          location: DEFAULT_LOCATION,
        }}
        submitLabel="seal the event"
        onSubmit={async (values) => {
          const result = await createEvent({
            title: values.title,
            description: values.description || null,
            startsAt: isoLocalToDate(values.startsAt),
            endsAt: isoLocalToDate(values.endsAt),
            streamUrl: values.streamUrl || null,
            location: values.location,
          });
          if (result.ok) {
            if (onCreated) onCreated();
            else onCancel();
          }
          return result.ok ? { ok: true } : { ok: false, error: result.error };
        }}
        onCancel={onCancel}
      />
    </ScrollCard>
  );
}

function EditEventForm({
  event,
  onDone,
  onSaved,
}: {
  readonly event: LiveEvent;
  readonly onDone: () => void;
  readonly onSaved?: () => void;
}): React.JSX.Element {
  return (
    <VellumCard style={{ padding: '18px 20px' }}>
      <header style={{ marginBottom: 12 }}>
        <Kicker>editing</Kicker>
        <h4
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 19,
            color: 'var(--ink)',
            margin: '2px 0 0',
          }}
        >
          {event.title}
        </h4>
      </header>
      <EventForm
        initial={{
          title: event.title,
          description: event.description ?? '',
          startsAt: dateToIsoLocal(event.startsAt),
          endsAt: dateToIsoLocal(event.endsAt),
          streamUrl: event.streamUrl ?? '',
          location: event.location,
        }}
        submitLabel="save changes"
        onSubmit={async (values) => {
          const result = await updateEvent({
            id: event.id,
            title: values.title,
            description: values.description || null,
            startsAt: isoLocalToDate(values.startsAt),
            endsAt: isoLocalToDate(values.endsAt),
            streamUrl: values.streamUrl || null,
            location: values.location,
          });
          if (result.ok) {
            if (onSaved) onSaved();
            else onDone();
          }
          return result.ok ? { ok: true } : { ok: false, error: result.error };
        }}
        onCancel={onDone}
      />
    </VellumCard>
  );
}

type FormValues = {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  streamUrl: string;
  location: string;
};

function EventForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  readonly initial: FormValues;
  readonly submitLabel: string;
  readonly onSubmit: (values: FormValues) => Promise<{ ok: boolean; error?: string }>;
  readonly onCancel: () => void;
}): React.JSX.Element {
  const [values, setValues] = useState<FormValues>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof FormValues>(key: K, v: FormValues[K]): void => {
    setValues((prev) => ({ ...prev, [key]: v }));
  };

  const submit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.ok) setError(result.error ?? 'could not save');
    });
  };

  return (
    <form
      onSubmit={submit}
      style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}
    >
      <VellumField
        label="title"
        value={values.title}
        onChange={(e) => set('title', e.target.value)}
        required
        maxLength={140}
        disabled={pending}
        placeholder="Weekly Q&A"
      />
      <div>
        <label className="field-label" htmlFor="event-desc">
          description
        </label>
        <textarea
          id="event-desc"
          className="field"
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          rows={3}
          maxLength={2_000}
          disabled={pending}
          placeholder="What are you bringing to the hearth?"
          style={{ resize: 'vertical', minHeight: 72, lineHeight: 1.5, padding: '8px 2px' }}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
        <VellumField
          label="starts"
          type="datetime-local"
          value={values.startsAt}
          onChange={(e) => set('startsAt', e.target.value)}
          required
          disabled={pending}
        />
        <VellumField
          label="ends"
          type="datetime-local"
          value={values.endsAt}
          onChange={(e) => set('endsAt', e.target.value)}
          required
          disabled={pending}
        />
      </div>
      <VellumField
        label="stream url · YouTube live or embed"
        value={values.streamUrl}
        onChange={(e) => set('streamUrl', e.target.value)}
        disabled={pending}
        placeholder="https://www.youtube.com/embed/..."
      />
      <div>
        <label className="field-label" htmlFor="event-location">
          location · which tavern
        </label>
        <select
          id="event-location"
          className="field"
          value={values.location}
          onChange={(e) => set('location', e.target.value)}
          disabled={pending}
          style={{ cursor: 'pointer' }}
        >
          {LOCATIONS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.value} · {l.label}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p className="hand" role="alert" style={{ margin: 0, color: 'var(--crimson)' }}>
          ~ {error} ~
        </p>
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          paddingTop: 10,
          borderTop: '1px dashed rgba(90, 63, 34, 0.22)',
        }}
      >
        <GhostButton type="button" size="sm" onClick={onCancel} disabled={pending}>
          set aside
        </GhostButton>
        <WaxButton type="submit" disabled={pending}>
          {pending ? 'sealing…' : submitLabel}
        </WaxButton>
      </div>
    </form>
  );
}
