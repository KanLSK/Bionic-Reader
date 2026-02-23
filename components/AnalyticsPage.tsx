'use client';

import React, { useEffect, useState, useMemo } from 'react';
import TopNav from './TopNav';
import { TrendingUp, Clock, Activity, Target, BrainCircuit, Info, X } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { getSmarterIndexAction, getCognitiveProfileAction, generateCognitiveInsightsAction } from '@/app/actions/analytics';

const METRIC_INFO = {
  si: {
    title: "Smarter Index",
    description: "The Smarter Index is a composite score measuring your overall cognitive growth. It weighs your Processing Speed (30%), Retention Stability (30%), Focus Stability (20%), and Concept Integration (20%)."
  },
  psi: {
    title: "Processing Speed Index (PSI)",
    description: "Processing Speed evaluates how fast you read paired with how well you comprehend, measured in Effective Words Per Minute (EWPM). It normalizes your speed and accuracy into a 0-100 scale."
  },
  rsi: {
    title: "Retention Stability Index (RSI)",
    description: "Retention Stability measures the strength of your memory over time based on the Spaced Repetition (SM-2) algorithm. It tracks the average interval length between flashcard reviews and your recall consistency."
  },
  fsi: {
    title: "Focus Stability Index (FSI)",
    description: "Focus tracks your behavioral endurance. It penalizes frequent regressions (jumping back to re-read text) and high frequencies of micro-pauses, rewarding long, sustained blocks of deep work."
  },
  cii: {
    title: "Concept Integration Index (CII)",
    description: "Concept Integration tracks how well you connect dots across different documents. It measures your systemic mastery of Concept Clusters over time."
  }
};

// ── Info Modal Component ────────────────────────────────────────────────
function InfoModal({ title, description, onClose }: { title: string, description: string, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0F1318] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Info className="w-5 h-5 text-indigo-400" />
              {title}
            </h3>
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed font-medium">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

interface AnalyticsPageProps {
  user: { firstName: string | null };
}

interface SI_Snapshot {
  _id: string;
  date: string;
  siScore: number;
  psiScore: number;
  rsiScore: number;
  fsiScore: number;
  ciiScore: number;
}

interface SI_Data {
  current?: SI_Snapshot;
  history: SI_Snapshot[];
}

// ── SVG Area Chart Component ───────────────────────────────────────────────
function TrendGraph({ history }: { history: SI_Snapshot[] }) {
  if (!history || history.length < 2) {
    return (
      <div className="w-full h-48 flex items-center justify-center text-zinc-600 border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
        <p className="text-sm font-medium">Not enough data for trend graph</p>
      </div>
    );
  }

  // Define SVG coordinate space
  const width = 800;
  const height = 240;
  const paddingX = 40;
  const paddingY = 40;

  const minScore = Math.max(0, Math.min(...history.map(d => d.siScore)) - 10);
  const maxScore = Math.min(100, Math.max(...history.map(d => d.siScore)) + 10);
  
  const scoreRange = Math.max(1, maxScore - minScore);
  const timeRange = new Date(history[history.length - 1].date).getTime() - new Date(history[0].date).getTime();

  const getX = (dateStr: string) => {
    if (timeRange === 0) return paddingX;
    const t = new Date(dateStr).getTime() - new Date(history[0].date).getTime();
    return paddingX + (t / timeRange) * (width - paddingX * 2);
  };

  const getY = (score: number) => {
    return height - paddingY - ((score - minScore) / scoreRange) * (height - paddingY * 2);
  };

  // Build SVG Path
  const points = history.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(d.date)} ${getY(d.siScore)}`).join(' ');
  const areaPath = `${points} L ${getX(history[history.length - 1].date)} ${height - paddingY} L ${getX(history[0].date)} ${height - paddingY} Z`;

  return (
    <div className="w-full overflow-hidden bg-[#0A0D14] rounded-2xl border border-white/[0.05] p-6 relative">
      <h3 className="text-sm font-bold text-zinc-200 mb-6 flex items-center gap-2">
        <Activity className="w-4 h-4 text-indigo-400" />
        30-Day Growth
      </h3>
      <div className="relative w-full aspect-[21/9] sm:aspect-[3/1]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 0.5, 1].map(pct => {
            const y = height - paddingY - pct * (height - paddingY * 2);
            return (
              <g key={pct}>
                <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                <text x={paddingX - 10} y={y + 4} fill="#52525b" fontSize="12" textAnchor="end" fontFamily="sans-serif">
                  {Math.round(minScore + pct * scoreRange)}
                </text>
              </g>
            );
          })}
          
          {/* Fill Area */}
          <path d={areaPath} fill="url(#gradient)" opacity={0.3} />
          
          {/* Line */}
          <path d={points} fill="none" stroke="#818cf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          
          {/* Dots */}
          {history.map((d, i) => (
            <circle key={i} cx={getX(d.date)} cy={getY(d.siScore)} r="4" fill="#090C12" stroke="#818cf8" strokeWidth="2" />
          ))}

          {/* Defs */}
          <defs>
            <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <>
      {/* Top Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Radar Chart */}
        <div className="lg:col-span-1 bg-[#0A0D14] rounded-2xl border border-white/[0.05] p-6 relative flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-full aspect-square max-w-[280px] rounded-full bg-white/[0.03] border border-white/[0.05] animate-pulse" />
        </div>

        {/* Coaching & Metrics */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Prescriptive Insights Feed */}
          <div className="bg-[#0A0D14] rounded-2xl border border-white/[0.05] p-6 flex-1 flex flex-col">
            <div className="h-5 w-40 bg-white/10 rounded animate-pulse mb-6" />
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex gap-3">
                   <div className="w-5 h-5 rounded bg-indigo-500/20 animate-pulse shrink-0" />
                   <div className="h-4 w-full bg-indigo-500/20 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          {/* Velocity Stats */}
          <div className="grid grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="bg-[#0A0D14] rounded-2xl border border-white/[0.05] p-5 flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-3 w-24 bg-white/10 rounded mb-3 animate-pulse" />
                  <div className="h-8 w-16 bg-white/20 rounded animate-pulse" />
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] animate-pulse" />
              </div>
            ))}
          </div>
          
        </div>
      </div>

      {/* Main Growth Graph */}
      <div className="h-[400px] w-full bg-[#0A0D14] rounded-2xl border border-white/[0.05] mb-20 flex pt-10 px-8">
         <div className="w-full h-full border-b border-l border-white/10 relative">
           <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-1/2 bg-gradient-to-t from-blue-500/5 to-transparent animate-pulse" />
           </div>
         </div>
      </div>
    </>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────

export default function AnalyticsPage({ user }: AnalyticsPageProps) {
  const [data, setData] = useState<SI_Data | null>(null);
  const [profile, setProfile] = useState<{ retentionHalfLifeCurrent?: number; accelerationRate?: string } | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [infoModalKey, setInfoModalKey] = useState<keyof typeof METRIC_INFO | null>(null);

  useEffect(() => {
    Promise.all([
      getSmarterIndexAction(),
      getCognitiveProfileAction(),
      generateCognitiveInsightsAction()
    ]).then(([siRes, profileRes, insightsRes]) => {
      if (siRes.success) setData(siRes);
      if (profileRes.success) setProfile(profileRes.profile);
      if (insightsRes.success) setInsights(insightsRes.insights);
      setLoading(false);
    });
  }, []);

  const weeklyChangeStr = useMemo(() => {
    if (!data || data.history.length < 2) return "Establishing your baseline this week.";
    
    const current = data.current?.siScore || 0;
    // Find a snapshot from ~7 days ago, or just use the oldest we have if less than 7 days
    const pastSpan = data.history.length > 7 ? data.history[data.history.length - 8] : data.history[0];
    
    if (!pastSpan || current === 0) return "Establishing your baseline this week.";
    
    const diff = current - pastSpan.siScore;
    const percentChange = (diff / (pastSpan.siScore || 1)) * 100;

    if (Math.abs(percentChange) < 1) return "Your Smarter Index is holding perfectly steady.";
    if (percentChange > 0) return `Your Smarter Index increased ${Math.round(percentChange)}% this week.`;
    return `Your Smarter Index dipped ${Math.abs(Math.round(percentChange))}% this week.`;
  }, [data]);

  const { current: currentData, history: historyData } = data || {};
  const currentSnapshot = useMemo(() => currentData || { siScore: 0, psiScore: 0, rsiScore: 0, fsiScore: 0, ciiScore: 0 }, [currentData]);
  const history = historyData || [];

  const radarData = useMemo(() => {
    return [
      { subject: 'Processing Speed', A: currentSnapshot.psiScore || 0, fullMark: 100, key: 'psi' },
      { subject: 'Retention Stability', A: currentSnapshot.rsiScore || 0, fullMark: 100, key: 'rsi' },
      { subject: 'Concept Integration', A: currentSnapshot.ciiScore || 0, fullMark: 100, key: 'cii' },
      { subject: 'Focus Stability', A: currentSnapshot.fsiScore || 0, fullMark: 100, key: 'fsi' },
    ];
  }, [currentSnapshot]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090C12] text-white flex items-center justify-center">
        <div className="text-zinc-500 font-medium">Crunching metrics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090C12] text-white font-sans selection:bg-indigo-500/30">
      {infoModalKey && (
        <InfoModal 
          title={METRIC_INFO[infoModalKey].title} 
          description={METRIC_INFO[infoModalKey].description} 
          onClose={() => setInfoModalKey(null)} 
        />
      )}
      <TopNav activePage="Analytics" user={user} />

      <main className="max-w-6xl mx-auto px-6 py-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BrainCircuit className="w-5 h-5 text-indigo-400" />
              <p className="text-[11px] text-indigo-400 font-bold tracking-[0.15em] uppercase">
                Cognitive Performance
              </p>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
              Smarter Index
              <span className="text-base font-semibold text-zinc-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg tracking-normal cursor-help flex items-center" onClick={() => setInfoModalKey('si')} title="Info about Smarter Index">
                {loading ? <div className="w-6 h-5 bg-white/10 animate-pulse rounded" /> : Math.round(currentSnapshot.siScore)}
              </span>
              <button onClick={() => setInfoModalKey('si')} className="text-zinc-500 hover:text-white transition-colors" title="Info about Smarter Index">
                <Info className="w-5 h-5" />
              </button>
            </h1>
            <p className="text-sm font-medium text-zinc-400 mt-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-white font-semibold flex items-center">
                {loading ? <div className="w-64 h-4 bg-white/10 animate-pulse rounded" /> : weeklyChangeStr}
              </span>
            </p>
          </div>
        </div>

        {loading ? <AnalyticsSkeleton /> : (
          <>
            {/* Top Widgets Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              
              {/* Radar Chart */}
              <div className="lg:col-span-1 bg-[#0A0D14] rounded-2xl border border-white/[0.05] p-6 relative flex flex-col items-center">
                <h3 className="text-sm font-bold text-zinc-200 w-full text-left mb-2 flex items-center justify-between">
                  Cognitive Profile Radar
                </h3>
                <div className="w-full aspect-square max-w-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke="rgba(255,255,255,0.1)" />
                      <PolarAngleAxis 
                        dataKey="subject" 
                        tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 600 }} 
                      />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="Cognitive Profile" dataKey="A" stroke="#818cf8" fill="#818cf8" fillOpacity={0.4} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="flex gap-4 mt-2 justify-center w-full">
                  {radarData.map((rd) => (
                    <button 
                      key={rd.key}
                      onClick={() => setInfoModalKey(rd.key as keyof typeof METRIC_INFO)}
                      className="px-2 py-1 rounded bg-white/[0.03] hover:bg-white/[0.08] text-xs font-medium text-zinc-400 border border-white/5 transition-colors"
                    >
                      {Math.round(rd.A)} {rd.key.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Coaching & Metrics */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                
                {/* Prescriptive Insights Feed */}
                <div className="bg-[#0A0D14] rounded-2xl border border-white/[0.05] p-6 flex-1 flex flex-col">
                  <h3 className="text-sm font-bold text-zinc-200 mb-4 flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4 text-indigo-400" />
                    Adaptive Coaching
                  </h3>
                  <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {insights.length > 0 ? insights.map((insight, idx) => (
                      <div key={idx} className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 text-sm text-indigo-100 font-medium leading-relaxed flex items-start gap-3">
                        <div className="mt-0.5 bg-indigo-500/20 p-1.5 rounded-lg shrink-0">
                          <Target className="w-3.5 h-3.5 text-indigo-300" />
                        </div>
                        {insight}
                      </div>
                    )) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-sm">
                        Gathering data to formulate coaching insights...
                      </div>
                    )}
                  </div>
                </div>

                {/* Velocity Stats */}
                {profile && (
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-[#0A0D14] rounded-2xl border border-white/[0.05] p-5 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase mb-1">Memory Half-Life</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-white">{profile.retentionHalfLifeCurrent}</span>
                          <span className="text-sm text-zinc-400 font-medium">Days</span>
                        </div>
                      </div>
                      <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.05]">
                        <Clock className="w-5 h-5 text-emerald-400" />
                      </div>
                    </div>
                    
                    <div className="bg-[#0A0D14] rounded-2xl border border-white/[0.05] p-5 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase mb-1">Growth Trajectory</p>
                        <div className="flex items-baseline gap-2">
                          <span className={`text-xl font-bold ${profile.accelerationRate === 'Accelerating' ? 'text-indigo-400' : profile.accelerationRate === 'Declining' ? 'text-red-400' : 'text-zinc-200'}`}>
                            {profile.accelerationRate}
                          </span>
                        </div>
                      </div>
                      <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.05]">
                        <Activity className={`w-5 h-5 ${profile.accelerationRate === 'Accelerating' ? 'text-indigo-400' : 'text-zinc-400'}`} />
                      </div>
                    </div>
                  </div>
                )}
                
              </div>
            </div>

            {/* Main Growth Graph */}
            <TrendGraph history={history} />
          </>
        )}

      </main>
    </div>
  );
}
