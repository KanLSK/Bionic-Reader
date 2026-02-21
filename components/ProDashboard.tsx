'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Play, Upload, Brain, Zap, Flame,
  Target, ChevronRight, Sparkles, BookOpen,
  TrendingUp, Clock, BarChart2, CheckCircle2,
  RotateCcw, ArrowUp, Edit2,
} from 'lucide-react';
import { updateDocumentMetadataAction } from '@/app/actions/library';
import { getUserProjectsAction } from '@/app/actions/projects';
import TopNav from './TopNav';
import UploadModal from './UploadModal';

interface Project {
  _id: string;
  name: string;
}

interface Doc {
  _id: string;
  filename: string;
  uploadDate: string;
  wordCount?: number;
  currentWordIndex?: number;
  lastOpened?: string;
  projectId?: string;
  status?: string;
}

interface ProDashboardProps {
  user: { firstName: string | null };
  documents: Doc[];
}

// ── Mock analytics data (will be replaced by real Phase 3 data) ──────────────
const WPM_TREND = [210, 235, 228, 260, 255, 275, 290, 270, 300, 295, 310, 305, 320, 315, 330];
const CALENDAR_DAYS = Array.from({ length: 28 }, (_, i) => ({
  day: i + 1,
  active: [1, 2, 4, 5, 7, 8, 9, 12, 14, 15, 16, 19, 21, 22, 23, 26, 27, 28].includes(i + 1),
}));
const CHECKPOINTS = [15, 30, 45, 60, 75, 90];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function estimateMinutes(doc: Doc) {
  const wordsRemaining = Math.max(0, (doc.wordCount ?? 5000) - (doc.currentWordIndex ?? 0));
  return Math.max(1, Math.round(wordsRemaining / 300));
}

function calculateProgress(doc: Doc) {
  const total = doc.wordCount ?? 5000;
  if (total === 0) return 0;
  const current = doc.currentWordIndex ?? 0;
  return Math.min(100, Math.floor((current / total) * 100));
}

// Inline SVG sparkline
function Sparkline({ data, color = '#3b82f6' }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 220;
  const h = 56;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  const areaPath = `M${pts[0]} L${pts.join(' L')} L${w},${h} L0,${h} Z`;
  const linePath = `M${pts[0]} L${pts.join(' L')}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sg)" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Ring chart
function Ring({ pct, size = 72, stroke = 7, color = '#3b82f6' }: { pct: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ filter: `drop-shadow(0 0 4px ${color}90)` }}
      />
    </svg>
  );
}

export default function ProDashboard({ user, documents }: ProDashboardProps) {
  const router  = useRouter();
  const [uploadFileQueue, setUploadFileQueue] = useState<File | null>(null);
  const [progress, setProgress]   = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [docs, setDocs] = useState<Doc[]>(documents);

  const [isEditingHero, setIsEditingHero] = useState(false);
  const [editHeroName, setEditHeroName] = useState('');

  useEffect(() => {
    async function load() {
      const res = await getUserProjectsAction();
      if (res.success) setProjects(res.projects);
    }
    load();
  }, []);

  // Sort docs by lastOpened descending
  const sortedDocs = [...docs].sort((a, b) => {
    const dA = new Date(a.lastOpened || a.uploadDate).getTime();
    const dB = new Date(b.lastOpened || b.uploadDate).getTime();
    return dB - dA;
  });

  const heroDoc  = sortedDocs[0] ?? null;
  const restDocs = sortedDocs.slice(1);
  const heroProgress = heroDoc ? calculateProgress(heroDoc) : 0;

  // Active Project Logic
  const activeProjectId = heroDoc?.projectId;
  const activeProject = projects.find(p => p._id === activeProjectId);
  
  // Find "next" document in the same project (if any)
  const projectDocs = docs.filter(d => activeProjectId && d.projectId === activeProjectId);
  const nextDocInProject = projectDocs.find(d => d._id !== heroDoc?._id && (d.status !== 'Completed' || calculateProgress(d) < 90));
  
  // Active Project Stats
  const apProgressAvg = projectDocs.length ? Math.round(projectDocs.reduce((acc, d) => acc + calculateProgress(d), 0) / projectDocs.length) : 0;

  // Initialize edit name when opening the edit input
  const handleEditClick = () => {
    if (heroDoc) {
      setEditHeroName(heroDoc.filename.replace(/\.pdf$/i, '').trim());
      setIsEditingHero(true);
    }
  };

  // Animate progress bar on mount
  useEffect(() => {
    if (heroDoc) {
      const t = setTimeout(() => setProgress(heroProgress), 400);
      return () => clearTimeout(t);
    }
  }, [heroDoc, heroProgress]);

  const handleUploadSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFileQueue(file);
    e.target.value = '';
  };

  const handleConfirmUpload = async (file: File, projectId: string | null, tags: string[]) => {
    const form = new FormData();
    form.append('file', file);
    if (projectId) form.append('projectId', projectId);
    if (tags.length > 0) form.append('tags', JSON.stringify(tags));

    const res = await fetch('/api/upload', { method: 'POST', body: form });
    if (res.ok) {
      setUploadFileQueue(null);
      router.refresh();
    } else {
      throw new Error('Upload failed');
    }
  };

  const handleHeroRenameSubmit = async () => {
    if (!heroDoc) return;
    setIsEditingHero(false);
    const oldTitle = heroDoc.filename.replace(/\.pdf$/i, '').trim();
    if (editHeroName.trim() && editHeroName.trim() !== oldTitle) {
      const newFilename = editHeroName.trim() + '.pdf';
      setDocs(prev => prev.map(d => d._id === heroDoc._id ? { ...d, filename: newFilename } : d));
      await updateDocumentMetadataAction(heroDoc._id, { filename: newFilename });
    } else {
      setEditHeroName(oldTitle);
    }
  };

  return (
    <div className="min-h-screen bg-[#090C12] text-white font-sans">
      <TopNav activePage="Dashboard" user={user} />

      {uploadFileQueue && (
        <UploadModal 
          file={uploadFileQueue} 
          onClose={() => setUploadFileQueue(null)} 
          onConfirm={handleConfirmUpload} 
        />
      )}

      {/* ── Performance Header ─────────────────────────────────────────────── */}
      <div className="relative border-b border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-950/40 via-transparent to-violet-950/30 pointer-events-none" />
        <div className="absolute -top-24 left-1/2 w-[600px] h-48 -translate-x-1/2 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-8 py-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div>
              <p className="text-[11px] text-blue-400 font-semibold tracking-[0.15em] uppercase mb-0.5">
                {getGreeting()}, {user.firstName ?? 'Scholar'}
              </p>
              <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-tight">
                You&apos;re reading <span className="text-blue-400">23% faster</span> than last week.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {[
              { icon: Zap,   v: '318 WPM', l: 'Avg Speed', up: true  },
              { icon: Clock, v: '2.4 hrs',  l: 'This Week', up: true  },
              { icon: Flame, v: '6 days',   l: 'Streak',    up: false },
            ].map(({ icon: Icon, v, l, up }) => (
              <div key={l} className="flex-1 min-w-[100px] sm:flex-none flex items-center gap-2.5 bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-2.5 backdrop-blur-sm">
                <Icon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{l}</p>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-white">{v}</span>
                    {up && <ArrowUp className="w-3 h-3 text-emerald-400" />}
                  </div>
                </div>
              </div>
            ))}

            {/* Upload FAB */}
            <label className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm cursor-pointer transition-all duration-200 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-blue-700/30 hover:-translate-y-0.5">
              <Upload className="w-4 h-4" />
              Upload PDF
              <input type="file" accept=".pdf" className="hidden" onChange={handleUploadSelect} />
            </label>
          </div>
        </div>
      </div>

      {/* ── 2-Column Layout ────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">

        {/* ══ LEFT COLUMN ══════════════════════════════════════════════════ */}
        <div className="space-y-5">

          {/* 1. Continue Reading — Enhanced */}
          {heroDoc ? (
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#0F1520] to-[#0C1019] p-7 shadow-2xl">
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/8 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.15em]">Continue Reading</span>
                  </div>
                  {isEditingHero ? (
                    <div className="flex items-center gap-2">
                      <input 
                        autoFocus
                        value={editHeroName}
                        onChange={(e) => setEditHeroName(e.target.value)}
                        onBlur={handleHeroRenameSubmit}
                        onKeyDown={(e) => { 
                          if (e.key === 'Enter') handleHeroRenameSubmit(); 
                          if (e.key === 'Escape') { 
                            setIsEditingHero(false); 
                            setEditHeroName(heroDoc.filename.replace(/\.pdf$/i, '').trim()); 
                          } 
                        }}
                        className="w-full max-w-[300px] bg-[#0a0d14] border border-blue-500/50 rounded-md px-2 py-0.5 text-lg font-bold text-white outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group/edit">
                      <h2 
                        className="text-lg font-bold text-white truncate cursor-text" 
                        title={heroDoc.filename.replace(/\.pdf$/i, '').trim()}
                        onClick={() => setIsEditingHero(true)}
                      >
                        {heroDoc.filename.replace(/\.pdf$/i, '').trim()}
                      </h2>
                      <button
                    onClick={handleEditClick}
                    className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-zinc-500 hover:text-indigo-400 transition-all opacity-0 group-hover:opacity-100 mt-1"
                    title="Rename document"
                  >      <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-zinc-500 mt-0.5">~{estimateMinutes(heroDoc)} min left · Last opened {new Date(heroDoc.lastOpened || heroDoc.uploadDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                </div>
                <Link
                  href={`/reader/${heroDoc._id}`}
                  className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-700/30 hover:-translate-y-0.5 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-white" /> Resume
                </Link>
              </div>

              {/* Progress with checkpoint markers */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-zinc-500 mb-1">
                  <span>{heroProgress}% complete</span>
                  <span className="text-zinc-400">~{estimateMinutes(heroDoc)} min remaining</span>
                </div>
                <div className="relative h-2 bg-white/5 rounded-full overflow-visible">
                  {/* Fill */}
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 to-indigo-400 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(99,102,241,0.55)]"
                    style={{ width: `${progress}%` }}
                  />
                  {/* Checkpoint ticks */}
                  {CHECKPOINTS.map((cp) => (
                    <div
                      key={cp}
                      title={`${cp}% — AI Flashcard checkpoint`}
                      style={{ left: `${cp}%` }}
                      className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-3.5 rounded-sm z-10 transition-colors ${
                        progress >= cp ? 'bg-indigo-300' : 'bg-white/20'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-zinc-600 pt-1">
                  {CHECKPOINTS.map((cp) => (
                    <div key={cp} className="flex flex-col items-center gap-0.5" style={{ width: 0, position: 'relative', left: `calc(${cp}% - 12px)` }}>
                      <Brain className="w-2.5 h-2.5 text-zinc-700" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Next checkpoint callout */}
              <div className="mt-5 flex items-center gap-2.5 bg-indigo-500/8 border border-indigo-500/15 rounded-xl px-4 py-2.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                <p className="text-xs text-indigo-300">
                  <span className="font-semibold">Next checkpoint at {CHECKPOINTS.find(c => c > heroProgress) || 90}%</span> — AI will generate flashcards from this section
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/8 bg-white/[0.02] flex flex-col items-center justify-center py-16 text-center">
              <Brain className="w-10 h-10 text-zinc-700 mb-4" />
              <h3 className="text-sm font-semibold text-zinc-500">No documents yet</h3>
              <p className="text-xs text-zinc-700 mt-1">Upload a PDF to begin</p>
            </div>
          )}

          {/* 2. Reading Analytics */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#0F1520] p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Reading Analytics</h3>
              </div>
              <span className="text-[10px] text-zinc-600 border border-white/8 rounded-lg px-2 py-1">Last 7 sessions</span>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Avg WPM',    value: '318',   delta: '+23%', col: 'text-blue-400'   },
                { label: 'Time Saved', value: '4.2 hr', delta: 'vs avg reader', col: 'text-emerald-400' },
                { label: 'Sessions',   value: '14',    delta: 'this month', col: 'text-violet-400'  },
              ].map(({ label, value, delta, col }) => (
                <div key={label} className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3.5">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">{label}</p>
                  <p className={`text-xl font-extrabold ${col}`}>{value}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{delta}</p>
                </div>
              ))}
            </div>

            {/* Sparkline */}
            <div className="bg-white/[0.02] rounded-xl p-3 border border-white/[0.04]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-zinc-600 uppercase tracking-wider">WPM over 15 sessions</span>
                <div className="flex items-center gap-1 text-emerald-400">
                  <TrendingUp className="w-3 h-3" />
                  <span className="text-[10px] font-bold">+57% since start</span>
                </div>
              </div>
              <Sparkline data={WPM_TREND} color="#3b82f6" />
            </div>
          </div>

          {/* 3. AI Insights */}
          <div className="rounded-2xl border border-violet-500/10 bg-gradient-to-br from-[#0F1022] to-[#0C0E1A] p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-lg bg-violet-500/15 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              </div>
              <h3 className="text-sm font-bold text-white">AI Reading Insights</h3>
            </div>

            <div className="space-y-3">
              {[
                { insight: 'You retain best when reading at 280–320 WPM.', tag: 'Optimal range' },
                { insight: 'Your comprehension peaks in sessions under 22 minutes.', tag: 'Session timing' },
                { insight: 'You complete 2× more flashcards in morning sessions.', tag: 'Time of day' },
              ].map(({ insight, tag }) => (
                <div key={tag} className="flex items-start gap-3 bg-white/[0.03] border border-white/[0.05] rounded-xl p-3.5">
                  <div className="w-1 h-full min-h-[32px] rounded-full bg-violet-500/50 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider mb-0.5">{tag}</p>
                    <p className="text-xs text-zinc-300 leading-relaxed">{insight}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══ RIGHT COLUMN ═════════════════════════════════════════════════ */}
        <div className="space-y-5">

          {/* 1. Weekly Focus */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#0F1520] p-5 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Weekly Focus</h3>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <Ring pct={61} size={76} stroke={7} color="#10b981" />
              <div>
                <p className="text-2xl font-extrabold text-white">61%</p>
                <p className="text-xs text-zinc-500">of weekly goal</p>
                <p className="text-[11px] text-emerald-400 font-semibold mt-1">37 min left today</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Weekly target</span><span className="text-zinc-300">3h 20m / 5h</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full w-[61%] rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              </div>
            </div>

            <div className="mt-4 p-3 bg-emerald-500/6 border border-emerald-500/12 rounded-xl">
              <p className="text-[11px] text-emerald-400 font-semibold mb-0.5">Suggested today</p>
              <p className="text-xs text-zinc-400">Read for 40 min to stay on track</p>
            </div>
          </div>

          {/* 2. Flashcard Performance */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#0F1520] p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Flashcard Performance</h3>
              </div>
            </div>

            {/* Accuracy ring */}
            <div className="flex items-center gap-4 mb-4">
              <Ring pct={78} size={72} stroke={6} color="#3b82f6" />
              <div className="flex-1">
                <p className="text-2xl font-extrabold text-white">78%</p>
                <p className="text-xs text-zinc-500 mb-1">Accuracy rate</p>
                <div className="flex items-center gap-1">
                  <div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full w-[78%] bg-blue-500 rounded-full shadow-[0_0_6px_rgba(59,130,246,0.5)]" />
                  </div>
                  <span className="text-[10px] text-zinc-600">Mastery</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { icon: CheckCircle2, v: '142', l: 'Cards mastered', c: 'text-emerald-400' },
                { icon: RotateCcw,    v: '18',  l: 'Due for review',  c: 'text-amber-400'  },
              ].map(({ icon: Icon, v, l, c }) => (
                <div key={l} className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3 flex items-start gap-2">
                  <Icon className={`w-3.5 h-3.5 ${c} mt-0.5 flex-shrink-0`} />
                  <div>
                    <p className={`text-base font-extrabold ${c}`}>{v}</p>
                    <p className="text-[10px] text-zinc-600">{l}</p>
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm hover:from-blue-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-blue-700/30 hover:-translate-y-0.5 transition-all">
              <Brain className="w-3.5 h-3.5" /> Start Review Session
            </button>
          </div>

          {/* 3. Streak & Habit Tracker */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#0F1520] p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <h3 className="text-sm font-bold text-white">Reading Streak</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold text-orange-400">6</span>
                <span className="text-xs text-zinc-600">days</span>
              </div>
            </div>

            {/* Mini calendar */}
            <div className="mb-4">
              <div className="flex justify-between text-[10px] text-zinc-700 mb-2">
                {['M','T','W','T','F','S','S'].map((d, i) => (
                  <span key={i} className="w-7 text-center">{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {CALENDAR_DAYS.map(({ day, active }) => (
                  <div
                    key={day}
                    className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-semibold transition-colors ${
                      active
                        ? 'bg-orange-500/20 border border-orange-500/30 text-orange-300'
                        : 'bg-white/[0.02] border border-white/[0.04] text-zinc-700'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 bg-orange-500/6 border border-orange-500/12 rounded-xl px-3.5 py-2.5">
              <Flame className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
              <p className="text-[11px] text-orange-300 font-medium">Read today to keep your streak alive</p>
            </div>
          </div>

          {/* Active Project Summary */}
          {activeProject && (
            <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-[#0e1222] to-[#0A0D17] p-5 shadow-[0_0_30px_rgba(99,102,241,0.05)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Active Project</h3>
                </div>
                <span className="text-[10px] text-zinc-500 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">{activeProject.name}</span>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-xs text-zinc-400 mb-1.5 font-medium">
                  <span>Overall Completion</span>
                  <span className="text-indigo-300">{apProgressAvg}%</span>
                </div>
                <div className="h-2 bg-black/40 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-400 rounded-full" style={{ width: `${apProgressAvg}%` }} />
                </div>
              </div>

              {nextDocInProject && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Up Next</p>
                  <Link 
                    href={`/reader/${nextDocInProject._id}`}
                    className="flex justify-between items-center bg-white/[0.03] border border-white/[0.05] rounded-xl p-3 hover:bg-white/[0.06] transition-colors group"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <p className="text-sm font-bold text-zinc-200 truncate group-hover:text-white transition-colors">{nextDocInProject.filename.replace(/\.pdf$/i, '')}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">{calculateProgress(nextDocInProject)}% complete</p>
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/20 transition-colors">
                      <Play className="w-3 h-3 text-indigo-400 fill-indigo-400" />
                    </div>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Library quick-list */}
          {restDocs.length > 0 && !activeProject && (
            <div className="rounded-2xl border border-white/[0.07] bg-[#0F1520] p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white">Library</h3>
                <span className="text-[10px] text-zinc-600">{docs.length} docs</span>
              </div>
              <div className="space-y-2">
                {restDocs.slice(0, 4).map((doc) => (
                  <Link
                    key={doc._id}
                    href={`/reader/${doc._id}`}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-zinc-200 truncate">{doc.filename}</p>
                      <p className="text-[10px] text-zinc-600">{calculateProgress(doc)}% · ~{estimateMinutes(doc)} min left</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
