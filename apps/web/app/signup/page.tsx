'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#0a0a0a] p-8 text-neutral-200">
      <h1 className="text-3xl font-semibold tracking-tight">Create an Arcadia account</h1>
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-400">Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-100 focus:border-neutral-600 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-400">Password</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-100 focus:border-neutral-600 focus:outline-none"
          />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {info && <p className="text-sm text-emerald-400">{info}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-900 transition hover:bg-white disabled:opacity-60"
        >
          {loading ? 'Creating…' : 'Sign up'}
        </button>
        <p className="text-center text-xs text-neutral-500">
          Already have an account?{' '}
          <Link href="/login" className="underline hover:text-neutral-300">
            Log in
          </Link>
        </p>
      </form>
    </main>
  );
}
