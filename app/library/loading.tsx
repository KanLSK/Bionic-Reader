import React from 'react';
import TopNav from '@/components/TopNav';

export default function LibraryLoading() {
  return (
    <div className="min-h-screen bg-[#0a0d14] text-white selection:bg-blue-500/30 font-sans">
      <TopNav activePage="library" user={{ firstName: null }} />
      
      <div className="max-w-[1600px] mx-auto pt-24 px-4 sm:px-6 lg:px-8 pb-12 flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Skeleton */}
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-8">
          <div>
            <div className="h-4 w-32 bg-white/5 rounded-md mb-4 animate-pulse" />
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 w-full bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
          <div>
            <div className="h-4 w-16 bg-white/5 rounded-md mb-4 animate-pulse" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-8 w-16 bg-white/5 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </aside>

        {/* Main Panel Skeleton */}
        <main className="flex flex-col w-full min-w-0">
          
          {/* Top Info Bar Skeleton */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div className="flex-1">
              <div className="h-10 w-64 bg-white/10 rounded-xl mb-3 animate-pulse" />
              <div className="h-4 w-96 bg-white/5 rounded-md animate-pulse" />
            </div>
            <div className="h-11 w-40 bg-zinc-800 rounded-xl animate-pulse" />
          </div>

          {/* Control Strip Skeleton */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-[#12161f] p-3 rounded-2xl border border-white/5">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="h-9 w-64 bg-white/5 border border-white/5 rounded-xl animate-pulse" />
              <div className="h-9 w-32 bg-white/5 border border-white/5 rounded-xl animate-pulse" />
              <div className="h-9 w-40 bg-white/5 border border-white/5 rounded-xl animate-pulse" />
            </div>
            <div className="flex items-center gap-1 bg-black/40 rounded-xl p-1 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-[#2a3241] animate-pulse" />
              <div className="w-8 h-8 rounded-lg bg-zinc-800/50 animate-pulse" />
            </div>
          </div>

          {/* Grid View Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="flex flex-col justify-between p-5 rounded-3xl border border-white/[0.07] bg-[#12161f] h-48 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 animate-pulse" />
                    <div className="w-8 h-8 rounded-lg bg-white/5 animate-pulse" />
                  </div>
                  <div className="h-5 w-3/4 bg-white/10 rounded-md mb-2 animate-pulse" />
                  <div className="h-3 w-1/2 bg-white/5 rounded-md animate-pulse" />
                </div>
                <div className="relative z-10 pt-4 border-t border-white/[0.05] mt-auto flex items-center justify-between">
                  <div className="h-8 w-24 bg-white/5 rounded-full animate-pulse" />
                  <div className="h-4 w-20 bg-white/5 rounded-full animate-pulse" />
                </div>
              </div>
            ))}
          </div>

        </main>
      </div>
    </div>
  );
}
