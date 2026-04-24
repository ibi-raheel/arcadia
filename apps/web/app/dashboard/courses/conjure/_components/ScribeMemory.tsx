// The scribe's memory — per-creator preferences that persist across
// drafts. Collapsed by default; when set, shows a one-line summary.
// Expanding reveals three textareas: voice guide, image style,
// audience. Save button upserts to `creator_preferences`.
//
// Preferences are automatically read by the three scribe routes
// (outline, lesson, image) and injected into prompts. No client-
// side prompt plumbing.

'use client';

import { useEffect, useState, useTransition } from 'react';

import { getCreatorPreferences, saveCreatorPreferences } from '@/app/_actions/scribe';
import {
  BronzeButton,
  GhostButton,
  Hand,
  Kicker,
  LedgerCard,
  VellumField,
} from '@/components/scriptorium';
import { AUDIENCE_MAX, IMAGE_STYLE_MAX, VOICE_GUIDE_MAX } from '@/lib/types/creator-preferences';

type State = {
  readonly voiceGuide: string;
  readonly imageStyle: string;
  readonly audience: string;
};

const EMPTY: State = { voiceGuide: '', imageStyle: '', audience: '' };

export function ScribeMemory(): React.JSX.Element {
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [original, setOriginal] = useState<State>(EMPTY);
  const [state, setState] = useState<State>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await getCreatorPreferences();
      if (cancelled) return;
      if (result.ok) {
        const next: State = {
          voiceGuide: result.value.voice_guide ?? '',
          imageStyle: result.value.image_style ?? '',
          audience: result.value.audience ?? '',
        };
        setOriginal(next);
        setState(next);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const anySet =
    state.voiceGuide.length > 0 || state.imageStyle.length > 0 || state.audience.length > 0;
  const dirty =
    state.voiceGuide !== original.voiceGuide ||
    state.imageStyle !== original.imageStyle ||
    state.audience !== original.audience;

  const onSave = (): void => {
    setError(null);
    setSaved(false);
    startSave(async () => {
      const result = await saveCreatorPreferences({
        voice_guide: state.voiceGuide || null,
        image_style: state.imageStyle || null,
        audience: state.audience || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOriginal(state);
      setSaved(true);
    });
  };

  if (!loaded) return <></>;

  // Collapsed summary
  if (!open) {
    return (
      <LedgerCard style={{ padding: '14px 18px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <Kicker>the scribe&rsquo;s memory</Kicker>
            <Hand>
              {anySet
                ? '~ your voice, your audience, your image style — remembered across drafts ~'
                : '~ teach the scribe your voice once — it remembers across every course ~'}
            </Hand>
            {anySet && (
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  color: 'var(--ink-faint)',
                  marginTop: 6,
                }}
              >
                {[
                  state.voiceGuide && `voice · ${state.voiceGuide.length} chars`,
                  state.imageStyle && `image · ${state.imageStyle.length} chars`,
                  state.audience && `audience · ${state.audience.length} chars`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            )}
          </div>
          <GhostButton size="sm" onClick={() => setOpen(true)}>
            {anySet ? 'edit' : 'teach the scribe'}
          </GhostButton>
        </div>
      </LedgerCard>
    );
  }

  // Expanded editor
  return (
    <LedgerCard style={{ padding: '20px 22px' }}>
      <header style={{ marginBottom: 14 }}>
        <Kicker>the scribe&rsquo;s memory</Kicker>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 22,
            color: 'var(--ink)',
            margin: '4px 0 0',
            lineHeight: 1.15,
          }}
        >
          teach the scribe your voice.
        </h3>
        <Hand>~ set once · used every time · edit whenever ~</Hand>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className="field-label" htmlFor="scribe-voice">
            voice guide · how should lessons read?
          </label>
          <textarea
            id="scribe-voice"
            className="field"
            value={state.voiceGuide}
            onChange={(e) =>
              setState((s) => ({ ...s, voiceGuide: e.target.value.slice(0, VOICE_GUIDE_MAX) }))
            }
            rows={4}
            maxLength={VOICE_GUIDE_MAX}
            disabled={saving}
            placeholder="plain-spoken, concrete before abstract, short sentences, assume working-adult literacy"
            style={{ resize: 'vertical', minHeight: 80, lineHeight: 1.5, padding: '8px 2px' }}
          />
          <Counter value={state.voiceGuide.length} max={VOICE_GUIDE_MAX} />
        </div>

        <div>
          <label className="field-label" htmlFor="scribe-image">
            image style · appended to the locked arcadia preamble
          </label>
          <textarea
            id="scribe-image"
            className="field"
            value={state.imageStyle}
            onChange={(e) =>
              setState((s) => ({ ...s, imageStyle: e.target.value.slice(0, IMAGE_STYLE_MAX) }))
            }
            rows={3}
            maxLength={IMAGE_STYLE_MAX}
            disabled={saving}
            placeholder="muted palette, no human faces, botanical motifs, plenty of negative space"
            style={{ resize: 'vertical', minHeight: 64, lineHeight: 1.5, padding: '8px 2px' }}
          />
          <Counter value={state.imageStyle.length} max={IMAGE_STYLE_MAX} />
        </div>

        <div>
          <VellumField
            label="audience · who are your courses for?"
            value={state.audience}
            onChange={(e) =>
              setState((s) => ({ ...s, audience: e.target.value.slice(0, AUDIENCE_MAX) }))
            }
            maxLength={AUDIENCE_MAX}
            disabled={saving}
            placeholder="working designers moving into dev tooling — assumes strong visual taste, zero CS"
          />
          <Counter value={state.audience.length} max={AUDIENCE_MAX} />
        </div>

        {error && (
          <p className="hand" role="alert" style={{ margin: 0, color: 'var(--crimson)' }}>
            ~ {error} ~
          </p>
        )}
        {saved && !dirty && (
          <p className="hand" style={{ margin: 0, color: 'var(--verdigris)' }}>
            ~ the scribe has written it down ~
          </p>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            paddingTop: 12,
            borderTop: '1px dashed rgba(90, 63, 34, 0.25)',
          }}
        >
          <GhostButton size="sm" onClick={() => setOpen(false)} disabled={saving}>
            set aside
          </GhostButton>
          <BronzeButton size="sm" onClick={onSave} disabled={saving || !dirty}>
            {saving ? 'writing…' : 'save to memory'}
          </BronzeButton>
        </div>
      </div>
    </LedgerCard>
  );
}

function Counter({
  value,
  max,
}: {
  readonly value: number;
  readonly max: number;
}): React.JSX.Element {
  const pct = value / max;
  const color = pct > 0.9 ? 'var(--crimson)' : 'var(--ink-faint)';
  return (
    <div
      className="mono"
      style={{
        fontSize: 10,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color,
        textAlign: 'right',
        marginTop: 4,
      }}
    >
      {value} / {max}
    </div>
  );
}
