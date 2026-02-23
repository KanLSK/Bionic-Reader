'use client';

import React, { useEffect, useState, useMemo } from 'react';
import TopNav from './TopNav';
import { BarChart2, TrendingUp, Zap, Clock, Activity, Target, BrainCircuit, Info, X } from 'lucide-react';
import { getSmarterIndexAction } from '@/app/actions/analytics';

const METRIC_INFO = {
  si: {
    title: "Smarter Index",
    description: "The Smarter Index is a composite score measuring your overall cognitive growth and learning effectiveness. It weighs your Reading Efficiency (40%), Retention Stability (40%), and Consistency (20%) into a single 0-100 metric. A rising score means you are reading faster, understanding more, and retaining it longer."
  },
  re: {
    title: "Reading Efficiency",
    description: "Reading Efficiency evaluates how fast you read paired with how well you comprehend. It calculates your effective Words Per Minute (WPM) multiplied by your average flashcard accuracy, and penalizes regressions (jumping back to re-read text). A high score reflects smooth, fast, and high-comprehension reading."
  },
  rs: {
    title: "Retention Stability",
    description: "Retention Stability measures the strength of your memory over time based on the Spaced Repetition (SM-2) algorithm. It tracks the average interval length between flashcard reviews. A higher score means your brain is successfully committing information to long-term memory, requiring less frequent reviews."
  },
  c: {
    title: "Consistency",
    description: "Consistency tracks your learning habits. It measures how many days out of the last 7 you actively read a document or completed your daily flashcard reviews. Regular, consistent learning is key to maintaining a high Smarter Index and building long-term cognitive endurance."
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
  reScore: number;
  rsScore: number;
  cScore: number;
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

// ── Metric Dial Component ────────────────────────────────────────────────
function MetricDial({ label, score, icon: Icon, colorClass, gradientFrom, gradientTo, onInfoClick }: { label: string, score: number, icon: any, colorClass: string, gradientFrom: string, gradientTo: string, onInfoClick?: () => void }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center p-6 bg-[#0A0D14] rounded-2xl border border-white/[0.05] relative overflow-hidden group">
      <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${gradientFrom} ${gradientTo} opacity-20`} />
      
      <div className="relative mb-4 flex items-center justify-center">
        <svg className="w-24 h-24 transform -rotate-90">
          <circle cx="48" cy="48" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="transparent" />
          <circle 
            cx="48" cy="48" r={radius} 
            stroke="currentColor" 
            strokeWidth="6" 
            fill="transparent" 
            strokeDasharray={circumference} 
            strokeDashoffset={offset} 
            className={`${colorClass} transition-all duration-1000 ease-out`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black text-white">{Math.round(score)}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-1.5 mb-1 z-10">
        <Icon className={`w-3.5 h-3.5 ${colorClass}`} />
        <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">{label}</h4>
        {onInfoClick && (
          <button onClick={onInfoClick} className="text-zinc-500 hover:text-white transition-colors -ml-0.5" title={`Info about ${label}`}>
            <Info className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────
export default function AnalyticsPage({ user }: AnalyticsPageProps) {
  const [data, setData] = useState<SI_Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [infoModalKey, setInfoModalKey] = useState<keyof typeof METRIC_INFO | null>(null);

  useEffect(() => {
    getSmarterIndexAction().then(res => {
      if (res.success) {
        setData(res);
      }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090C12] text-white flex items-center justify-center">
        <div className="text-zinc-500 font-medium">Crunching metrics...</div>
      </div>
    );
  }

  const currentSnapshot = data?.current || { siScore: 0, reScore: 0, rsScore: 0, cScore: 0 };
  const history = data?.history || [];

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
              <span className="text-base font-semibold text-zinc-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg tracking-normal cursor-help" onClick={() => setInfoModalKey('si')} title="Info about Smarter Index">
                {Math.round(currentSnapshot.siScore)}
              </span>
              <button onClick={() => setInfoModalKey('si')} className="text-zinc-500 hover:text-white transition-colors" title="Info about Smarter Index">
                <Info className="w-5 h-5" />
              </button>
            </h1>
            <p className="text-sm font-medium text-zinc-400 mt-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-white font-semibold">{weeklyChangeStr}</span>
            </p>
          </div>
        </div>

        {/* Core Sub-Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <MetricDial 
            label="Reading Efficiency" 
            score={currentSnapshot.reScore} 
            icon={Zap} 
            colorClass="text-amber-400" 
            gradientFrom="from-amber-500" 
            gradientTo="to-orange-500" 
            onInfoClick={() => setInfoModalKey('re')}
          />
          <MetricDial 
            label="Retention Stability" 
            score={currentSnapshot.rsScore} 
            icon={Target} 
            colorClass="text-emerald-400" 
            gradientFrom="from-emerald-500" 
            gradientTo="to-teal-500" 
            onInfoClick={() => setInfoModalKey('rs')}
          />
          <MetricDial 
            label="Consistency" 
            score={currentSnapshot.cScore} 
            icon={Clock} 
            colorClass="text-blue-400" 
            gradientFrom="from-blue-500" 
            gradientTo="to-sky-500" 
            onInfoClick={() => setInfoModalKey('c')}
          />
        </div>

        {/* Main Growth Graph */}
        <TrendGraph history={history} />

      </main>
    </div>
  );
}
