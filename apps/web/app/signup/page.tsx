// `/signup` — new-name doorway. Matches /login's scroll form shape but
// uses a wax drop-cap + wax submit button so "stamping a new name"
// reads as the heavier, one-way action.

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  Desk,
  DropCap,
  Hand,
  Kicker,
  NightRoom,
  ScrollCard,
  VellumField,
  WaxButton,
} from '@/components/scriptorium';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function SignupPage(): React.JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    const supabase = getSupabaseBrowserClient();
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // When email-confirmation is enabled in Supabase Auth (default), signUp
    // returns a user but no session — the user must click the verification
    // link before signing in. Show that hint so the UX isn't confusing.
    if (data.session) {
      router.push('/');
      router.refresh();
    } else {
      setInfo('Check your email to confirm the address, then log in.');
    }
  }

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
                <DropCap letter="N" variant="wax" />
                <div style={{ flex: 1 }}>
                  <Kicker>a new name</Kicker>
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
                    Stamp your mark.
                  </h1>
                  <Hand>~ enrolment is free while we&rsquo;re in beta ~</Hand>
                </div>
              </header>

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
                  autoComplete="new-password"
                  required
                  minLength={8}
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
                {info && (
                  <p
                    className="hand"
                    style={{ margin: 0, color: 'var(--verdigris-2)' }}
                    role="status"
                    aria-live="polite"
                  >
                    ~ {info} ~
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
                  <Hand>~ already a scribe here? ~</Hand>
                  <WaxButton type="submit" disabled={loading}>
                    {loading ? 'sealing…' : 'seal the pact'}
                  </WaxButton>
                </div>
                <div
                  style={{
                    paddingTop: 12,
                    borderTop: '1px dashed rgba(90, 63, 34, 0.3)',
                    textAlign: 'center',
                  }}
                >
                  <Link
                    href="/login"
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
                    · open the door ·
                  </Link>
                </div>
              </form>
            </ScrollCard>
          </div>
        </div>
      </Desk>
    </NightRoom>
  );
}
