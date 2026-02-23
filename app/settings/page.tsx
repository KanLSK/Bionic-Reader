'use client';

import React, { useEffect, useState } from 'react';
import TopNav from '@/components/TopNav';
import { useUser } from '@clerk/nextjs';
import { Settings, Save, RefreshCw } from 'lucide-react';
import { getUserSettingsAction, updateUserSettingsAction } from '@/app/actions/flashcards';

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    sm2: {
      defaultEaseFactor: 2.5,
      intervalModifier: 1.0,
      hardMultiplier: 1.2,
      easyMultiplier: 1.3,
    },
    bionicReading: {
      fixation: 50,
      saccade: 10,
    }
  });

  useEffect(() => {
    if (isLoaded && user) {
      getUserSettingsAction().then(res => {
        if (res.success && res.settings) {
          setSettings(prev => ({
            sm2: { ...prev.sm2, ...res.settings?.sm2 },
            bionicReading: { ...prev.bionicReading, ...res.settings?.bionicReading }
          }));
        }
        setLoading(false);
      }).catch(err => {
        console.error("Failed to load settings:", err);
        setLoading(false);
      });
    }
  }, [isLoaded, user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUserSettingsAction(settings);
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const handleChange = (section: 'sm2' | 'bionicReading', field: string, value: number) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value
      }
    }));
  };


  return (
    <div className="min-h-screen bg-[#090C12] text-white font-sans overflow-x-hidden selection:bg-indigo-500/30">
      <TopNav activePage="" user={{ firstName: user?.firstName ?? null }} />

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
            <Settings className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-wide">Preferences</h1>
            <p className="text-sm text-zinc-400">Configure your spaced repetition algorithm and reading experience.</p>
          </div>
        </div>

        {(!isLoaded || loading) ? (
          <div className="space-y-8 animate-pulse">
            <div className="rounded-xl border border-white/[0.05] bg-[#0A0D15] overflow-hidden">
               <div className="px-6 py-4 border-b border-white/[0.05] bg-[#0D111A]">
                  <div className="h-4 w-64 bg-white/10 rounded" />
               </div>
               <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                 {[1, 2, 3, 4].map(i => (
                   <div key={i} className="flex flex-col gap-2">
                     <div className="h-3 w-32 bg-white/10 rounded" />
                     <div className="h-9 w-full bg-white/[0.04] rounded" />
                     <div className="h-8 w-full bg-white/[0.02] rounded mt-1" />
                   </div>
                 ))}
               </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* SM-2 Algorithm Settings */}
            <div className="rounded-xl border border-white/[0.05] bg-[#0A0D15] overflow-hidden">
              <div className="px-6 py-4 border-b border-white/[0.05] bg-[#0D111A]">
                <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-emerald-400" /> Spaced Repetition (SM-2) Multipliers
                </h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Default Ease Factor</label>
                    <input 
                      type="number" step="0.1"
                      value={settings.sm2.defaultEaseFactor}
                      onChange={(e) => handleChange('sm2', 'defaultEaseFactor', parseFloat(e.target.value))}
                      className="w-full bg-[#0D111A] border border-white/[0.08] rounded pl-3 pr-2 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1.5 leading-relaxed">Starting multiplier for new cards. Lower means more frequent initial reviews (default: 2.5).</p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Interval Modifier</label>
                    <input 
                      type="number" step="0.1"
                      value={settings.sm2.intervalModifier}
                      onChange={(e) => handleChange('sm2', 'intervalModifier', parseFloat(e.target.value))}
                      className="w-full bg-[#0D111A] border border-white/[0.08] rounded pl-3 pr-2 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1.5 leading-relaxed">Global multiplier to increase/decrease all intervals. Set to 1.1 to review 10% less often (default: 1.0).</p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Hard Multiplier</label>
                    <input 
                      type="number" step="0.1"
                      value={settings.sm2.hardMultiplier}
                      onChange={(e) => handleChange('sm2', 'hardMultiplier', parseFloat(e.target.value))}
                      className="w-full bg-[#0D111A] border border-white/[0.08] rounded pl-3 pr-2 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1.5 leading-relaxed">Multiplier applied when you select &apos;Hard&apos;. Controls how slowly intervals grow (default: 1.2).</p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Easy Multiplier</label>
                    <input 
                      type="number" step="0.1"
                      value={settings.sm2.easyMultiplier}
                      onChange={(e) => handleChange('sm2', 'easyMultiplier', parseFloat(e.target.value))}
                      className="w-full bg-[#0D111A] border border-white/[0.08] rounded pl-3 pr-2 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1.5 leading-relaxed">Bonus multiplier applied when you select &apos;Easy&apos;. Controls how fast intervals grow (default: 1.3).</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={handleSave} 
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
