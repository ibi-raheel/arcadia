import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { EnvelopeCard, Hand } from '@/components/scriptorium';

export default function PayoutsTab(): React.JSX.Element {
  return (
    <DashboardShell
      kicker="payouts"
      title={
        <>
          the <em style={{ color: 'var(--lantern)', fontStyle: 'italic' }}>coin jar</em>.
        </>
      }
      tagline="~ what&rsquo;s been earned, what&rsquo;s on its way ~"
    >
      <EnvelopeCard>
        <p style={{ color: 'var(--vellum)', fontStyle: 'italic', fontSize: 17 }}>
          The coin jar is being sealed. Stripe Connect, payout history, and tax paperwork land in a
          later chapter.
        </p>
        <Hand onDark>~ the envelope is still in the wax ~</Hand>
      </EnvelopeCard>
    </DashboardShell>
  );
}
