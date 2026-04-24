// A thin horizontal progress indicator across the top of the
// workbench. Shows the five stages (satchel → outline → lessons →
// images → seal) with the current one lantern-filled. Hidden
// decoration only — no interaction.

'use client';

import { Kicker } from '@/components/scriptorium';
import type { DraftStage } from '@/lib/types/course-drafts';

const STAGES: readonly { readonly key: DraftStage; readonly label: string }[] = [
  { key: 'satchel', label: 'the satchel' },
  { key: 'outline', label: 'the outline' },
  { key: 'lessons', label: 'the lessons' },
  { key: 'images', label: 'the images' },
  { key: 'ready', label: 'seal' },
];

export function StageRibbon({ stage }: { readonly stage: DraftStage }): React.JSX.Element {
  // `sealed` is a terminal state the workbench rarely shows (the user
  // is redirected to the course builder); treat it as "ready" in the
  // ribbon so the final step still highlights.
  const currentKey: DraftStage = stage === 'sealed' ? 'ready' : stage;
  const currentIndex = STAGES.findIndex((s) => s.key === currentKey);

  return (
    <div>
      <Kicker onDark>the ritual</Kicker>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${STAGES.length}, 1fr)`,
          gap: 8,
          marginTop: 6,
        }}
      >
        {STAGES.map((s, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <div
              key={s.key}
              style={{
                padding: '10px 12px',
                borderRadius: 3,
                border: active
                  ? '1.5px solid var(--lantern)'
                  : done
                    ? '1px solid var(--verdigris)'
                    : '1px dashed var(--bronze)',
                background: active
                  ? 'linear-gradient(135deg, rgba(212, 165, 116, 0.2), rgba(212, 165, 116, 0.08))'
                  : 'transparent',
                color: active
                  ? 'var(--lantern-core)'
                  : done
                    ? 'var(--verdigris)'
                    : 'var(--vellum-shadow)',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: 1.6,
                textTransform: 'uppercase',
                textAlign: 'center',
                fontWeight: active ? 600 : 400,
              }}
              aria-current={active ? 'step' : undefined}
            >
              {done ? '✓ ' : active ? '◈ ' : ''}
              {s.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
