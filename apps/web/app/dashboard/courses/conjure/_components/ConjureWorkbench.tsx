// The scribe's workbench — the outer client shell that holds draft
// state + routes between stages. Phase 10 lands stages incrementally:
//   10.2 · the satchel (this sub-phase)
//   10.4 · outline
//   10.5 · lessons
//   10.6 · images
//   10.7 · seal
//
// Until later stages land, non-satchel stages render a placeholder so
// the UX still reads as a coherent ritual.

'use client';

import { useState } from 'react';

import { Hand, Kicker, LedgerCard } from '@/components/scriptorium';
import type { CourseDraft, DraftSource } from '@/lib/types/course-drafts';

import { Satchel } from './Satchel';
import { StageRibbon } from './StageRibbon';

type Props = {
  readonly initialDraft: CourseDraft;
};

export function ConjureWorkbench({ initialDraft }: Props): React.JSX.Element {
  const [draft, setDraft] = useState<CourseDraft>(initialDraft);

  const onSourcesChanged = (sources: readonly DraftSource[]): void => {
    setDraft((d) => ({ ...d, sources }));
  };

  const onPromptChanged = (userPrompt: string): void => {
    setDraft((d) => ({ ...d, user_prompt: userPrompt }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <StageRibbon stage={draft.stage} />

      <Satchel
        draftId={draft.id}
        sources={draft.sources}
        userPrompt={draft.user_prompt}
        onSourcesChanged={onSourcesChanged}
        onPromptChanged={onPromptChanged}
      />

      {draft.stage !== 'satchel' && (
        <LedgerCard>
          <Kicker>coming soon</Kicker>
          <p className="body-italic" style={{ fontSize: 16, color: 'var(--ink)' }}>
            the next stage lands in the following sub-phase — this placeholder is what the workbench
            shows while the scribe is still learning to draft outlines.
          </p>
          <Hand>~ you&rsquo;re on stage: {draft.stage} ~</Hand>
        </LedgerCard>
      )}
    </div>
  );
}
