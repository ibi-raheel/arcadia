// Shell-only — Phase 8. Real data wire-up blocked on Supabase schema
// additions (MRR, churn, retention) scheduled for a post-Phase-8 ADR.

import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Hand, VellumCard } from '@/components/scriptorium';

export default function MembershipsTab(): React.JSX.Element {
  return (
    <DashboardShell
      kicker="memberships"
      title={
        <>
          the <em style={{ color: 'var(--lantern)', fontStyle: 'italic' }}>guild roll</em>.
        </>
      }
      tagline="~ who pays, who stays, who&rsquo;s been away ~"
    >
      <VellumCard>
        <p className="body-italic" style={{ color: 'var(--ink)', fontSize: 17 }}>
          This ledger is still being ruled. Membership tiers, MRR, retention, and the guild roll
          come in a later chapter.
        </p>
        <Hand>~ the keeper has not set out the quills yet ~</Hand>
      </VellumCard>
    </DashboardShell>
  );
}
