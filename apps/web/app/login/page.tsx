'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-100 focus:border-neutral-600 focus:outline-none"
        />
      </label>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-900 transition hover:bg-white disabled:opacity-60"
      >
        {loading ? 'Signing in…' : 'Log in'}
      </button>
      <p className="text-center text-xs text-neutral-500">
        No account?{' '}
        <Link href="/signup" className="underline hover:text-neutral-300">
          Sign up
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#0a0a0a] p-8 text-neutral-200">
      <h1 className="text-3xl font-semibold tracking-tight">Log in to Arcadia</h1>
      <Suspense fallback={<p className="text-sm text-neutral-500">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
