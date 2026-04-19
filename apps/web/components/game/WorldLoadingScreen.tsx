// Overlay shown while Phaser's BootScene preloads assets. Absolutely
// positioned on top of the canvas so Phaser can mount behind it; the
// overlay fades out the frame preload completes (progress === 1).
//
// Used by GameWorld in three phases:
//   - member fetch in-flight (`progress = null`, indeterminate)
//   - Phaser preload running (`progress = 0..<1`)
//   - preload complete (component unmounts)

export type WorldLoadingScreenProps = {
  readonly realmName: string;
  /** 0..1 during Phaser preload; null for pre-preload indeterminate state. */
  readonly progress: number | null;
};

export function WorldLoadingScreen({
  realmName,
  progress,
}: WorldLoadingScreenProps): React.JSX.Element {
  const pct = progress === null ? null : Math.round(progress * 100);

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 bg-slate-900 text-slate-200">
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-xs uppercase tracking-widest text-slate-500">Arcadia</p>
        <h1 className="text-3xl font-semibold tracking-tight">{realmName}</h1>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct ?? undefined}
        className="h-1 w-64 overflow-hidden rounded-full bg-slate-700"
      >
        <div
          className={
            pct === null
              ? 'h-full w-1/3 animate-pulse bg-slate-400'
              : 'h-full bg-slate-200 transition-[width] duration-200 ease-out'
          }
          style={pct === null ? undefined : { width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-slate-500">{pct === null ? 'Loading…' : `${pct}%`}</p>
    </div>
  );
}
