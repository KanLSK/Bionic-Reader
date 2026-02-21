'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Upload, Loader2, BookOpen, Brain, Search, MoreHorizontal,
  Play, CheckCircle2, Trash2, Archive, FileText, LayoutGrid, List,
  FolderOpen, Folder, Tag as TagIcon, Clock, Battery, Edit2
} from 'lucide-react';
import { deleteDocumentAction, updateDocumentMetadataAction } from '@/app/actions/library';
import { getUserProjectsAction } from '@/app/actions/projects';
import { getUserTagsAction } from '@/app/actions/tags';
import TopNav from './TopNav';
import UploadModal from './UploadModal';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Tag {
  _id: string;
  name: string;
  color: string;
}

interface Project {
  _id: string;
  name: string;
  color?: string;
  documentCount?: number;
}

interface Doc {
  _id: string;
  filename: string;
  uploadDate: string;
  wordCount?: number;
  currentWordIndex?: number;
  lastOpened?: string;
  projectId?: string | null;
  tags?: Tag[];
  status?: string;
  totalReadingTimeMs?: number;
  flashcardCount?: number;
}

interface LibraryPageProps {
  user: { firstName: string | null };
  documents: Doc[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function estimateMinutes(doc: Doc) {
  const wordsRemaining = Math.max(0, (doc.wordCount ?? 5000) - (doc.currentWordIndex ?? 0));
  return Math.max(1, Math.round(wordsRemaining / 300));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function calculateProgress(doc: Doc) {
  const total = doc.wordCount ?? 5000;
  if (total === 0) return 0;
  const current = doc.currentWordIndex ?? 0;
  return Math.min(100, Math.floor((current / total) * 100));
}

function getStatusColor(status?: string) {
  switch (status) {
    case 'Completed': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    case 'Needs Review': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    case 'Paused': return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20';
    case 'Archived': return 'text-zinc-600 bg-zinc-600/10 border-zinc-600/20';
    default: return 'text-blue-400 bg-blue-400/10 border-blue-400/20'; // In Progress
  }
}

// ── Card ──────────────────────────────────────────────────────────────────────
function DocCard({
  doc,
  onDelete,
  onUpdateStatus,
  onRename,
}: {
  doc: Doc;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onRename: (id: string, newName: string) => void;
}) {
  const progress    = calculateProgress(doc);
  const completed   = progress >= 90;
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const title = doc.filename.replace(/\.pdf$/i, '').trim();
  const [editName, setEditName] = useState(title);

  const handleDelete = async () => {
    setDeleting(true);
    await deleteDocumentAction(doc._id);
    onDelete(doc._id);
  };

  const handleRenameSubmit = async () => {
    setIsEditing(false);
    if (editName.trim() && editName.trim() !== title) {
      const newFilename = editName.trim() + '.pdf';
      onRename(doc._id, newFilename);
      await updateDocumentMetadataAction(doc._id, { filename: newFilename });
    } else {
      setEditName(title);
    }
  };

  const status = doc.status || 'In Progress';

  return (
    <div className="group relative rounded-2xl border border-white/[0.07] bg-[#12161f] shadow-lg shadow-black/20 hover:bg-[#161b26] hover:border-white/[0.12] hover:shadow-2xl hover:shadow-black/50 hover:-translate-y-1 transition-all duration-300 flex flex-col">
      
      {/* Top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl ${status === 'Completed' ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

      <div className="flex flex-col flex-1 p-5 gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="min-w-0 flex-1">
              {isEditing ? (
                <input 
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleRenameSubmit}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') { setIsEditing(false); setEditName(title); } }}
                  className="w-full bg-[#0a0d14] border border-blue-500/50 rounded-md px-2 py-0.5 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              ) : (
                <h3 
                  className="text-sm font-bold text-white leading-tight truncate px-1 cursor-text" 
                  title={title}
                  onClick={() => setIsEditing(true)}
                >
                  {title}
                </h3>
              )}
              <p className="text-[11px] text-zinc-500 mt-1 px-1">
                Last opened • {formatDate(doc.lastOpened || doc.uploadDate)}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex flex-col gap-1 items-end">
            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${getStatusColor(status)}`}>
              {status}
            </span>
            {doc.flashcardCount ? (
              <span className="flex items-center gap-1 text-[10px] text-violet-400 bg-violet-400/10 px-1.5 py-0.5 rounded-md">
                <Brain className="w-3 h-3" /> {doc.flashcardCount}
              </span>
            ) : null}
          </div>
        </div>

        {/* Tags Row */}
        {doc.tags && doc.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {doc.tags.map(t => (
              <span key={t._id} className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border border-white/5 bg-white/[0.03] text-zinc-300">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.color || '#818cf8' }} />
                {t.name}
              </span>
            ))}
          </div>
        )}

        {/* Progress */}
        <div className="space-y-1.5 mt-auto">
          <div className="flex justify-between items-center px-1">
            <span className="text-[11px] text-zinc-400 font-medium">{progress}% complete</span>
            <span className="text-[11px] text-zinc-500 flex items-center gap-1">
              <Clock className="w-3 h-3" /> ~{estimateMinutes(doc)}m left
            </span>
          </div>

          <div className="relative h-1.5 bg-black/40 rounded-full overflow-hidden shadow-inner">
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${completed ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gradient-to-r from-blue-500 to-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-3 mt-1 border-t border-white/5">
          <Link
            href={`/reader/${doc._id}`}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
              completed
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 hover:shadow-indigo-500/25'
            }`}
          >
            {completed ? <><CheckCircle2 className="w-3.5 h-3.5" /> Review</> : <><Play className="w-3.5 h-3.5 fill-white" /> Resume</>}
          </Link>

          <div className="flex items-center gap-1">
            {/* 3-dot menu */}
            <div className="relative z-50">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 bottom-full mb-2 z-50 w-48 rounded-xl border border-white/10 bg-[#1a1f2e] shadow-2xl shadow-black/80 overflow-hidden py-1 backdrop-blur-xl origin-bottom-right animate-in fade-in slide-in-from-bottom-2">
                    <button
                      onClick={() => { setIsEditing(true); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Rename
                    </button>
                    <div className="h-px w-full bg-white/5 my-1" />
                    <div className="px-3 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">Move to...</div>
                    {['In Progress', 'Completed', 'Paused', 'Needs Review'].map(st => (
                      <button 
                        key={st}
                        onClick={() => { onUpdateStatus(doc._id, st); setMenuOpen(false); }}
                        className={`w-full text-left px-3.5 py-1.5 text-xs transition-colors ${status === st ? 'text-blue-400 bg-blue-500/10' : 'text-zinc-300 hover:bg-white/5 hover:text-white'}`}
                      >
                        {st}
                      </button>
                    ))}
                    <div className="h-px w-full bg-white/5 my-1" />
                    <button className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-zinc-400 hover:bg-white/5 hover:text-white transition-colors">
                      <Archive className="w-3.5 h-3.5" /> Archive
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    >
                      {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      {deleting ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function LibraryPage({ user, documents: initialDocs }: LibraryPageProps) {
  const router = useRouter();
  const [docs, setDocs] = useState(initialDocs);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null); // null = All Documents
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  
  const [search, setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sort, setSort]           = useState<'recent' | 'progress' | 'alpha'>('recent');
  const [viewMode, setViewMode]   = useState<'grid' | 'list'>('grid');

  const [uploadFileQueue, setUploadFileQueue] = useState<File | null>(null);

  // Focus tracking for UI polish
  const activeProject = useMemo(() => projects.find(p => p._id === activeProjectId), [projects, activeProjectId]);

  // Load Projects and Tags
  useEffect(() => {
    async function load() {
      const pRes = await getUserProjectsAction();
      const tRes = await getUserTagsAction();
      if (pRes.success) setProjects(pRes.projects);
      if (tRes.success) setTags(tRes.tags);
    }
    load();
  }, [docs]); // reload counts when docs change

  // Upload Handlers
  const handleUploadSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFileQueue(file);
    e.target.value = '';
  };

  const handleConfirmUpload = async (file: File, projectId: string | null, selectedTags: string[]) => {
    const form = new FormData();
    form.append('file', file);
    if (projectId) form.append('projectId', projectId);
    if (selectedTags.length > 0) form.append('tags', JSON.stringify(selectedTags));

    const res = await fetch('/api/upload', { method: 'POST', body: form });
    if (res.ok) {
      setUploadFileQueue(null);
      // Wait a moment then refresh to get new doc
      setTimeout(() => router.refresh(), 500); 
    } else {
      throw new Error('Upload failed');
    }
  };

  const handleDelete = (id: string) => setDocs((prev) => prev.filter((d) => d._id !== id));

  const handleUpdateStatus = async (id: string, status: string) => {
    setDocs(prev => prev.map(d => d._id === id ? { ...d, status } : d));
    await updateDocumentMetadataAction(id, { status });
  };

  const handleRename = (id: string, newName: string) => {
    setDocs(prev => prev.map(d => d._id === id ? { ...d, filename: newName } : d));
  };

  // Filtered + sorted docs
  const displayed = useMemo(() => {
    let arr = [...docs];

    // Project filter
    if (activeProjectId) {
      arr = arr.filter(d => d.projectId === activeProjectId);
    }

    // Tag filter
    if (activeTagId) {
      arr = arr.filter(d => d.tags?.some(t => t._id === activeTagId));
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((d) => d.filename.toLowerCase().includes(q));
    }

    // Status Filter
    if (filterStatus !== 'all') {
      arr = arr.filter(d => (d.status || 'In Progress') === filterStatus);
    }

    // Sort
    if (sort === 'alpha') {
      arr.sort((a, b) => a.filename.localeCompare(b.filename));
    } else if (sort === 'progress') {
      arr.sort((a, b) => calculateProgress(b) - calculateProgress(a));
    } else {
      arr.sort((a, b) => {
        const dA = new Date(a.lastOpened || a.uploadDate).getTime();
        const dB = new Date(b.lastOpened || b.uploadDate).getTime();
        return dB - dA;
      });
    }

    return arr;
  }, [docs, search, filterStatus, sort, activeProjectId, activeTagId]);

  // Aggregate project stats
  const projectStats = useMemo(() => {
    if (!activeProject && activeProjectId !== null) return null;
    const projectDocs = activeProjectId ? docs.filter(d => d.projectId === activeProjectId) : docs;
    const totalReadingTime = projectDocs.reduce((acc, d) => acc + (d.totalReadingTimeMs || 0), 0);
    const totalFlashcards = projectDocs.reduce((acc, d) => acc + (d.flashcardCount || 0), 0);
    
    // Average completion
    const avgProgress = projectDocs.length 
      ? Math.round(projectDocs.reduce((acc, d) => acc + calculateProgress(d), 0) / projectDocs.length)
      : 0;

    return { totalReadingTime, totalFlashcards, avgProgress, count: projectDocs.length };
  }, [docs, activeProject, activeProjectId]);

  return (
    <div className="min-h-screen bg-[#090C12] text-white font-sans flex flex-col">
      <TopNav activePage="Library" user={user} />

      {uploadFileQueue && (
        <UploadModal 
          file={uploadFileQueue} 
          onClose={() => setUploadFileQueue(null)} 
          onConfirm={handleConfirmUpload} 
        />
      )}

      {/* Main Layout Grid */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto flex flex-col lg:grid lg:grid-cols-[280px_1fr] gap-8 px-6 lg:px-10 py-8">
        
        {/* ══ LEFT SIDEBAR ══════════════════════════════════════════════════ */}
        <aside className="flex flex-col gap-8 h-full order-last lg:order-first mt-8 lg:mt-0 pt-8 lg:pt-0 border-t border-white/10 lg:border-none">
          
          {/* Projects Section */}
          <div>
            <div className="flex items-center justify-between mb-3 px-2">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Storage & Projects</h3>
            </div>
            <div className="space-y-1">
              <button 
                onClick={() => { setActiveProjectId(null); setActiveTagId(null); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                  activeProjectId === null && activeTagId === null 
                    ? 'bg-blue-600/10 text-blue-400 font-bold' 
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <LayoutGrid className="w-4 h-4" />
                  <span className="text-sm">All Documents</span>
                </div>
                <span className="text-xs bg-white/5 px-2 py-0.5 rounded-md">{docs.length}</span>
              </button>

              {projects.map(p => (
                <button 
                  key={p._id}
                  onClick={() => { setActiveProjectId(p._id); setActiveTagId(null); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group ${
                    activeProjectId === p._id 
                      ? 'bg-blue-600/10 text-blue-400 font-bold' 
                      : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Folder className={`w-4 h-4 ${activeProjectId === p._id ? 'fill-blue-500/20 text-blue-400' : 'text-zinc-500 group-hover:text-zinc-400'}`} />
                    <span className="text-sm truncate max-w-[140px] text-left">{p.name}</span>
                  </div>
                  <span className="text-xs bg-white/5 px-2 py-0.5 rounded-md">{p.documentCount || 0}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tags Section */}
          <div>
            <div className="flex items-center justify-between mb-3 px-2">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Tags</h3>
            </div>
            <div className="flex flex-wrap gap-2 px-2">
              {tags.map(t => (
                <button
                  key={t._id}
                  onClick={() => setActiveTagId(activeTagId === t._id ? null : t._id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                    activeTagId === t._id 
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' 
                      : 'bg-transparent text-zinc-400 border-white/10 hover:border-white/20 hover:text-zinc-200 hover:bg-white/5'
                  }`}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.color || '#818cf8' }} />
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ══ MAIN PANEL ═══════════════════════════════════════════════════ */}
        <main className="flex flex-col w-full min-w-0">
          
          {/* Top Info Bar */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div className="flex-1">
              <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2 flex items-center gap-3">
                {activeProject ? (
                  <><FolderOpen className="w-7 h-7 text-indigo-400" /> {activeProject.name}</>
                ) : activeTagId ? (
                  <><TagIcon className="w-7 h-7 text-emerald-400" /> {tags.find(t=>t._id===activeTagId)?.name}</>
                ) : (
                  'All Documents'
                )}
              </h1>
              
              {/* Project Stats Banner */}
              {projectStats && (
                <div className="flex items-center gap-4 text-sm text-zinc-400 mt-3">
                  <div className="flex items-center gap-1.5">
                    <Battery className="w-4 h-4 text-blue-400" /> {projectStats.avgProgress}% Complete
                  </div>
                  <div className="w-1 h-1 rounded-full bg-zinc-700" />
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-400" /> {Math.round(projectStats.totalReadingTime / 60000)}m Total Time
                  </div>
                  {projectStats.totalFlashcards > 0 && (
                    <>
                      <div className="w-1 h-1 rounded-full bg-zinc-700" />
                      <div className="flex items-center gap-1.5">
                        <Brain className="w-4 h-4 text-violet-400" /> {projectStats.totalFlashcards} Flashcards
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm cursor-pointer shrink-0 transition-all duration-200 bg-white text-black hover:bg-zinc-200 hover:shadow-lg hover:shadow-white/10 hover:-translate-y-0.5">
              <Upload className="w-4 h-4" /> New Document
              <input type="file" accept=".pdf" className="hidden" onChange={handleUploadSelect} />
            </label>
          </div>

          {/* Control Strip */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-[#12161f] p-3 rounded-2xl border border-white/5">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search */}
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search in this view..."
                  className="w-full bg-[#0a0d14] border border-white/5 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
                />
              </div>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="appearance-none bg-[#0a0d14] border border-white/5 rounded-xl px-4 py-2 text-sm font-medium text-zinc-300 outline-none cursor-pointer focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Needs Review">Needs Review</option>
                <option value="Paused">Paused</option>
              </select>

              {/* Sort */}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as 'recent' | 'progress' | 'alpha')}
                className="appearance-none bg-[#0a0d14] border border-white/5 rounded-xl px-4 py-2 text-sm font-medium text-zinc-300 outline-none cursor-pointer focus:border-blue-500"
              >
                <option value="recent">Recently Opened</option>
                <option value="progress">Progress %</option>
                <option value="alpha">A-Z</option>
              </select>
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-1 bg-black/40 rounded-xl p-1 shrink-0 shadow-inner">
              <button
                onClick={() => setViewMode('grid')}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-[#2a3241] text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-[#2a3241] text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Grid View */}
          {displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center border border-dashed border-white/10 rounded-3xl bg-white/[0.01]">
              <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/5 flex items-center justify-center mb-6">
                <BookOpen className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-lg font-bold text-zinc-300 mb-2">No documents found</h3>
              <p className="text-sm text-zinc-500 max-w-sm">
                Try adjusting your filters, or upload a new PDF to this workspace.
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {displayed.map((doc) => (
                <DocCard 
                  key={doc._id} 
                  doc={doc} 
                  onDelete={handleDelete} 
                  onUpdateStatus={handleUpdateStatus} 
                  onRename={handleRename}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {displayed.map((doc) => {
                const progress  = calculateProgress(doc);
                const title     = doc.filename.replace(/\.pdf$/i, '').trim();
                const status    = doc.status || 'In Progress';
                
                return (
                  <div key={doc._id} className="group flex items-center gap-4 px-5 py-3.5 rounded-2xl border border-white/[0.07] bg-[#12161f] hover:bg-[#161b26] hover:border-white/[0.12] transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-blue-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold text-white truncate px-1">{title}</p>
                        {status !== 'In Progress' && (
                          <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${getStatusColor(status)}`}>
                            {status}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 px-1">Opened {formatDate(doc.lastOpened || doc.uploadDate)} • ~{estimateMinutes(doc)}m remaining</p>
                    </div>

                    <div className="hidden sm:flex items-center gap-3 w-32">
                      <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden shadow-inner">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-zinc-400 font-medium w-8 text-right">{progress}%</span>
                    </div>

                    <Link
                      href={`/reader/${doc._id}`}
                      className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors"
                    >
                      <Play className="w-4 h-4 fill-white translate-x-px" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
