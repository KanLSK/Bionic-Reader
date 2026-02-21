'use client';

import React, { useState, useEffect } from 'react';
import { X, Upload, Loader2, Folder, Tag as TagIcon } from 'lucide-react';
import { getUserProjectsAction, createProjectAction } from '@/app/actions/projects';
import { getUserTagsAction, createTagAction } from '@/app/actions/tags';

interface Tag { _id: string; name: string; color?: string; }
interface Project { _id: string; name: string; }

interface UploadModalProps {
  file: File;
  onClose: () => void;
  onConfirm: (file: File, projectId: string | null, tags: string[]) => Promise<void>;
}

export default function UploadModal({ file, onClose, onConfirm }: UploadModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const [isUploading, setIsUploading] = useState(false);

  // Quick create state
  const [newProjectName, setNewProjectName] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);

  const [newTagName, setNewTagName] = useState('');
  const [creatingTag, setCreatingTag] = useState(false);

  useEffect(() => {
    async function loadData() {
      const pRes = await getUserProjectsAction();
      const tRes = await getUserTagsAction();
      if (pRes.success) setProjects(pRes.projects);
      if (tRes.success) setTags(tRes.tags);
      setLoadingInitial(false);
    }
    loadData();
  }, []);

  const handleConfirm = async () => {
    setIsUploading(true);
    try {
      await onConfirm(file, selectedProjectId || null, selectedTags);
      onClose();
    } catch (err) {
      console.error(err);
      setIsUploading(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    );
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setCreatingProject(true);
    const res = await createProjectAction(newProjectName.trim());
    if (res.success) {
      setProjects([...projects, res.project]);
      setSelectedProjectId(res.project._id);
      setNewProjectName('');
    }
    setCreatingProject(false);
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setCreatingTag(true);
    const res = await createTagAction(newTagName.trim(), '#818cf8'); // default color
    if (res.success) {
      setTags([...tags, res.tag]);
      setSelectedTags([...selectedTags, res.tag._id]);
      setNewTagName('');
    }
    setCreatingTag(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative"
        style={{ background: 'rgba(15,20,30,0.95)' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Upload className="w-4 h-4 text-blue-400" /> Upload Document
          </h2>
          <button onClick={onClose} disabled={isUploading} className="text-zinc-500 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* File Info */}
          <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <Upload className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{file.name}</p>
              <p className="text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>

          {loadingInitial ? (
            <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-zinc-500" /></div>
          ) : (
            <>
              {/* Project Selection */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  <Folder className="w-3.5 h-3.5 text-indigo-400" /> Project
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full bg-[#0a0d14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 focus:outline-none mb-2 outline-none appearance-none"
                >
                  <option value="">📁 Unsorted / All Documents</option>
                  {projects.map(p => (
                    <option key={p._id} value={p._id}>📁 {p.name}</option>
                  ))}
                </select>
                
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    placeholder="New project name..." 
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                    className="flex-1 bg-transparent border-none text-xs text-zinc-300 placeholder:text-zinc-600 focus:ring-0 px-2"
                  />
                  <button 
                    onClick={handleCreateProject}
                    disabled={creatingProject || !newProjectName.trim()}
                    className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
                  >
                    {creatingProject ? 'Adding...' : 'Add Project'}
                  </button>
                </div>
              </div>

              {/* Tag Selection */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  <TagIcon className="w-3.5 h-3.5 text-emerald-400" /> Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {tags.map(t => (
                    <button
                      key={t._id}
                      onClick={() => toggleTag(t._id)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                        selectedTags.includes(t._id)
                          ? `bg-emerald-500/20 text-emerald-300 border-emerald-500/30`
                          : `bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10`
                      }`}
                    >
                      #{t.name}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    placeholder="New tag..." 
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                    className="flex-1 bg-transparent border-none text-xs text-zinc-300 placeholder:text-zinc-600 focus:ring-0 px-2"
                  />
                  <button 
                    onClick={handleCreateTag}
                    disabled={creatingTag || !newTagName.trim()}
                    className="text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                  >
                    {creatingTag ? 'Adding...' : '+ Add Tag'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02] flex justify-end gap-3">
          <button 
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition"
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirm}
            disabled={isUploading || loadingInitial}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 shadow-lg shadow-blue-500/25 transition"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {isUploading ? 'Uploading & Processing...' : 'Confirm Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
