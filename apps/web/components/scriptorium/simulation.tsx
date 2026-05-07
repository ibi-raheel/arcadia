// Simulation-toggle UI. Three pieces:
//
//   <SimulationToggle /> — a small switch that flips the `sim` state.
//     Mount inside a dashboard shell / header row so builders / demos
//     can click it explicitly.
//
//   <SimulationBadge /> — a fixed top-right lantern-coloured pill that
//     shows while sim is ON, so fake data is never mistaken for real.
//     Clicking the badge turns sim off.
//
//   <SimulationPill /> — a fixed bottom-left pill that's always
//     visible (off-state outline, on-state lantern fill), pairs with
//     the bottom-right ambient-music mute toggle. Used on every
//     in-world Phaser page so demoers can flip NPCs on/off without
//     digging through the dashboard.

'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useSimulationMode } from '@/lib/simulation-mode';

/** Routes where the SimulationPill is hidden (pre-auth flows — the
 *  user has nothing to simulate yet). Matches AmbientMusic's gate. */
function isHiddenRoute(pathname: string): boolean {
  if (pathname === '/login' || pathname === '/signup') return true;
  if (pathname.startsWith('/onboarding')) return true;
  return false;
}

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

/** Fixed bottom-left always-visible toggle pill. Used on in-world
 *  Phaser pages where the SimulationToggle isn't mounted in any
 *  header — pairs visually with the bottom-right ambient-music
 *  mute toggle. **Hidden inside iframes** so when the dashboard
 *  opens as an in-world iframe overlay (DashboardOverlay), the
 *  iframe's own copy of this pill doesn't compete with the
 *  inline `<SimulationToggle />` in `<DashboardShell>`. The parent
 *  page's pill stays at z-70 (below the overlay's z-80 backdrop)
 *  for the same reason — the dashboard view should expose only
 *  one sim control, the inline toggle. */
export function SimulationPill() {
  const [on, setOn] = useSimulationMode();
  const pathname = usePathname() ?? '/';
  const [inIframe, setInIframe] = useState(false);
  useEffect(() => {
    try {
      setInIframe(window.parent !== window);
    } catch {
      // Cross-origin parent access throws — that's still an iframe.
      setInIframe(true);
    }
  }, []);
  if (isHiddenRoute(pathname)) return null;
  if (inIframe) return null;
  return (
    <button
      type="button"
      onClick={() => setOn(!on)}
      aria-pressed={on}
      aria-label={on ? 'turn simulation off' : 'turn simulation on'}
      title={on ? 'simulation on — click to turn off' : 'simulation off — click to turn on'}
      style={{
        position: 'fixed',
        bottom: 14,
        left: 14,
        zIndex: 70,
        padding: '7px 12px',
        borderRadius: 20,
        border: on ? '1.5px solid var(--wax-deep)' : '1px dashed var(--bronze)',
        background: on
          ? 'linear-gradient(135deg, var(--lantern-core), var(--lantern))'
          : 'rgba(20, 10, 5, 0.7)',
        color: on ? 'var(--night)' : 'var(--bronze-bright, #d4a868)',
        fontFamily: 'var(--font-mono, JetBrains Mono, monospace)',
        fontSize: 11,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        fontWeight: on ? 600 : 500,
        cursor: 'pointer',
        boxShadow: on ? '0 6px 14px rgba(0, 0, 0, 0.5)' : '0 2px 8px rgba(0, 0, 0, 0.35)',
        opacity: on ? 1 : 0.75,
        transition: 'opacity 120ms ease-out, color 120ms ease-out',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = on ? '1' : '0.75')}
    >
      {on ? '◈ sim · on' : 'sim · off'}
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
