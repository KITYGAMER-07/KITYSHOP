import React from 'react';
import { Zap, ShoppingBag, ShieldCheck } from 'lucide-react';

export const StoreSkeleton: React.FC = () => {
  return (
    <div className="relative py-8 sm:py-12 overflow-x-hidden animate-fade-in">
      {/* Background Glow Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-2/3 right-10 w-96 h-96 bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6">

        {/* Hero Tagline Skeleton */}
        <div className="text-center mb-8 sm:mb-10 flex flex-col items-center">
          <div className="h-6 w-48 rounded-full bg-slate-900 border border-slate-800 animate-pulse mb-3.5 flex items-center justify-center gap-2 px-3">
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/30 animate-ping" />
            <div className="w-24 h-2.5 rounded bg-slate-800" />
          </div>

          <div className="h-9 sm:h-12 w-3/4 max-w-lg rounded-2xl bg-slate-900 border border-slate-800/80 animate-pulse mb-3" />
          <div className="h-4 w-5/6 max-w-md rounded-lg bg-slate-900/60 animate-pulse" />
        </div>

        {/* Store Purchase Card Skeleton */}
        <div className="bg-slate-900/80 backdrop-blur-2xl border border-slate-800/90 rounded-3xl p-5 sm:p-8 shadow-2xl shadow-slate-950/80 space-y-8">
          
          {/* STEP 1: Select Product Skeleton */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-extrabold text-xs">
                1
              </div>
              <div className="h-4 w-32 rounded bg-slate-800 animate-pulse" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-start gap-3.5 animate-pulse"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-800/80 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-3/4 rounded bg-slate-800" />
                    <div className="h-2.5 w-full rounded bg-slate-900" />
                    <div className="h-4 w-16 rounded-full bg-slate-800/60" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* STEP 2: Select Duration Skeleton */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 font-extrabold text-xs">
                2
              </div>
              <div className="h-4 w-40 rounded bg-slate-800 animate-pulse" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col items-center justify-center space-y-2 animate-pulse"
                >
                  <div className="h-3.5 w-16 rounded bg-slate-800" />
                  <div className="h-4 w-20 rounded bg-slate-800/60" />
                </div>
              ))}
            </div>
          </div>

          {/* STEP 3: Customer Email & Coupon Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <div className="h-3 w-28 rounded bg-slate-800 animate-pulse mb-2" />
              <div className="h-11 rounded-xl bg-slate-950 border border-slate-800 animate-pulse" />
            </div>

            <div>
              <div className="h-3 w-28 rounded bg-slate-800 animate-pulse mb-2" />
              <div className="h-11 rounded-xl bg-slate-950 border border-slate-800 animate-pulse" />
            </div>
          </div>

          {/* Price Summary Card Skeleton */}
          <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800/90 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 rounded bg-slate-800 animate-pulse" />
              <div className="h-7 w-28 rounded bg-slate-800 animate-pulse" />
            </div>

            <div className="h-12 w-full rounded-2xl bg-emerald-500/10 border border-emerald-500/20 animate-pulse flex items-center justify-center">
              <div className="h-4 w-36 rounded bg-emerald-500/30" />
            </div>
          </div>

          {/* Security & Guarantee Footer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-center text-xs">
            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/50 flex items-center justify-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400 opacity-50" />
              <div className="h-3 w-24 rounded bg-slate-800 animate-pulse" />
            </div>
            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/50 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-400 opacity-50" />
              <div className="h-3 w-24 rounded bg-slate-800 animate-pulse" />
            </div>
            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/50 flex items-center justify-center gap-2">
              <ShoppingBag className="w-4 h-4 text-cyan-400 opacity-50" />
              <div className="h-3 w-24 rounded bg-slate-800 animate-pulse" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
