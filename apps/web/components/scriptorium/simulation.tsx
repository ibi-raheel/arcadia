// Simulation-toggle UI. Two pieces:
//
//   <SimulationToggle /> — a small switch that flips the `sim` state.
//     Mount inside a dashboard shell / header row so builders / demos
//     can click it explicitly.
//
//   <SimulationBadge /> — a fixed top-right lantern-coloured pill that
//     shows while sim is ON, so fake data is never mistaken for real.
//     Clicking the badge turns sim off.

'use client';

import { useSimulationMode } from '@/lib/simulation-mode';

type Props = { readonly className?: string };

/** Inline toggle. Off state = discreet outlined; on state = lantern fill. */
export function SimulationToggle({ className }: Props) {
  const [on, setOn] = useSimulationMode();
  return (
    <button
      type="button"
      onClick={() => setOn(!on)}
      aria-pressed={on}
      aria-label={on ? 'turn simulation off' : 'turn simulation on'}
      className={`scriptorium-sim-toggle ${on ? 'is-on' : ''} ${className ?? ''}`.trim()}
      style={{
        padding: '7px 14px',
        borderRadius: 20,
        border: '1px dashed var(--bronze)',
        background: on
          ? 'linear-gradient(135deg, var(--lantern-core), var(--lantern))'
          : 'transparent',
        color: on ? 'var(--night)' : 'var(--vellum-shadow)',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        letterSpacing: 1.6,
        textTransform: 'uppercase',
        cursor: 'pointer',
      }}
    >
      {on ? '◈ simulation · on' : 'simulation · off'}
    </button>
  );
}

/** Fixed top-right indicator. Only renders while sim is on. */
export function SimulationBadge() {
  const [on, setOn] = useSimulationMode();
  if (!on) return null;
  return (
    <button
      type="button"
      onClick={() => setOn(false)}
      aria-label="simulation is on — click to turn off"
      title="simulation is on — click to turn off"
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 9999,
        padding: '8px 14px',
        borderRadius: 20,
        border: '1.5px solid var(--wax-deep)',
        background: 'linear-gradient(135deg, var(--lantern-core), var(--lantern))',
        color: 'var(--night)',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        letterSpacing: 1.6,
        textTransform: 'uppercase',
        fontWeight: 600,
        cursor: 'pointer',
        boxShadow: '0 6px 14px rgba(0,0,0,0.5)',
      }}
    >
      ◈ simulation
    </button>
  );
}
