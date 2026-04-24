// `/dashboard/courses/conjure` — the scribe's workbench. Entry point
// for the AI course maker. Server component: loads (or creates) the
// creator's current unsealed draft and hands it to the client
// ConjureWorkbench. Resume-by-default per the Phase-10 plan.

import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Hand, LedgerCard } from '@/components/scriptorium';
import { getOrCreateDraft } from '@/app/_actions/scribe';

import { ConjureWorkbench } from './_components/ConjureWorkbench';

export const dynamic = 'force-dynamic';

export default async function ConjurePage(): Promise<React.JSX.Element> {
  const result = await getOrCreateDraft();

  return (
    <DashboardShell
      kicker="the scribe"
      title={
        <>
          conjure a <em style={{ color: 'var(--lantern)', fontStyle: 'italic' }}>course</em>.
        </>
      }
      tagline="~ drop in your parchments, name the thing, and approve as the scribe writes ~"
    >
      {!result.ok ? (
        <LedgerCard>
          <p style={{ color: 'var(--crimson)' }}>
            The scribe couldn&rsquo;t open a workbench: {result.error}
          </p>
          <Hand>~ try again, or sign back in if the hour is late ~</Hand>
        </LedgerCard>
      ) : (
        <ConjureWorkbench initialDraft={result.value} />
      )}
    </DashboardShell>
  );
}
