'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Zap, Clock, Flame, Upload, MoreHorizontal,
  BookOpen, Play, Trash2, Loader2, ChevronRight,
  Target, Brain,
} from 'lucide-react';
import { deleteDocumentAction } from '@/app/actions/library';

interface Doc {
  _id: string;
  filename: string;
  uploadDate: string;
  wordCount?: number;
}

interface DashboardProps {
  user: { firstName: string | null };
  documents: Doc[];
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// Estimate read time from assumed ~300 WPM and rough word count
function estimateMinutes(doc: Doc) {
  const wc = doc.wordCount ?? 5000;
  return Math.max(1, Math.round(wc / 300));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Dashboard({ user, documents }: DashboardProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen]     = useState<string | null>(null);
  const [uploading, setUploading]   = useState(false);

  const heroDoc   = documents[0] ?? null;
  const restDocs  = documents.slice(1);

  const handleDelete = async (id: string) => {
    setMenuOpen(null);
    setDeletingId(id);
    await deleteDocumentAction(id);
    router.refresh();
    setDeletingId(null);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      if (res.ok) router.refresh();
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1115] text-white">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-violet-900/10 pointer-events-none" />
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-blue-600/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-6 pt-12 pb-10">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm text-blue-400 font-medium tracking-widest uppercase mb-1">Dashboard</p>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">
                {getGreeting()}, {user.firstName ?? 'Scholar'}.
              </h1>
              <p className="mt-1.5 text-[15px] text-zinc-400">
                You have <span className="text-white font-semibold">{documents.length}</span> document{documents.length !== 1 ? 's' : ''} in your library.
              </p>
            </div>

            {/* Stats strip */}
            <div className="hidden md:flex items-center gap-3">
              {[
                { icon: Zap,   label: 'Avg Speed',  value: '300 WPM' },
                { icon: Clock, label: 'This Week',  value: '—' },
                { icon: Flame, label: 'Streak',     value: '—' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-2.5 bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 backdrop-blur-sm">
                  <Icon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p>
                    <p className="text-sm font-bold text-white leading-tight">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="mt-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-24 space-y-6">

        {/* ── Hero: Continue Reading ───────────────────────────────────────── */}
        {heroDoc ? (
          <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br from-[#161B27] to-[#111420] p-8 shadow-2xl">
            {/* Glow accent */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Continue Reading</span>
                </div>

                <h2 className="text-xl font-bold text-white truncate mb-1" title={heroDoc.filename}>
                  {heroDoc.filename}
                </h2>
                <p className="text-sm text-zinc-500 mb-5">
                  Last opened {formatDate(heroDoc.uploadDate)} · ~{estimateMinutes(heroDoc)} min read
                </p>

                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>Progress</span>
                    <span className="text-zinc-300 font-medium">0%</span>
                  </div>
                  <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"
                      style={{ width: '0%' }}
                    />
                  </div>
                </div>
              </div>

              <Link
                href={`/reader/${heroDoc._id}`}
                className="flex-shrink-0 flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-blue-700/30 hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all duration-200"
              >
                <Play className="w-4 h-4 fill-white" />
                Resume Reading
              </Link>
            </div>
          </div>
        ) : (
          /* Empty hero */
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/2 flex flex-col items-center justify-center py-16 text-center">
            <Brain className="w-10 h-10 text-zinc-600 mb-4" />
            <h3 className="text-base font-semibold text-zinc-400 mb-1">Your library is empty</h3>
            <p className="text-sm text-zinc-600 max-w-xs">Upload your first PDF to start reading with AI assistance</p>
          </div>
        )}

        {/* ── Daily Goal ──────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-white/8 bg-[#13161E] px-6 py-4 flex items-center gap-5">
          <div className="p-2 rounded-lg bg-violet-500/10 flex-shrink-0">
            <Target className="w-5 h-5 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-white">Daily Reading Goal</span>
              <span className="text-xs text-zinc-500">0 / 20 min</span>
            </div>
            <div className="h-1 bg-white/6 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400 shadow-[0_0_6px_rgba(167,139,250,0.5)]" style={{ width: '0%' }} />
            </div>
          </div>
          <span className="text-xs text-zinc-600 flex-shrink-0">Start reading to track</span>
        </div>

        {/* ── Library Grid ─────────────────────────────────────────────────── */}
        {restDocs.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">Library</h2>
              <span className="text-xs text-zinc-600">{restDocs.length} document{restDocs.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {restDocs.map((doc) => (
                <div
                  key={doc._id}
                  className="relative group rounded-xl border border-white/6 bg-[#13161E] hover:border-white/12 hover:bg-[#161A24] transition-all duration-200 overflow-hidden"
                >
                  {/* Top accent */}
                  <div className="h-0.5 bg-gradient-to-r from-blue-600/40 via-indigo-500/40 to-transparent" />

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3
                        className="text-sm font-semibold text-zinc-100 line-clamp-2 leading-snug flex-1 min-w-0"
                        title={doc.filename}
                      >
                        {doc.filename}
                      </h3>

                      {/* Menu */}
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={() => setMenuOpen(menuOpen === doc._id ? null : doc._id)}
                          className="p-1 rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-white/6 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {menuOpen === doc._id && (
                          <div className="absolute right-0 top-7 z-20 bg-[#1C2030] border border-white/10 rounded-xl shadow-2xl w-36 py-1 text-xs">
                            <Link
                              href={`/reader/${doc._id}`}
                              className="flex items-center gap-2 px-3 py-2 text-zinc-300 hover:bg-white/6 hover:text-white transition-colors"
                              onClick={() => setMenuOpen(null)}
                            >
                              <Play className="w-3.5 h-3.5" /> Open Reader
                            </Link>
                            <button
                              onClick={() => handleDelete(doc._id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              {deletingId === doc._id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3 text-[11px] text-zinc-600 mb-3">
                      <span>{formatDate(doc.uploadDate)}</span>
                      <span>·</span>
                      <span>~{estimateMinutes(doc)} min left</span>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1.5">
                      <div className="h-0.5 bg-white/6 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500/70 rounded-full" style={{ width: '0%' }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-zinc-700">
                        <span>0% complete</span>
                        <Link
                          href={`/reader/${doc._id}`}
                          className="text-blue-500 hover:text-blue-400 font-semibold flex items-center gap-0.5 transition-colors"
                        >
                          Read <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── FAB: Upload ──────────────────────────────────────────────────────── */}
      <label className={`fixed bottom-8 right-8 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-full font-bold text-sm cursor-pointer shadow-2xl transition-all duration-200 select-none ${
        uploading
          ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
          : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(99,102,241,0.45)] active:scale-95'
      }`}>
        {uploading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
        ) : (
          <><Upload className="w-4 h-4" /> Upload PDF</>
        )}
        <input
          type="file"
          accept=".pdf"
          className="hidden"
          disabled={uploading}
          onChange={handleUpload}
        />
      </label>

      {/* Close menu on backdrop click */}
      {menuOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
      )}
    </div>
  );
}
