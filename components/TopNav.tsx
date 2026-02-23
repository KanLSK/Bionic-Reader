import React from 'react';
import Link from 'next/link';
import { Zap, Settings } from 'lucide-react';

export const NAV_LINKS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Library',   href: '/library' },
  { label: 'Flashcards', href: '/flashcards' },
  { label: 'Analytics', href: '/analytics' },
];

interface TopNavProps {
  activePage: string;
  user: { firstName: string | null };
}

export default function TopNav({ activePage, user }: TopNavProps) {
  return (
    <nav className="relative z-10 border-b border-white/[0.06] bg-[#090C12]/80 backdrop-blur-xl sticky top-0">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between gap-2 md:gap-6">

        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0 mr-2 md:mr-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-700/30">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="hidden sm:block text-sm font-extrabold tracking-tight text-white">Bionic Speed</span>
        </div>

        {/* Nav links */}
        <div className="flex-1 flex overflow-x-auto items-center gap-1 scrollbar-hide shrink-0 mask-edges pb-0.5">
          {NAV_LINKS.map(({ label, href }) => {
            const active = label === activePage;
            return (
              <Link
                key={label}
                href={href}
                className={`shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-white/[0.07] text-white'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Actions & Avatar */}
        <div className="flex items-center gap-3 shrink-0 ml-2 md:ml-0">
          <Link href="/settings" className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors" title="Settings">
            <Settings className="w-4 h-4" />
          </Link>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-extrabold text-white shadow-md shrink-0">
            {(user?.firstName?.[0] ?? 'U').toUpperCase()}
          </div>
        </div>
      </div>
    </nav>
  );
}
