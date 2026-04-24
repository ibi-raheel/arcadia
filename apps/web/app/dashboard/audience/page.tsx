import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Hand, VellumCard } from '@/components/scriptorium';

export default function AudienceTab(): React.JSX.Element {
  return (
    <DashboardShell
      kicker="audience"
      title={
        <>
          your <em style={{ color: 'var(--lantern)', fontStyle: 'italic' }}>folk</em>.
        </>
      }
      tagline="~ names, last seen, progress, signs of wear ~"
    >
      <VellumCard>
        <p className="body-italic" style={{ color: 'var(--ink)', fontSize: 17 }}>
          The audience roll is drying. Cohort tracking, activity heatmaps, and the "who to write to"
          list land in a later chapter.
        </p>
        <Hand>~ bring tea, come back in a fortnight ~</Hand>
      </VellumCard>
    </DashboardShell>
  );
}
