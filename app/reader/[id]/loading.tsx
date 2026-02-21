import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function ReaderLoading() {
  return (
    <div className="flex flex-col h-screen w-full bg-[#090C12] text-zinc-300 font-sans overflow-hidden">
      
      {/* ── TOP NAVBAR SKELETON ─────────────────────────────────────────────── */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 h-16 bg-[#0B0F16] border-b border-white/[0.05] z-40">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-xl text-zinc-500 bg-white/5 opacity-50">
            <ArrowLeft className="w-5 h-5" />
          </div>
          <div className="h-4 w-48 bg-white/10 rounded-md animate-pulse" />
        </div>

        <div className="flex items-center gap-3">
          <div className="h-8 w-24 bg-white/5 rounded-lg animate-pulse" />
          <div className="h-8 w-8 bg-white/5 rounded-lg animate-pulse" />
        </div>
      </header>

      {/* ── MAIN CONTENT AREA ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden relative flex flex-col lg:flex-row">
        
        {/* Sidebar Skeleton (Hidden on mobile by default) */}
        <aside className="hidden lg:flex flex-col w-72 bg-[#0B0E16] border-r border-white/5 h-full shrink-0">
          <div className="p-4 border-b border-white/5">
            <div className="h-3 w-20 bg-white/10 rounded-sm mb-4" />
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500/20 w-1/4" />
            </div>
          </div>
          <div className="flex-1 p-2 space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-14 w-full bg-white/[0.02] rounded-xl flex items-center px-4 animate-pulse">
                <div className="h-3 w-16 bg-white/5 rounded-sm" />
              </div>
            ))}
          </div>
        </aside>

        {/* Reader Stage Skeleton */}
        <div className="flex-1 h-full overflow-hidden relative flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-3xl space-y-6 opacity-30">
            {/* Mock title */}
            <div className="h-6 w-3/4 bg-white/10 rounded-lg animate-pulse mx-auto mb-12" />
            
            {/* Mock paragraphs */}
            {[1, 2, 3].map((pKey) => (
              <div key={pKey} className="space-y-3 mb-8">
                <div className="h-4 w-full bg-white/5 rounded-md animate-pulse" />
                <div className="h-4 w-11/12 bg-white/5 rounded-md animate-pulse" />
                <div className="h-4 w-full bg-white/5 rounded-md animate-pulse" />
                <div className="h-4 w-4/5 bg-white/5 rounded-md animate-pulse" />
                <div className="h-4 w-full bg-white/5 rounded-md animate-pulse" />
                <div className="h-4 w-2/3 bg-white/5 rounded-md animate-pulse" />
              </div>
            ))}
          </div>

          {/* Floating UI Capsule Skeleton */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[320px] h-14 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-between px-4 animate-pulse z-50">
            <div className="w-8 h-8 rounded-lg bg-white/10" />
            <div className="w-8 h-8 rounded-lg bg-white/10" />
            <div className="w-12 h-6 rounded-md bg-white/10" />
            <div className="w-8 h-8 rounded-lg bg-white/10" />
            <div className="w-10 h-10 rounded-xl bg-indigo-500/30" />
          </div>
        </div>
      </div>
    </div>
  );
}
