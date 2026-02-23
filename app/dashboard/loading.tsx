import React from 'react';
import TopNav from '@/components/TopNav';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#090C12] text-white font-sans">
      <TopNav activePage="Dashboard" user={{ firstName: null }} />

      {/* ── Performance Header Skeleton ──────────────────────────────────────── */}
      <div className="relative border-b border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-950/40 via-transparent to-violet-950/30 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-8 py-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div>
              <div className="h-3 w-40 bg-blue-500/20 rounded mb-2 animate-pulse" />
              <div className="h-8 w-64 bg-white/10 rounded animate-pulse" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex-1 min-w-[100px] sm:flex-none flex items-center gap-2.5 bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-2.5">
                <div className="w-4 h-4 rounded bg-blue-500/20 animate-pulse flex-shrink-0" />
                <div>
                  <div className="h-2.5 w-16 bg-white/10 rounded mb-1.5 animate-pulse" />
                  <div className="h-4 w-12 bg-white/20 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-10 pb-20">
        <div className="flex flex-col xl:flex-row gap-8">
          
          {/* Main Content Skeleton */}
          <div className="flex-1 flex flex-col gap-10">
            {/* Hero Document Skeleton */}
            <section className="relative">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center animate-pulse" />
                  <div className="h-6 w-48 bg-white/10 rounded animate-pulse" />
                </div>
              </div>
              
              <div className="relative bg-[#0d111a] border border-white/10 rounded-2xl p-6 sm:p-8 flex items-center justify-between gap-8 h-40">
                <div className="flex-1 flex items-center gap-6">
                  <div className="w-16 h-20 bg-white/10 rounded-lg animate-pulse" />
                  <div className="flex flex-col gap-3">
                    <div className="h-6 w-48 bg-white/10 rounded animate-pulse" />
                    <div className="h-4 w-32 bg-white/5 rounded animate-pulse" />
                    <div className="h-2 w-64 bg-white/5 rounded-full mt-2 animate-pulse" />
                  </div>
                </div>
                <div className="h-12 w-32 bg-indigo-500/20 rounded-xl animate-pulse" />
              </div>
            </section>

            {/* Recent Documents Grid Skeleton */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 animate-pulse" />
                  <div className="h-6 w-40 bg-white/10 rounded animate-pulse" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex flex-col bg-[#0b0f17] border border-white/5 rounded-2xl p-5 hover:bg-[#11151e] h-48">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 animate-pulse" />
                      <div className="w-8 h-8 rounded-xl bg-white/5 animate-pulse" />
                    </div>
                    <div className="h-5 w-3/4 bg-white/10 rounded mb-2 animate-pulse" />
                    <div className="h-3 w-1/2 bg-white/5 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </section>
          </div>
          
        </div>
      </div>
    </div>
  );
}
