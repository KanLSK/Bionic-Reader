'use client';

import React, { useState } from 'react';
import { X, RotateCcw, Check, ChevronRight, Brain, Sparkles } from 'lucide-react';

export interface Flashcard {
  id?: string;
  question: string;
  answer: string;
}

interface FlashcardModalProps {
  checkpoint: number;
  checkpointNum?: number;
  cards: Flashcard[];
  isLoading: boolean;
  error?: string;
  onClose: () => void;
}

export default function FlashcardModal({
  checkpoint,
  checkpointNum = 1,
  cards,
  isLoading,
  error,
  onClose,
}: FlashcardModalProps) {
  const [cardIndex, setCardIndex]     = useState(0);
  const [flipped, setFlipped]         = useState(false);
  const [reviewQueue, setReviewQueue] = useState<Flashcard[]>([]);
  const [done, setDone]               = useState(false);

  const allCards = [...cards, ...reviewQueue];
  const current  = allCards[cardIndex];

  const handleGotIt = () => {
    setFlipped(false);
    if (cardIndex < allCards.length - 1) setCardIndex((i) => i + 1);
    else setDone(true);
  };

  const handleReview = () => {
    if (!current) return;
    setReviewQueue((q) => [...q, current]);
    setFlipped(false);
    setCardIndex((i) => i + 1);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'rgba(4,6,10,0.82)',
        backdropFilter: 'blur(18px)',
      }}
    >
      <style>{`
        @keyframes modalIn {
          from { opacity:0; transform:translateY(16px) scale(0.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        .modal-card { animation: modalIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both; }
        @keyframes spin360 { to { transform: rotate(360deg); } }
      `}</style>

      <div className="modal-card relative w-full max-w-md">

        {/* Ambient glow behind card */}
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{ boxShadow: '0 0 80px rgba(99,102,241,0.2)' }}
        />

        <div
          className="relative rounded-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #0F1520, #0C0E1C)',
            border: '1px solid rgba(99,102,241,0.2)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
          }}
        >

          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: '1px solid rgba(99,102,241,0.12)' }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                <Brain className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                  AI Checkpoint
                </p>
                <p className="text-sm font-black text-white leading-tight">
                  {checkpoint}% — Card {checkpointNum} of 6
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-600 hover:text-zinc-200 hover:bg-white/5 transition-all"
              title="Skip and resume reading"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-7">

            {/* Loading */}
            {isLoading && (
              <div className="flex flex-col items-center gap-5 py-14">
                <div className="relative">
                  <div
                    className="w-12 h-12 rounded-full border-2 border-indigo-500/20"
                    style={{
                      borderTopColor: '#6366f1',
                      animation: 'spin360 1s linear infinite',
                    }}
                  />
                  <Sparkles className="w-4 h-4 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white mb-1">Generating flashcards…</p>
                  <p className="text-xs text-zinc-600">AI is analyzing this section</p>
                </div>
              </div>
            )}

            {/* Error */}
            {!isLoading && error && (
              <div className="text-center py-12">
                <p className="text-red-400 font-semibold mb-1.5">Failed to generate cards</p>
                <p className="text-xs text-zinc-600 mb-6">{error}</p>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl border border-white/10 text-zinc-300 text-sm font-semibold hover:bg-white/5 transition-colors"
                >
                  Resume reading
                </button>
              </div>
            )}

            {/* Done */}
            {!isLoading && !error && done && (
              <div className="flex flex-col items-center gap-5 py-10">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
                >
                  <Check className="w-7 h-7 text-emerald-400" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-black text-white mb-1">Session complete</h3>
                  <p className="text-xs text-zinc-500">
                    {cards.length} card{cards.length !== 1 ? 's' : ''} reviewed from this section
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 px-8 py-3.5 rounded-2xl font-extrabold text-sm text-white transition-all hover:-translate-y-0.5"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                    boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
                  }}
                >
                  Continue reading <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Flashcard */}
            {!isLoading && !error && !done && current && (
              <>
                {/* Progress dots */}
                <div className="flex justify-center items-center gap-1.5 mb-6">
                  {allCards.map((_, i) => (
                    <div
                      key={i}
                      className="rounded-full transition-all duration-300"
                      style={{
                        width:      i === cardIndex ? 20 : 6,
                        height:     6,
                        background: i === cardIndex
                          ? '#6366f1'
                          : i < cardIndex
                          ? '#10b981'
                          : 'rgba(255,255,255,0.08)',
                        boxShadow:  i === cardIndex ? '0 0 8px rgba(99,102,241,0.6)' : 'none',
                      }}
                    />
                  ))}
                  <span className="text-[10px] text-zinc-600 ml-2">
                    {cardIndex + 1} / {allCards.length}
                  </span>
                </div>

                {/* Flip card */}
                <div
                  className="relative cursor-pointer select-none"
                  style={{ perspective: '1200px', minHeight: 170 }}
                  onClick={() => setFlipped((f) => !f)}
                >
                  <div
                    style={{
                      transition:    'transform 0.5s cubic-bezier(0.4,0,0.2,1)',
                      transformStyle: 'preserve-3d',
                      transform:     flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                      position:      'relative',
                      minHeight:     170,
                    }}
                  >
                    {/* Front — Question */}
                    <div
                      style={{ backfaceVisibility: 'hidden', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                      className="absolute inset-0 flex flex-col items-center justify-center p-6 rounded-2xl"
                    >
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-3">Question</span>
                      <p className="text-[15px] font-semibold text-zinc-100 text-center leading-relaxed mb-4">
                        {current.question}
                      </p>
                      <p className="text-[10px] text-zinc-700">Tap to reveal answer</p>
                    </div>

                    {/* Back — Answer */}
                    <div
                      style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(79,70,229,0.08))', border: '1px solid rgba(99,102,241,0.15)' }}
                      className="absolute inset-0 flex flex-col items-center justify-center p-6 rounded-2xl"
                    >
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3">Answer</span>
                      <p className="text-[15px] text-zinc-200 text-center leading-relaxed">
                        {current.answer}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions — show after flip */}
                <div
                  className={`flex gap-3 mt-5 transition-all duration-300 ${
                    flipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
                  }`}
                >
                  <button
                    onClick={handleReview}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-zinc-400 hover:text-zinc-100 transition-all hover:bg-white/5"
                    style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Review again
                  </button>
                  <button
                    onClick={handleGotIt}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-extrabold text-white transition-all hover:-translate-y-0.5"
                    style={{
                      background:  'linear-gradient(135deg, #059669, #10b981)',
                      boxShadow:   '0 4px 16px rgba(16,185,129,0.3)',
                    }}
                  >
                    <Check className="w-3.5 h-3.5" /> Got it
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
