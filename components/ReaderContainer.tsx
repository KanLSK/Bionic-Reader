'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import BionicText from './BionicText';
import FlashcardModal, { type Flashcard } from './FlashcardModal';
import { saveFlashcardsAction } from '@/app/actions/flashcards';
import {
  Columns2, BookOpen, ArrowLeft, Zap,
  Play, Pause, RotateCcw, Plus, Minus, Clock,
} from 'lucide-react';
import { updateDocumentProgressAction } from '@/app/actions/library';

const BionicPdfViewer = dynamic(() => import('./OriginalPdfViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
      Loading PDF…
    </div>
  ),
});

interface ReaderContainerProps {
  documentId: string;
  rawText: string;
  documentTitle?: string;
  initialWordIndex?: number;
}

type ViewMode = 'focus' | 'split';

const CHECKPOINTS = [15, 30, 45, 60, 75, 90];
const CHECKPOINT_NUM: Record<number, number> = { 15: 1, 30: 2, 45: 3, 60: 4, 75: 5, 90: 6 };

export default function ReaderContainer({ documentId, rawText, documentTitle = 'Document', initialWordIndex = 0 }: ReaderContainerProps) {
  const [wpm, setWpm]               = useState(300);
  const [isPlaying, setIsPlaying]   = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(initialWordIndex);
  const [viewMode, setViewMode]     = useState<ViewMode>('focus');
  const [uiVisible, setUiVisible]   = useState(true);

  // Flashcard state
  const [modalOpen, setModalOpen]         = useState(false);
  const [modalCheckpoint, setModalCheckpoint] = useState(0);
  const [flashcards, setFlashcards]       = useState<Flashcard[]>([]);
  const [fcLoading, setFcLoading]         = useState(false);
  const [fcError, setFcError]             = useState<string | undefined>();
  const triggeredCheckpoints              = useRef<Set<number>>(new Set());
  const segmentStartRef                   = useRef(0);

  const words    = useRef(rawText.split(/\s+/).filter(Boolean));
  const maxWords = words.current.length;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimer   = useRef<NodeJS.Timeout | null>(null);

  const progress       = maxWords > 0 ? (currentWordIndex / maxWords) * 100 : 0;
  const wordsRemaining = maxWords - currentWordIndex;
  const minsRemaining  = Math.max(0, Math.round(wordsRemaining / wpm));
  const pdfUrl         = `/api/pdf/${documentId}`;

  // ── Auto-hide UI ─────────────────────────────────────────────────────────
  const resetIdleTimer = useCallback(() => {
    setUiVisible(true);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (isPlaying) {
      idleTimer.current = setTimeout(() => setUiVisible(false), 2500);
    }
  }, [isPlaying]);

  useEffect(() => {
    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('keydown',   resetIdleTimer);
    return () => {
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('keydown',   resetIdleTimer);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [resetIdleTimer]);

  useEffect(() => {
    if (!isPlaying) { setUiVisible(true); if (idleTimer.current) clearTimeout(idleTimer.current); }
    else resetIdleTimer();
  }, [isPlaying, resetIdleTimer]);

  // ── Auto-save progress ───────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only save if we have progressed past the initial index or are returning to 0 explicitly
      if (documentId) {
        updateDocumentProgressAction(documentId, currentWordIndex).catch(console.error);
      }
    }, 3000); // debounce save by 3 seconds

    return () => clearTimeout(timer);
  }, [currentWordIndex, documentId]);

  // ── Checkpoint trigger ────────────────────────────────────────────────────
  const triggerCheckpoint = useCallback(async (checkpoint: number) => {
    if (triggeredCheckpoints.current.has(checkpoint)) return;
    triggeredCheckpoints.current.add(checkpoint);
    setIsPlaying(false);
    setModalCheckpoint(checkpoint);
    setFlashcards([]);
    setFcError(undefined);
    setFcLoading(true);
    setModalOpen(true);

    const segStart = segmentStartRef.current;
    const segEnd   = Math.floor((checkpoint / 100) * maxWords);
    const segText  = words.current.slice(segStart, segEnd).join(' ');
    segmentStartRef.current = segEnd;

    try {
      const res  = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: segText }),
      });
      const data = await res.json();
      if (!res.ok || data.error) setFcError(data.error || 'Failed to generate flashcards');
      else {
        setFlashcards(data.cards);
        saveFlashcardsAction(documentId, checkpoint, data.cards).catch(console.error);
      }
    } catch (err: any) {
      setFcError(err.message || 'Network error');
    } finally {
      setFcLoading(false);
    }
  }, [documentId, maxWords]);

  // ── On-demand checkpoint (user clicks tick on progress bar) ──────────────
  const triggerCheckpointOnDemand = useCallback(async (checkpoint: number) => {
    setIsPlaying(false);
    setModalCheckpoint(checkpoint);
    setFlashcards([]);
    setFcError(undefined);
    setFcLoading(true);
    setModalOpen(true);

    // Find the previous checkpoint boundary to get just this segment's text
    const prevCp  = CHECKPOINTS.filter((c) => c < checkpoint).pop() ?? 0;
    const segStart = Math.floor((prevCp / 100) * maxWords);
    const segEnd   = Math.floor((checkpoint / 100) * maxWords);
    // If we haven't read this far yet, use everything up to the checkpoint
    const segText  = words.current.slice(segStart, segEnd).join(' ');

    try {
      const res  = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: segText }),
      });
      const data = await res.json();
      if (!res.ok || data.error) setFcError(data.error || 'Failed to generate flashcards');
      else {
        setFlashcards(data.cards);
        saveFlashcardsAction(documentId, checkpoint, data.cards).catch(console.error);
      }
    } catch (err: any) {
      setFcError(err.message || 'Network error');
    } finally {
      setFcLoading(false);
    }
  }, [documentId, maxWords]);

  // ── Speed reader tick ─────────────────────────────────────────────────────
  const tick = useCallback(() => {
    setCurrentWordIndex((prev) => {
      if (prev >= maxWords - 1) { setIsPlaying(false); return prev; }
      const next     = prev + 1;
      const progress = (next / maxWords) * 100;
      for (const cp of CHECKPOINTS) {
        if (progress >= cp && !triggeredCheckpoints.current.has(cp)) {
          setTimeout(() => triggerCheckpoint(cp), 0);
          break;
        }
      }
      return next;
    });
  }, [maxWords, triggerCheckpoint]);

  useEffect(() => {
    if (isPlaying) {
      const ms = 60000 / wpm;
      intervalRef.current = setInterval(tick, ms);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, wpm, tick]);

  const togglePlay  = () => setIsPlaying((p) => !p);
  const resetReader = () => {
    setIsPlaying(false);
    setCurrentWordIndex(0);
    triggeredCheckpoints.current.clear();
    segmentStartRef.current = 0;
  };
  const bumpWpm = (delta: number) =>
    setWpm((w) => Math.min(1000, Math.max(50, w + delta)));

  const handleWordClick = useCallback((idx: number) => {
    setIsPlaying(false);
    setCurrentWordIndex(idx);
  }, []);

  const handleModalClose = () => {
    setModalOpen(false);
    setTimeout(() => setIsPlaying(true), 300);
  };

  // ── Current paragraph detection (for glow) ───────────────────────────────
  // words per "paragraph chunk" for visual highlight grouping
  const PARA_CHUNK = 80;
  const currentPara = Math.floor(currentWordIndex / PARA_CHUNK);

  return (
    <div
      className="w-full h-screen flex flex-col overflow-hidden"
      style={{ background: '#090C12' }}
    >
      <style>{`
        @keyframes progressGlow {
          0%,100% { box-shadow: 0 0 6px rgba(99,102,241,0.5); }
          50%      { box-shadow: 0 0 14px rgba(99,102,241,0.9); }
        }
        .progress-fill {
          animation: ${isPlaying ? 'progressGlow 2s ease-in-out infinite' : 'none'};
        }
        .vignette {
          background: radial-gradient(ellipse at center, transparent 40%, rgba(9,12,18,0.7) 100%);
          pointer-events: none;
        }
        .capsule-glass {
          background: rgba(15,21,32,0.88);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.09);
          box-shadow: 0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(99,102,241,0.1);
        }
        .sepia-text { color: #d4b896; }
      `}</style>

      {/* ── Flashcard Modal ─────────────────────────────────────────────── */}
      {modalOpen && (
        <FlashcardModal
          checkpoint={modalCheckpoint}
          checkpointNum={CHECKPOINT_NUM[modalCheckpoint] ?? 1}
          cards={flashcards}
          isLoading={fcLoading}
          error={fcError}
          onClose={handleModalClose}
        />
      )}

      {/* ── TOP NAV (52px) ──────────────────────────────────────────────── */}
      <div
        className={`flex-shrink-0 flex flex-col transition-all duration-400 ${
          uiVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ zIndex: 40 }}
      >
        {/* Nav row */}
        <div
          className="flex items-center gap-4 px-5 h-[52px] border-b"
          style={{
            background: 'rgba(9,12,18,0.92)',
            backdropFilter: 'blur(20px)',
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        >
          {/* Left */}
          <Link
            href="/library"
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-200 transition-colors group flex-shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-xs font-medium hidden sm:block">Library</span>
          </Link>

          <div className="w-px h-4 bg-white/10 flex-shrink-0" />

          <span className="text-xs font-semibold text-zinc-300 truncate max-w-[200px] hidden md:block" title={documentTitle}>
            {documentTitle}
          </span>

          {/* Center: progress bar */}
          <div className="flex-1 flex flex-col gap-1 px-4">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] text-zinc-600">{Math.round(progress)}% complete</span>
              <span className="text-[10px] text-zinc-600">{minsRemaining} min left</span>
            </div>
            <div className="relative h-[3px] bg-white/5 rounded-full overflow-visible">
              {/* Fill */}
              <div
                className="progress-fill absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
                }}
              />
              {/* Checkpoint ticks — clickable to view flashcards on demand */}
              {CHECKPOINTS.map((cp, cpIdx) => {
                const passed   = progress >= cp;
                const triggered = triggeredCheckpoints.current.has(cp);
                return (
                  <button
                    key={cp}
                    onClick={() => triggerCheckpointOnDemand(cp)}
                    title={`Checkpoint ${cpIdx + 1} (${cp}%) — Click to view flashcards`}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group z-20 flex items-center justify-center"
                    style={{ left: `${cp}%`, width: 20, height: 20, cursor: 'pointer' }}
                  >
                    {/* Visual tick — expands on hover */}
                    <div
                      className="rounded-full transition-all duration-200 group-hover:scale-[2.5] group-hover:opacity-100"
                      style={{
                        width:      4,
                        height:     10,
                        background: triggered
                          ? '#818cf8'
                          : passed
                          ? 'rgba(99,102,241,0.6)'
                          : 'rgba(255,255,255,0.18)',
                        boxShadow: triggered ? '0 0 6px rgba(129,140,248,0.8)' : 'none',
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Performance badge */}
            <div className="hidden lg:flex items-center gap-1.5 bg-blue-500/8 border border-blue-500/15 rounded-lg px-2.5 py-1.5 mr-1">
              <Zap className="w-3 h-3 text-blue-400" />
              <span className="text-[11px] font-bold text-blue-400">{wpm} WPM</span>
            </div>

            {/* View mode toggle */}
            <div className="flex items-center bg-white/[0.04] border border-white/[0.07] rounded-xl p-1">
              <button
                onClick={() => setViewMode('focus')}
                title="Focus mode"
                className={`p-1.5 rounded-lg transition-all text-xs ${
                  viewMode === 'focus'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('split')}
                title="Split mode"
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'split'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                <Columns2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN READING AREA ──────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 relative overflow-hidden">

        {viewMode === 'focus' ? (
          /* ─── FOCUS MODE ─────────────────────────────────────────────── */
          <div className="w-full h-full overflow-y-auto relative" style={{ background: '#090C12' }}>
            {/* Vignette overlay */}
            <div className="vignette fixed inset-0 z-0" />

            {/* Reading column */}
            <div className="relative z-10 max-w-[760px] mx-auto px-4 sm:px-8 py-8 sm:py-12 pb-32">
              <BionicText
                text={rawText}
                currentWordIndex={currentWordIndex}
                onWordClick={handleWordClick}
                focusMode
                currentPara={currentPara}
                wordsPerPara={PARA_CHUNK}
              />
            </div>
          </div>

        ) : (
          /* ─── SPLIT MODE ─────────────────────────────────────────────── */
          <div className="flex h-full">
            {/* Left: PDF */}
            <div className="w-1/2 h-full overflow-hidden" style={{ borderRight: '1px solid rgba(99,102,241,0.15)' }}>
              {/* Subtle left panel tint */}
              <div className="w-full h-full" style={{ background: '#0B0E16', filter: 'saturate(0.9)' }}>
                <BionicPdfViewer pdfUrl={pdfUrl} mode="line-highlight" currentWordIndex={currentWordIndex} />
              </div>
            </div>

            {/* Glow divider */}
            <div
              className="w-px flex-shrink-0"
              style={{
                background: 'linear-gradient(to bottom, transparent, rgba(99,102,241,0.4), rgba(99,102,241,0.4), transparent)',
                boxShadow: '0 0 12px rgba(99,102,241,0.3)',
              }}
            />

            {/* Right: Bionic text */}
            <div
              className="w-1/2 h-full overflow-y-auto px-4 sm:px-8 py-8 sm:py-12 pb-32"
              style={{ background: '#090C12' }}
            >
              <BionicText
                text={rawText}
                currentWordIndex={currentWordIndex}
                onWordClick={handleWordClick}
                focusMode
                currentPara={currentPara}
                wordsPerPara={PARA_CHUNK}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── FLOATING CONTROL CAPSULE ────────────────────────────────────────── */}
      <div
        className={`fixed bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-400 w-[95%] sm:w-auto max-w-fit ${
          uiVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="capsule-glass rounded-[22px] flex items-center justify-center gap-0.5 sm:gap-1 px-3 sm:px-4 py-2 sm:py-2.5">

          {/* Reset */}
          <button
            onClick={resetReader}
            title="Reset"
            className="p-2 rounded-xl text-zinc-600 hover:text-zinc-200 hover:bg-white/5 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-white/10 mx-1" />

          {/* WPM decrement */}
          <button
            onClick={() => bumpWpm(-10)}
            className="p-2 rounded-xl text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-all"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* WPM display */}
          <div className="flex flex-col items-center px-2 min-w-[56px]">
            <span className="text-sm font-black text-white tabular-nums leading-tight">{wpm}</span>
            <span className="text-[9px] text-zinc-600 uppercase tracking-wider">WPM</span>
          </div>

          {/* WPM increment */}
          <button
            onClick={() => bumpWpm(10)}
            className="p-2 rounded-xl text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-white/10 mx-1" />

          {/* Play / Pause — main action */}
          <button
            onClick={togglePlay}
            className={`flex items-center justify-center w-10 h-10 rounded-2xl transition-all font-bold ${
              isPlaying
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-700/40'
                : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-700/30 hover:-translate-y-0.5'
            }`}
          >
            {isPlaying
              ? <Pause  className="w-4 h-4 fill-white" />
              : <Play   className="w-4 h-4 fill-white ml-0.5" />
            }
          </button>

          <div className="w-px h-4 bg-white/10 mx-1 hidden sm:block" />

          {/* Time remaining */}
          <div className="hidden sm:flex items-center gap-1.5 px-1">
            <Clock className="w-3 h-3 text-zinc-600" />
            <span className="text-xs text-zinc-500 tabular-nums">
              {minsRemaining}m
            </span>
          </div>

          {/* Preset WPM pills */}
          <div className="hidden md:flex gap-1 ml-1">
            {[200, 300, 400].map((p) => (
              <button
                key={p}
                onClick={() => setWpm(p)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  wpm === p
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Optimal zone hint */}
        <div className="flex justify-center mt-2">
          <span className="text-[10px] text-zinc-700">
            {wpm < 280
              ? 'Try increasing speed — optimal zone: 280–320 WPM'
              : wpm <= 320
              ? '✦ You\'re in your optimal zone (280–320 WPM)'
              : 'Above optimal zone — monitor comprehension'}
          </span>
        </div>
      </div>
    </div>
  );
}
