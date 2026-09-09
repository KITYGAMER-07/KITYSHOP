import React from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';

interface OfflineScreenProps {
  isRetrying: boolean;
  onRetry: () => void;
}

export const OfflineScreen: React.FC<OfflineScreenProps> = ({ isRetrying, onRetry }) => (
  <main className="relative min-h-screen overflow-hidden bg-slate-950 px-5 py-8 text-slate-100">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(239,68,68,0.18),transparent_31%),radial-gradient(circle_at_14%_76%,rgba(16,185,129,0.14),transparent_34%),linear-gradient(160deg,#020617_0%,#0f172a_55%,#020617_100%)]" />
    <div className="pointer-events-none absolute -top-28 -right-24 h-72 w-72 rounded-full bg-rose-500/10 blur-3xl" />
    <div className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

    <div className="relative mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-sm flex-col items-center justify-center text-center">
      <div className="relative mb-9 flex h-56 w-56 items-center justify-center">
        <div className="absolute inset-2 rounded-[3rem] border border-rose-500/20 bg-slate-900/70 shadow-2xl shadow-black/50" />
        <div className="absolute inset-7 rounded-[2.4rem] border border-emerald-500/15 bg-slate-950/80" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-rose-500/30 bg-rose-500/10 text-rose-400 shadow-xl shadow-rose-950/40">
          <WifiOff className="h-10 w-10" strokeWidth={2.3} />
        </div>
      </div>

      <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-rose-300">
        Connection required
      </span>
      <h1 className="text-3xl font-black tracking-tight text-white">No Connection</h1>
      <p className="mt-3 max-w-xs text-sm leading-6 text-slate-400">
        Turn on mobile data or Wi-Fi, then tap retry to continue to your PeakLoader Shop.
      </p>

      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-300/30 bg-emerald-500 px-6 text-sm font-black text-slate-950 shadow-lg shadow-emerald-950/40 transition hover:bg-emerald-400 active:scale-95 disabled:cursor-wait disabled:opacity-75"
      >
        <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
        {isRetrying ? 'Checking…' : 'Retry Connection'}
      </button>
      <p className="mt-4 text-xs text-slate-600">Your data and orders stay safe.</p>
    </div>
  </main>
);
