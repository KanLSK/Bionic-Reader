'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import TopNav from './TopNav';
import {
  Brain, Play, CheckCircle2, RotateCcw, Target,
  Search, Clock, X, BookOpen, Sparkles, ChevronDown, AlertCircle, ArrowUpRight
} from 'lucide-react';
import { getDailyReviewQueueAction, recordFlashcardResponseAction } from '@/app/actions/flashcards';

interface FlashcardsPageProps {
  user: { firstName: string | null };
}

interface QueueDocument {
  id: string;
  filename: string;
  totalCards: number;
  dueToday: number;
  weakCards: number;
}

interface FlashcardQueueItem {
  _id: string;
  documentId: string;
  checkpoint: number;
  question: string;
  answer: string;
  easeFactor: number;
  interval: number;
  repetitionCount: number;
  documentData?: { filename: string };
}

function MasteryPill({ type }: { type: string }) {
  const colors: Record<string, string> = {
    'New': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Learning': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    'Mature': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Weak': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase border ${colors[type] || colors['New']}`}>
      {type}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function FlashcardsPage({ user }: FlashcardsPageProps) {
  const [queue, setQueue] = useState<FlashcardQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewModeDocId, setReviewModeDocId] = useState<string | 'ALL'>('ALL');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionProgress, setSessionProgress] = useState(0);
  
  // Timer runs globally for the current card
  const [timer, setTimer] = useState(0);
  const [cardTimer, setCardTimer] = useState(0);

  useEffect(() => {
    getDailyReviewQueueAction().then(res => {
      if (res.success) setQueue(res.queue);
      setLoading(false);
    });
  }, []);

  // Session Timer
  useEffect(() => {
    let intervalObj: NodeJS.Timeout;
    if (isReviewing) {
      intervalObj = setInterval(() => {
        setTimer(t => t + 1);
        setCardTimer(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(intervalObj);
  }, [isReviewing]);

  // Derived Data
  const documentsMap = queue.reduce((acc, card) => {
    if (!acc[card.documentId]) {
      acc[card.documentId] = {
        id: card.documentId,
        filename: card.documentData?.filename || 'Unknown Document',
        totalCards: 0,
        dueToday: 0,
        weakCards: 0
      };
    }
    acc[card.documentId].dueToday += 1;
    acc[card.documentId].totalCards += 1;
    if (card.easeFactor < 2.0) acc[card.documentId].weakCards += 1;
    return acc;
  }, {} as Record<string, QueueDocument>);
  const DOCUMENTS = Object.values(documentsMap) as QueueDocument[];

  const reviewQueue = queue.filter(c => reviewModeDocId === 'ALL' || c.documentId === reviewModeDocId);
  const totalCardsDue = queue.length;
  const totalWeak = queue.filter(c => c.easeFactor < 2.0).length;

  const startReview = (docId: string | 'ALL') => {
    setReviewModeDocId(docId);
    setIsReviewing(true);
    setCurrentIdx(0);
    setIsFlipped(false);
    setTimer(0);
    setCardTimer(0);
    setSessionProgress(0);
  };

  const handleAnswer = async (rating: 'Again' | 'Hard' | 'Good' | 'Easy') => {
    const currentFlashcard = reviewQueue[currentIdx];
    
    // Fire and forget server action
    recordFlashcardResponseAction(currentFlashcard._id, rating, cardTimer * 1000).catch(console.error);

    // Proceed to next
    if (currentIdx < reviewQueue.length - 1) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIdx(i => i + 1);
        setSessionProgress(((currentIdx + 1) / reviewQueue.length) * 100);
        setCardTimer(0);
      }, 150);
    } else {
      setIsReviewing(false);
      setSessionProgress(100);
      // Refresh queue
      setLoading(true);
      getDailyReviewQueueAction().then(res => {
        if (res.success) setQueue(res.queue);
        setLoading(false);
      });
    }
  };

  const getMasteryLevel = (ef: number, reps: number) => {
    if (reps === 0) return 'New';
    if (ef < 2.0) return 'Weak';
    if (ef >= 2.5 && reps > 3) return 'Mature';
    return 'Learning';
  };

  const currentCard = reviewQueue[currentIdx];

  // ── REVIEW MODE RENDER ──────────────────────────────────────────────────
  if (isReviewing && currentCard) {
    return (
      <div className="min-h-screen bg-[#090C12] text-white font-sans overflow-x-hidden selection:bg-indigo-500/30 flex flex-col items-center">
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
              {DOCUMENTS.map((d: QueueDocument) => (
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

        <div className="w-full h-0.5 bg-white/5 relative">
          <div 
            className="absolute top-0 left-0 h-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${sessionProgress}%` }}
          />
        </div>

        <div className="flex-1 w-full max-w-4xl flex flex-col items-center justify-center p-6 mt-12 mb-12">
          <div className="w-full h-full flex flex-col justify-center min-h-[400px]">
            <div className="perspective-1000 relative z-10 w-full min-h-[360px] flex-grow flex" style={{ perspective: '1200px' }}>
              <div 
                className={`w-full h-full min-h-[360px] transition-transform duration-300 preserve-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
                onClick={() => !isFlipped && setIsFlipped(true)}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Front (Question) */}
                <div className="absolute inset-0 backface-hidden bg-[#0D111A] border border-white/[0.05] hover:border-white/[0.08] rounded-xl p-10 flex flex-col items-center justify-center text-center shadow-lg transition-colors">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-6 flex items-center gap-1.5">
                    <BookOpen className="w-3 h-3" /> {currentCard.documentData?.filename || 'Document'} <span className="text-zinc-700">|</span> Checkpoint {currentCard.checkpoint}
                  </p>
                  <h3 className="text-2xl font-semibold text-white leading-relaxed">{currentCard.question}</h3>
                  <p className="text-xs text-zinc-600 mt-8 absolute bottom-6 font-medium tracking-wide">( Click to reveal )</p>
                </div>

                {/* Back (Answer) */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 bg-[#121622] border border-indigo-500/20 rounded-xl p-10 flex flex-col items-center justify-center text-center shadow-2xl overflow-y-auto">
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <p className="text-[10px] text-indigo-500/80 uppercase tracking-widest font-bold mb-6">Answer</p>
                    <p className="text-xl font-medium text-zinc-200 leading-relaxed max-w-2xl">{currentCard.answer}</p>
                  </div>
                  
                  {/* Jump To Section Link */}
                  <div className="mt-8 shrink-0">
                    <Link 
                      href={`/reader/${currentCard.documentId}`} 
                      className="px-4 py-2 rounded shadow bg-[#090C12] border border-white/10 hover:border-indigo-500/40 hover:text-indigo-300 transition-colors text-xs font-semibold text-zinc-400 flex items-center gap-1.5 inline-flex"
                      title="Jump to the relevant section in the document"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" /> Jump to Section Source
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* SRS Action Buttons */}
            <div className={`mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 transition-all duration-300 mx-auto w-full max-w-2xl ${isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
              {[
                { label: 'Again', rating: 'Again' as const, icon: RotateCcw, color: 'text-rose-400', bg: 'hover:bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40 text-rose-500', interval: '< 1m' },
                { label: 'Hard', rating: 'Hard' as const, icon: Brain, color: 'text-amber-400', bg: 'hover:bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40 text-amber-500', interval: '1.2x' },
                { label: 'Good', rating: 'Good' as const, icon: CheckCircle2, color: 'text-emerald-400', bg: 'hover:bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40 text-emerald-500', interval: '2.5x' },
                { label: 'Easy', rating: 'Easy' as const, icon: Sparkles, color: 'text-blue-400', bg: 'hover:bg-blue-500/5 border-blue-500/20 hover:border-blue-500/40 text-blue-500', interval: '3.2x' },
              ].map(btn => (
                <button 
                  key={btn.label}
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleAnswer(btn.rating); }}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border bg-[#0D111A] transition-colors ${btn.bg} group`}
                >
                  <btn.icon className={`w-5 h-5 mb-2 ${btn.color} group-hover:scale-110 transition-transform`} />
                  <span className="text-sm font-bold mb-1">{btn.label}</span>
                  <span className="text-[10px] font-bold opacity-60">SM-2: {btn.interval}</span>
                </button>
              ))}
            </div>
          </div>
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

  // ── QUEUE COMPLETE RENDER ───────────────────────────────────────────────
  if (isReviewing && !currentCard) {
    return (
      <div className="min-h-screen bg-[#090C12] text-white flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Session Completed</h2>
          <p className="text-zinc-400 mb-8 max-w-sm text-center">You&apos;ve cleared the queue for today. Spaced repetition builds memory over time.</p>
          <button 
            onClick={() => setIsReviewing(false)}
            className="px-6 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-semibold transition-colors"
          >
            Return to Studio
          </button>
      </div>
    );
  }

  // ── STANDARD DASHBOARD RENDER ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#090C12] text-white font-sans overflow-x-hidden selection:bg-indigo-500/30">
      <TopNav activePage="Flashcards" user={user} />

      {/* ── COMPACT TOP STRIP ──────────────────────────────────────────────── */}
      <div className="border-b border-white/[0.05] bg-[#0A0D15] sticky top-[56px] z-30">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded flex items-center justify-center">
              <Brain className="w-4 h-4 text-indigo-400" />
            </div>
            <h1 className="text-sm font-bold text-white tracking-wide">Spaced Repetition Studio</h1>
          </div>

          <div className="hidden lg:flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Due</span>
              <span className="text-sm font-bold text-indigo-400">{loading ? '-' : totalCardsDue} cards</span>
            </div>
            <div className="w-px h-6 bg-white/[0.05]" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Weak Area</span>
              <span className="text-sm font-bold text-rose-400">{loading ? '-' : totalWeak} cards</span>
            </div>
            <div className="w-px h-6 bg-white/[0.05]" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Est. Time</span>
              <span className="text-sm font-bold text-zinc-300">~{loading ? '-' : Math.max(1, Math.round(totalCardsDue * 0.4))} min</span>
            </div>
          </div>

          <button 
            onClick={() => startReview('ALL')}
            disabled={totalCardsDue === 0 || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-white" /> Start Review
          </button>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-6 py-6 border-x border-white/[0.02] min-h-[calc(100vh-130px)] bg-[#0B0E16]">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-zinc-500 text-sm font-medium">Fetching active queue...</div>
        ) : queue.length === 0 ? (
           <div className="h-64 flex flex-col items-center justify-center text-center">
             <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
               <CheckCircle2 className="w-6 h-6 text-emerald-400" />
             </div>
             <h3 className="text-lg font-bold text-white mb-2">You&apos;re All Caught Up</h3>
             <p className="text-sm text-zinc-500 max-w-sm">There are no flashcards due for review right now. Take a break, or read a new document to generate more cards.</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-8">
            {/* ═ LEFT COLUMN (70%) ═════════════════════════════════════════════ */}
            <div className="space-y-8 min-w-0">
              
              {/* 1. Review Queue by Doc */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-zinc-400" />
                  <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Queue Breakdown</h2>
                </div>
                <div className="rounded-xl border border-white/[0.05] bg-[#0A0D15] overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b border-white/[0.05] text-[10px] uppercase tracking-wider text-zinc-500 font-bold bg-[#0D111A]">
                        <th className="px-5 py-3 font-bold">Document</th>
                        <th className="px-5 py-3 font-bold text-center">Due Now</th>
                        <th className="px-5 py-3 font-bold text-center">Weak Cards</th>
                        <th className="px-5 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {DOCUMENTS.map((doc: QueueDocument) => (
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

              {/* 2. Flashcard Active Queue */}
              <div>
                <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-zinc-400" />
                    <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Active Priority Queue</h2>
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.05] bg-[#0A0D15] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                      <thead>
                        <tr className="border-b border-white/[0.05] text-[10px] uppercase tracking-wider text-zinc-500 font-bold bg-[#0D111A]">
                          <th className="px-4 py-3 font-bold w-5/12">Question Snippet</th>
                          <th className="px-4 py-3 font-bold">Document</th>
                          <th className="px-4 py-3 font-bold text-center">Interval</th>
                          <th className="px-4 py-3 font-bold">Mastery</th>
                          <th className="px-4 py-3 font-bold text-right">Ease Factor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03]">
                        {queue.slice(0, 10).map((card: FlashcardQueueItem) => (
                          <tr key={card._id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-4 py-3">
                              <p className="text-zinc-300 font-medium line-clamp-1">{card.question}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-semibold text-zinc-400 truncate max-w-[150px] inline-block">{card.documentData?.filename || 'Unknown'}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-[10px] bg-white/[0.04] text-zinc-500 px-1.5 py-0.5 rounded border border-white/[0.05] font-bold">{card.interval}d</span>
                            </td>
                            <td className="px-4 py-3">
                              <MasteryPill type={getMasteryLevel(card.easeFactor, card.repetitionCount)} />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-semibold text-zinc-500">
                                {card.easeFactor?.toFixed(2) || '2.50'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {queue.length > 10 && (
                    <div className="p-3 border-t border-white/[0.05] text-center text-xs font-semibold text-zinc-500 bg-[#0D111A]">
                      + {queue.length - 10} more cards in queue
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* ═ RIGHT COLUMN (30%) ════════════════════════════════════════════ */}
            <div className="space-y-6">
              
              <div className="rounded-xl border border-white/[0.05] bg-[#0A0D15] p-4 text-sm">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block">Quick Filter Mode</label>
                <div className="relative">
                  <select 
                    value={reviewModeDocId}
                    onChange={(e) => setReviewModeDocId(e.target.value)}
                    className="w-full bg-[#0D111A] border border-white/[0.08] rounded text-xs text-zinc-200 pl-3 pr-8 py-2 appearance-none outline-none focus:border-indigo-500/50"
                  >
                    <option value="ALL">All Mixed Documents</option>
                    {DOCUMENTS.map((d: QueueDocument) => <option key={d.id} value={d.id}>{d.filename}</option>)}
                  </select>
                  <ChevronDown className="w-3 h-3 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Weak Documents */}
              <div className="rounded-xl border border-white/[0.05] bg-[#0A0D15] p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-zinc-200">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Action Needed</h3>
                  </div>
                </div>
                <div className="space-y-3">
                  {DOCUMENTS.filter((d: QueueDocument) => d.weakCards > 0).sort((a: QueueDocument, b: QueueDocument) => b.weakCards - a.weakCards).map((p: QueueDocument) => (
                    <div key={p.id} className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-400 font-semibold truncate pr-2 max-w-[180px]" title={p.filename}>{p.filename}</span>
                        <span className="text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">{p.weakCards} weak</span>
                      </div>
                    </div>
                  ))}
                  {DOCUMENTS.filter((d: QueueDocument) => d.weakCards > 0).length === 0 && (
                    <p className="text-xs text-zinc-500 font-medium tracking-wide">No weak documents currently found.</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}
