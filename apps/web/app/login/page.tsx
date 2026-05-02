// `/login` — the doorway into Arcadia. Night-room + scroll form with a
// blue drop-cap "A", bronze underline fields, and a bronze primary
// submit. Mirrors the signup scroll but uses "open the door" copy.

'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import {
  BronzeButton,
  Desk,
  DropCap,
  Hand,
  Kicker,
  NightRoom,
  ScrollCard,
  VellumField,
} from '@/components/scriptorium';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LoginPage(): React.JSX.Element {
  return (
    <NightRoom>
      <Desk>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 24px',
          }}
        >
          <div style={{ width: '100%', maxWidth: 480 }}>
            <ScrollCard>
              <header
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 18,
                  paddingBottom: 18,
                  borderBottom: '1px dashed rgba(90, 63, 34, 0.3)',
                }}
              >
                <DropCap letter="A" variant="blue" />
                <div style={{ flex: 1 }}>
                  <Kicker>the doorway</Kicker>
                  <h1
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontStyle: 'italic',
                      fontSize: 34,
                      margin: '4px 0 0',
                      color: 'var(--ink)',
                      lineHeight: 1.1,
                    }}
                  >
                    Welcome back.
                  </h1>
                  <Hand>~ sign the ledger to step inside ~</Hand>
                </div>
              </header>

              <Suspense
                fallback={
                  <p
                    className="body-italic"
                    style={{ marginTop: 18, color: 'var(--ink-soft)', textAlign: 'center' }}
                  >
                    ~ unfurling the scroll ~
                  </p>
                }
              >
                <LoginForm />
              </Suspense>
            </ScrollCard>
          </div>
        </div>
      </Desk>
    </NightRoom>
  );
}

function LoginForm(): React.JSX.Element {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    // Bank the click as a user gesture for the persistent ambient
    // music. Without this, `audio.play()` on `/` runs *after* the
    // `await` below and is no longer inside a fresh user-activation
    // window — Chrome's autoplay policy rejects it and the music
    // waits for the user's NEXT click anywhere. Calling play()
    // synchronously here grants the audio element permission for the
    // rest of this top-level browsing context; AmbientMusic re-pauses
    // it immediately on /login (muted route), then plays cleanly on /.
    try {
      const audio = document.querySelector<HTMLAudioElement>('audio[data-arcadia-ambient]');
      void audio?.play().catch(() => {
        // ignore — best-effort gesture-bank, AmbientMusic will retry
      });
    } catch {
      // ignore — non-DOM environments / SSR shouldn't reach this anyway
    }

    setError(null);
    setLoading(true);

    const supabase = getSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <VellumField
        label="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <VellumField
        label="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && (
        <p
          className="hand"
          style={{ margin: 0, color: 'var(--crimson)' }}
          role="alert"
          aria-live="polite"
        >
          ~ {error} ~
        </p>
      )}
      <div
        style={{
          marginTop: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          flexWrap: 'wrap',
        }}
      >
        <Hand>~ no account yet? ~</Hand>
        <BronzeButton type="submit" disabled={loading}>
          {loading ? 'opening…' : 'open the door →'}
        </BronzeButton>
      </div>
      <div
        style={{
          paddingTop: 12,
          borderTop: '1px dashed rgba(90, 63, 34, 0.3)',
          textAlign: 'center',
        }}
      >
        <Link
          href="/signup"
          style={{
            fontFamily: 'var(--font-caps)',
            fontSize: 11,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: 'var(--bronze-deep)',
            textDecoration: 'none',
            borderBottom: '1px dashed var(--bronze)',
            paddingBottom: 1,
          }}
        >
          · stamp a new name ·
        </Link>
      </div>
    </form>
  );
}
