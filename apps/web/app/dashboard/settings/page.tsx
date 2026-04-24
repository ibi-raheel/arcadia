import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Hand, VellumCard } from '@/components/scriptorium';

export default function SettingsTab(): React.JSX.Element {
  return (
    <DashboardShell
      kicker="settings"
      title={
        <>
          the <em style={{ color: 'var(--lantern)', fontStyle: 'italic' }}>keeper&rsquo;s keys</em>.
        </>
      }
      tagline="~ the room itself · doors, locks, the kettle ~"
    >
      <VellumCard>
        <p className="body-italic" style={{ color: 'var(--ink)', fontSize: 17 }}>
          Keeper&rsquo;s keys are still being cut. Profile, realm name, team roles, notifications,
          and danger-zone come in a later chapter.
        </p>
        <Hand>~ no keys yet, but the door is open ~</Hand>
      </VellumCard>
    </DashboardShell>
  );
}
