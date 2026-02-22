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
      <div className="max-w-7xl mx-auto px-8 h-14 flex items-center justify-between gap-6">

        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-700/30">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-extrabold tracking-tight text-white">Bionic Speed</span>
        </div>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-0.5">
          {NAV_LINKS.map(({ label, href }) => {
            const active = label === activePage;
            return (
              <Link
                key={label}
                href={href}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
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
        <div className="flex items-center gap-4">
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
