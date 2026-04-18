export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0a0a0a] p-8 text-center text-neutral-200">
      <h1 className="text-5xl font-semibold tracking-tight">Arcadia</h1>
      <p className="max-w-md text-neutral-400">
        A 2.5D isometric virtual world for creators and their communities. MVP under construction —
        Phase 0: Foundation.
      </p>
      <p className="text-xs text-neutral-600">
        See <code className="rounded bg-neutral-900 px-1 py-0.5">/api/health</code> for service
        status.
      </p>
    </main>
  );
}
