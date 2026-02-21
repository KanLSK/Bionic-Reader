'use client';

import React from 'react';
import TopNav from './TopNav';
import { BarChart2, TrendingUp, Zap, Clock } from 'lucide-react';

interface AnalyticsPageProps {
  user: { firstName: string | null };
}

export default function AnalyticsPage({ user }: AnalyticsPageProps) {
  return (
    <div className="min-h-screen bg-[#090C12] text-white font-sans">
      <TopNav activePage="Analytics" user={user} />

      <main className="max-w-7xl mx-auto px-8 py-10">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-[11px] text-blue-400 font-bold tracking-[0.15em] uppercase mb-1.5">
              Performance Insights
            </p>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Detailed Analytics
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Dive deep into your reading habits and improvements over time.
            </p>
          </div>
        </div>

        {/* Coming soon placeholder */}
        <div className="rounded-2xl border border-dashed border-white/8 bg-white/[0.02] flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mb-5">
            <BarChart2 className="w-6 h-6 text-blue-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Deep Analytics Coming Soon</h3>
          <p className="text-sm text-zinc-500 max-w-sm leading-relaxed mb-6">
            We are building incredibly detailed charts to map your reading speed against comprehension. Watch this space!
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl opacity-50">
             {[
               { icon: Zap, label: 'Highest WPM', value: '412', col: 'text-blue-400' },
               { icon: Clock, label: 'Total Time', value: '18.4h', col: 'text-emerald-400' },
               { icon: TrendingUp, label: 'Progression', value: '+34%', col: 'text-violet-400' },
               { icon: BarChart2, label: 'Documents', value: '24', col: 'text-orange-400' },
             ].map(({ icon: Icon, label, value, col }) => (
                <div key={label} className="bg-[#0F1318] border border-white/[0.05] rounded-xl p-4 flex flex-col items-center justify-center">
                  <Icon className={`w-5 h-5 ${col} mb-2`} />
                  <p className="text-xl font-extrabold text-white">{value}</p>
                  <p className="text-[10px] text-zinc-500 uppercase">{label}</p>
                </div>
             ))}
          </div>
        </div>
      </main>
    </div>
  );
}
