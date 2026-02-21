'use client';

import React, { useState, useEffect } from 'react';
import TopNav from './TopNav';
import {
  Brain, Play, CheckCircle2, RotateCcw, Target,
  Search, Filter, Clock, X, Award,
  BookOpen, Sparkles, ChevronDown, Activity, AlertCircle
} from 'lucide-react';

interface FlashcardsPageProps {
  user: { firstName: string | null };
}

// ── Mock Data ─────────────────────────────────────────────────────────────
const DOCUMENTS = [
  { id: '1', filename: 'Biochemistry_Metabolism.pdf', totalCards: 142, dueToday: 12, weakCards: 5 },
  { id: '2', filename: 'Distributed_Systems_Ch4.pdf', totalCards: 86, dueToday: 4, weakCards: 8 },
  { id: '3', filename: 'Neuroscience_Action_Potentials.pdf', totalCards: 54, dueToday: 2, weakCards: 1 },
];

const MOCK_FLASHCARDS = [
  { id: '1', docId: '1', document: 'Biochemistry_Metabolism.pdf', checkpoint: '15%', question: 'What is the primary rate-limiting enzyme of the TCA cycle?', answer: 'Isocitrate dehydrogenase.', mastery: 'New', nextReview: 'Today' },
  { id: '2', docId: '2', document: 'Distributed_Systems_Ch4.pdf', checkpoint: '45%', question: 'How does a vector clock prevent causality violations?', answer: 'It tracks the partial ordering of events across different nodes by incrementing a local counter upon every internal event.', mastery: 'Weak', nextReview: 'Today' },
  { id: '3', docId: '1', document: 'Biochemistry_Metabolism.pdf', checkpoint: '30%', question: 'Which enzyme catalyzes the committed step of glycolysis?', answer: 'Phosphofructokinase-1 (PFK-1).', mastery: 'Learning', nextReview: 'Tomorrow' },
  { id: '4', docId: '3', document: 'Neuroscience_Action_Potentials.pdf', checkpoint: '60%', question: 'What ion is responsible for the depolarization phase?', answer: 'Sodium (Na+).', mastery: 'Mature', nextReview: 'In 4 days' },
  { id: '5', docId: '2', document: 'Distributed_Systems_Ch4.pdf', checkpoint: '90%', question: 'What is the difference between sequential and random I/O?', answer: 'Sequential accesses contiguous blocks (faster), random accesses non-contiguous (slower).', mastery: 'Mature', nextReview: 'In 12 days' },
];

const MASTERY_DISTRIBUTION = [
  { label: 'New', pct: 15, color: '#3b82f6' },      // Blue
  { label: 'Learning', pct: 25, color: '#8b5cf6' }, // Violet
  { label: 'Mature', pct: 50, color: '#10b981' },   // Emerald
  { label: 'Weak', pct: 10, color: '#f43f5e' }      // Rose
];

const ACCURACY_TREND = [65, 68, 72, 70, 78, 85, 82]; // Last 7 sessions

// ── Shared Components ─────────────────────────────────────────────────────
function Sparkline({ data, color = '#8b5cf6' }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = (max - min) || 1;
  const w = 200, h = 40;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full preserve-3d flex-shrink-0" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineGlow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M0,${h} L${pts[0]} L${pts.join(' L')} L${w},${h} Z`} fill="url(#lineGlow)" />
      <path d={`M${pts[0]} L${pts.join(' L')}`} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MasteryPill({ type }: { type: string }) {
  const colors: Record<string, string> = {
    'New': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Learning': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    'Mature': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Weak': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase border ${colors[type]}`}>
      {type}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function FlashcardsPage({ user }: FlashcardsPageProps) {
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewModeDocId, setReviewModeDocId] = useState<string | 'ALL'>('ALL'); // 'ALL' = Mixed mode
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionProgress, setSessionProgress] = useState(0);
  const [timer, setTimer] = useState(0);

  const reviewQueue = MOCK_FLASHCARDS.filter(c => c.nextReview === 'Today' && (reviewModeDocId === 'ALL' || c.docId === reviewModeDocId));
  const totalCardsDue = MOCK_FLASHCARDS.filter(c => c.nextReview === 'Today').length;
  const totalWeak = MOCK_FLASHCARDS.filter(c => c.mastery === 'Weak').length;

  // Session Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isReviewing) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isReviewing]);

  const startReview = (docId: string | 'ALL') => {
    setReviewModeDocId(docId);
    setIsReviewing(true);
    setCurrentIdx(0);
    setIsFlipped(false);
    setTimer(0);
    setSessionProgress(0);
  };

  const handleAnswer = () => {
    // In a real app, send quality rating to SRS algo
    if (currentIdx < reviewQueue.length - 1) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIdx(i => i + 1);
        setSessionProgress(((currentIdx + 1) / reviewQueue.length) * 100);
      }, 150); // Small delay for smooth transition
    } else {
      // Finished queue
      setIsReviewing(false);
      setSessionProgress(100);
    }
  };

  const currentCard = reviewQueue[currentIdx];

  // ── REVIEW MODE RENDER ──────────────────────────────────────────────────
  if (isReviewing) {
    return (
      <div className="min-h-screen bg-[#090C12] text-white font-sans overflow-x-hidden selection:bg-indigo-500/30 flex flex-col items-center">
        {/* Review Context Header */}
        <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-3 border-b border-white/[0.05] bg-[#0A0D15]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex-shrink-0 w-6 h-6 rounded bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <Brain className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <span className="hidden sm:inline text-[11px] font-bold uppercase tracking-widest text-zinc-500 flex-shrink-0">Reviewing</span>
            <div className="hidden sm:block h-4 w-px bg-white/10 flex-shrink-0" />
            <select 
              value={reviewModeDocId}
              onChange={(e) => {
                setReviewModeDocId(e.target.value);
                setCurrentIdx(0);
                setIsFlipped(false);
                setSessionProgress(0);
              }}
              className="bg-transparent text-sm font-semibold text-zinc-200 outline-none hover:text-white transition-colors cursor-pointer appearance-none pr-4 w-full truncate"
            >
              <option value="ALL" className="bg-[#0F1520]">Mixed Mode (All Documents)</option>
              {DOCUMENTS.map(d => (
                <option key={d.id} value={d.id} className="bg-[#0F1520]">{d.filename}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center justify-between sm:justify-start gap-6">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
              <Clock className="w-3.5 h-3.5" /> 
              {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
              <Target className="w-3.5 h-3.5" /> 
              {currentIdx + 1} / {reviewQueue.length}
            </div>
            <button onClick={() => setIsReviewing(false)} className="text-zinc-500 hover:text-white transition-colors p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-0.5 bg-white/5 relative">
          <div 
            className="absolute top-0 left-0 h-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${sessionProgress}%` }}
          />
        </div>

        {/* Card Stage */}
        <div className="flex-1 w-full max-w-4xl flex flex-col items-center justify-center p-6">
          {currentCard ? (
            <div className="w-full">
              {/* Flip Card Container */}
              <div className="perspective-1000 relative z-10 w-full min-h-[360px]" style={{ perspective: '1200px' }}>
                <div 
                  className={`w-full h-full min-h-[360px] transition-transform duration-300 preserve-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
                  onClick={() => !isFlipped && setIsFlipped(true)}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Front (Question) */}
                  <div className="absolute inset-0 backface-hidden bg-[#0D111A] border border-white/[0.05] hover:border-white/[0.08] rounded-xl p-10 flex flex-col items-center justify-center text-center shadow-lg transition-colors">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-6 flex items-center gap-1.5">
                      <BookOpen className="w-3 h-3" /> {currentCard.document} <span className="text-zinc-700">|</span> Checkpoint {currentCard.checkpoint}
                    </p>
                    <h3 className="text-2xl font-semibold text-white leading-relaxed">{currentCard.question}</h3>
                    <p className="text-xs text-zinc-600 mt-8 absolute bottom-6 font-medium tracking-wide">( Click to reveal )</p>
                  </div>

                  {/* Back (Answer) */}
                  <div className="absolute inset-0 backface-hidden rotate-y-180 bg-[#121622] border border-indigo-500/20 rounded-xl p-10 flex flex-col items-center justify-center text-center shadow-2xl">
                    <p className="text-[10px] text-indigo-500/80 uppercase tracking-widest font-bold mb-6">Answer</p>
                    <p className="text-xl font-medium text-zinc-200 leading-relaxed max-w-2xl">{currentCard.answer}</p>
                  </div>
                </div>
              </div>

              {/* SRS Action Buttons */}
              <div className={`mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 transition-all duration-300 mx-auto w-full max-w-2xl ${isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
                {[
                  { label: 'Again', icon: RotateCcw, color: 'text-rose-400', bg: 'hover:bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40 text-rose-500', interval: '< 1m' },
                  { label: 'Hard', icon: Brain, color: 'text-amber-400', bg: 'hover:bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40 text-amber-500', interval: '12h' },
                  { label: 'Good', icon: CheckCircle2, color: 'text-emerald-400', bg: 'hover:bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40 text-emerald-500', interval: '2d' },
                  { label: 'Easy', icon: Sparkles, color: 'text-blue-400', bg: 'hover:bg-blue-500/5 border-blue-500/20 hover:border-blue-500/40 text-blue-500', interval: '4d' },
                ].map(btn => (
                  <button 
                    key={btn.label}
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleAnswer(); }}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg border bg-[#0D111A] transition-colors ${btn.bg}`}
                  >
                    <div className="flex items-center gap-2">
                      <btn.icon className={`w-3.5 h-3.5 ${btn.color}`} />
                      <span className="text-xs font-bold">{btn.label}</span>
                    </div>
                    <span className="text-[10px] font-bold opacity-60">{btn.interval}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Queue Completed</h2>
              <p className="text-zinc-400 mb-8 max-w-sm">You have reviewed all due cards for this session. Great work.</p>
              <button 
                onClick={() => setIsReviewing(false)}
                className="px-6 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 text-sm font-semibold transition-colors"
              >
                Return to Studio
              </button>
            </div>
          )}
        </div>

        <style>{`
          .preserve-3d { transform-style: preserve-3d; }
          .backface-hidden { backface-visibility: hidden; }
          .rotate-y-180 { transform: rotateY(180deg); }
          .perspective-1000 { perspective: 1000px; }
        `}</style>
      </div>
    );
  }

  // ── STANDARD DASHBOARD RENDER ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#090C12] text-white font-sans overflow-x-hidden selection:bg-indigo-500/30">
      <TopNav activePage="Flashcards" user={user} />

      {/* ── COMPACT TOP STRIP ──────────────────────────────────────────────── */}
      <div className="border-b border-white/[0.05] bg-[#0A0D15] sticky top-[65px] z-30">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded flex items-center justify-center">
              <Brain className="w-4 h-4 text-indigo-400" />
            </div>
            <h1 className="text-sm font-bold text-white tracking-wide">Spaced Repetition Studio</h1>
          </div>

          <div className="hidden lg:flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Due Today</span>
              <span className="text-sm font-bold text-indigo-400">{totalCardsDue} cards</span>
            </div>
            <div className="w-px h-6 bg-white/[0.05]" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Accuracy</span>
              <span className="text-sm font-bold text-emerald-400">82%</span>
            </div>
            <div className="w-px h-6 bg-white/[0.05]" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Weak</span>
              <span className="text-sm font-bold text-rose-400">{totalWeak} cards</span>
            </div>
            <div className="w-px h-6 bg-white/[0.05]" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Est. Time</span>
              <span className="text-sm font-bold text-zinc-300">~{Math.max(1, Math.round(totalCardsDue * 0.5))} min</span>
            </div>
          </div>

          <button 
            onClick={() => startReview('ALL')}
            disabled={totalCardsDue === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-white" /> Start Review
          </button>
        </div>
      </div>

      {/* ── MAIN LAYOUT (70 / 30) ──────────────────────────────────────────── */}
      <main className="max-w-[1400px] mx-auto px-6 py-6 border-x border-white/[0.02] min-h-[calc(100vh-130px)] bg-[#0B0E16]">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-8">

          {/* ═ LEFT COLUMN (70%) ═════════════════════════════════════════════ */}
          <div className="space-y-8 min-w-0">
            
            {/* 1. Review Queue */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-zinc-400" />
                <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Review Queue</h2>
              </div>
              <div className="rounded-xl border border-white/[0.05] bg-[#0A0D15] overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-white/[0.05] text-[10px] uppercase tracking-wider text-zinc-500 font-bold bg-[#0D111A]">
                      <th className="px-5 py-3 font-bold">Document</th>
                      <th className="px-5 py-3 font-bold text-center">Due Today</th>
                      <th className="px-5 py-3 font-bold text-center">Weak Cards</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {DOCUMENTS.map((doc) => (
                      <tr key={doc.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-zinc-600" />
                            <span className="text-zinc-200 font-semibold">{doc.filename}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={`text-xs font-bold ${doc.dueToday > 0 ? 'text-indigo-400' : 'text-zinc-600'}`}>{doc.dueToday}</span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={`text-xs font-bold ${doc.weakCards > 3 ? 'text-rose-400' : 'text-zinc-500'}`}>{doc.weakCards}</span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button 
                            onClick={() => startReview(doc.id)}
                            disabled={doc.dueToday === 0}
                            className="px-3 py-1.5 rounded bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/10 text-xs font-semibold transition-all disabled:opacity-30 flex items-center gap-1.5 ml-auto text-zinc-300"
                          >
                            <Play className="w-3 h-3" /> Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Flashcard Database */}
            <div>
              <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-zinc-400" />
                  <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Database</h2>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative group flex-1 sm:flex-none">
                    <input 
                      type="text" 
                      placeholder="Search..." 
                      className="bg-[#0A0D15] border border-white/[0.08] rounded pl-3 pr-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500/50 w-full sm:w-48 transition-all"
                    />
                  </div>
                  <button className="flex items-center gap-1.5 px-2 py-1 rounded border border-white/[0.08] bg-[#0A0D15] text-zinc-300 text-xs hover:bg-white/[0.05] transition-colors font-medium">
                    <Filter className="w-3 h-3" /> Filters
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-white/[0.05] bg-[#0A0D15] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-white/[0.05] text-[10px] uppercase tracking-wider text-zinc-500 font-bold bg-[#0D111A]">
                        <th className="px-4 py-3 font-bold w-5/12">Question / Answer</th>
                        <th className="px-4 py-3 font-bold">Document</th>
                        <th className="px-4 py-3 font-bold text-center">Chkpt</th>
                        <th className="px-4 py-3 font-bold">Mastery</th>
                        <th className="px-4 py-3 font-bold text-right pt-2 pb-2">Next Review</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {MOCK_FLASHCARDS.map((card) => (
                        <tr key={card.id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer">
                          <td className="px-4 py-3">
                            <p className="text-zinc-300 font-medium line-clamp-1">{card.question}</p>
                            <p className="text-[11px] text-zinc-600 mt-0.5 line-clamp-1 group-hover:text-zinc-400 transition-colors">{card.answer}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-zinc-400 truncate max-w-[150px] inline-block">{card.document}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-[10px] bg-white/[0.04] text-zinc-500 px-1.5 py-0.5 rounded border border-white/[0.05] font-bold">{card.checkpoint}</span>
                          </td>
                          <td className="px-4 py-3">
                            <MasteryPill type={card.mastery} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-semibold ${card.nextReview === 'Today' ? 'text-amber-400' : 'text-zinc-500'}`}>
                              {card.nextReview}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-2.5 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-zinc-500 bg-[#0D111A]">
                  <span>Showing 1-5 of 282 cards</span>
                  <div className="flex gap-1.5">
                    <button className="px-2 py-1 rounded border border-white/10 hover:bg-white/5 transition-colors cursor-not-allowed opacity-50">Prev</button>
                    <button className="px-2 py-1 rounded border border-white/10 hover:bg-white/5 transition-colors">Next</button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* ═ RIGHT COLUMN (30%) ════════════════════════════════════════════ */}
          <div className="space-y-6">
            
            {/* Quick Filter */}
            <div className="rounded-xl border border-white/[0.05] bg-[#0A0D15] p-4 text-sm">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block">Quick Filter Review Mode</label>
              <div className="relative">
                <select className="w-full bg-[#0D111A] border border-white/[0.08] rounded text-xs text-zinc-200 pl-3 pr-8 py-2 appearance-none outline-none focus:border-indigo-500/50">
                  <option>All Documents</option>
                  {DOCUMENTS.map(d => <option key={d.id}>{d.filename}</option>)}
                </select>
                <ChevronDown className="w-3 h-3 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Accuracy Trend */}
            <div className="rounded-xl border border-white/[0.05] bg-[#0A0D15] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-zinc-200">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Accuracy</h3>
                </div>
                <span className="text-zinc-500 text-[10px] font-bold">7 sessions</span>
              </div>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-2xl font-bold text-emerald-400">82%</span>
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1 py-0.5 rounded uppercase tracking-wider mb-1">+4%</span>
              </div>
              <div className="h-8 mt-1">
                <Sparkline data={ACCURACY_TREND} color="#10b981" />
              </div>
            </div>

            {/* Mastery Distribution */}
            <div className="rounded-xl border border-white/[0.05] bg-[#0A0D15] p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-zinc-200">
                  <Award className="w-3.5 h-3.5 text-indigo-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Mastery</h3>
                </div>
              </div>
              
              <div className="h-1.5 rounded-full flex bg-white/5 overflow-hidden mb-4">
                {MASTERY_DISTRIBUTION.map(m => (
                  <div key={m.label} style={{ width: `${m.pct}%`, backgroundColor: m.color }} className="h-full hover:opacity-80 transition-opacity" title={`${m.label}: ${m.pct}%`} />
                ))}
              </div>

              <div className="space-y-2">
                {MASTERY_DISTRIBUTION.map(m => (
                  <div key={m.label} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: m.color }} />
                      <span className="text-zinc-400 font-semibold">{m.label}</span>
                    </div>
                    <span className="font-bold text-zinc-200">{m.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weak Documents */}
            <div className="rounded-xl border border-white/[0.05] bg-[#0A0D15] p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-zinc-200">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Weak Areas</h3>
                </div>
              </div>
              <div className="space-y-3">
                {DOCUMENTS.filter(d => d.weakCards > 0).sort((a,b) => b.weakCards - a.weakCards).map(p => (
                  <div key={p.id} className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-400 font-semibold truncate pr-2 max-w-[180px]" title={p.filename}>{p.filename}</span>
                      <span className="text-rose-400 font-bold bg-rose-500/10 px-1.5 rounded">{p.weakCards} weak</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}
