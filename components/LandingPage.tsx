'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SignedIn, SignedOut, SignUpButton, SignInButton, UserButton } from '@clerk/nextjs';
import {
  Zap, Brain, BarChart2, CheckCircle2, Lock,
  ChevronRight, Flame, Play, ArrowRight, Sparkles,
} from 'lucide-react';

// ── Scroll fade-in hook ────────────────────────────────────────────────────
function useFadeIn(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useFadeIn();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ── Bionic word formatter ──────────────────────────────────────────────────
function BionicWord({ word }: { word: string }) {
  const boldLen = Math.ceil(word.length * 0.5);
  return (
    <span className="inline-block mx-[2px]">
      <strong className="font-black text-white">{word.slice(0, boldLen)}</strong>
      <span className="text-zinc-400 font-medium">{word.slice(boldLen)}</span>
    </span>
  );
}

const DEMO_TEXT =
  'The pathogenesis of Leptospirosis involves spirochete invasion through epithelial barriers, triggering systemic inflammatory response syndrome and consequent multi-organ dysfunction.';

export default function LandingPage() {
  const [bionicActive, setBionicActive] = useState(false);
  const [demoProgress, setDemoProgress] = useState(0);
  const [flashcardVisible, setFlashcardVisible] = useState(false);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const demoRef = useRef<HTMLDivElement>(null);

  // Hero bionic text animation
  useEffect(() => {
    const t = setTimeout(() => setBionicActive(true), 900);
    return () => clearTimeout(t);
  }, []);

  // Demo scroll trigger
  useEffect(() => {
    const el = demoRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          let p = 0;
          const iv = setInterval(() => {
            p += 0.8;
            setDemoProgress(Math.min(p, 15));
            if (p >= 15) {
              clearInterval(iv);
              setTimeout(() => setFlashcardVisible(true), 400);
            }
          }, 40);
          obs.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const words = DEMO_TEXT.split(' ');

  return (
    <div className="min-h-screen bg-[#0A0D12] text-white font-sans overflow-x-hidden">

      {/* ── Global CSS ─────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes glow   { 0%,100%{opacity:.4} 50%{opacity:.9} }
        @keyframes bgShift{ 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .float-1 { animation: float 6s ease-in-out infinite; }
        .float-2 { animation: float 8s ease-in-out 1s infinite; }
        .float-3 { animation: float 7s ease-in-out 2s infinite; }
        .glow-pulse { animation: glow 3s ease-in-out infinite; }
        .bg-animated {
          background: linear-gradient(135deg,#0a0d12,#0d1530,#0a0d12,#0F0A20);
          background-size: 400% 400%;
          animation: bgShift 12s ease infinite;
        }
        .card-glass {
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.07);
        }
        .pricing-glow {
          box-shadow: 0 0 40px rgba(99,102,241,0.2), 0 0 0 1px rgba(99,102,241,0.3);
        }
      `}</style>

      {/* ── NAV ──────────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-8 py-4 bg-[#0A0D12]/85 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-700/30">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-[15px] tracking-tight text-white">Bionic Speed</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#demo"     className="hover:text-white transition-colors">How it works</a>
          <a href="#pricing"  className="hover:text-white transition-colors">Pricing</a>
        </div>

        <div className="flex items-center gap-3">
          <SignedIn>
            <Link href="/library" className="text-sm font-semibold text-zinc-300 hover:text-white transition-colors">Dashboard</Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Log in</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs sm:text-sm font-bold hover:from-blue-500 hover:to-indigo-500 hover:-translate-y-0.5 transition-all shadow-lg shadow-blue-700/20 whitespace-nowrap">
                Start Free
              </button>
            </SignUpButton>
          </SignedOut>
        </div>
      </nav>

      {/* ─────────────────────────────────────────────────────────────────────
          SECTION 1: HERO
      ──────────────────────────────────────────────────────────────────────── */}
      <section className="bg-animated relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20 pb-16 overflow-hidden">

        {/* Ambient orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[100px]" />
        </div>

        {/* Floating words */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
          <span className="float-1 absolute top-[18%] left-[8%] text-6xl font-black text-white/[0.04] leading-none">Speed.</span>
          <span className="float-2 absolute top-[30%] right-[6%] text-5xl font-black text-white/[0.04] leading-none">Retention.</span>
          <span className="float-3 absolute bottom-[22%] left-[12%] text-4xl font-black text-white/[0.04] leading-none">Focus.</span>
        </div>

        {/* Badge */}
        <div className="relative z-10 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/8 text-blue-300 text-xs font-bold uppercase tracking-widest mb-8">
          <Sparkles className="w-3.5 h-3.5" />
          AI-Powered Academic Reading
        </div>

        {/* Headline */}
        <h1 className="relative z-10 max-w-4xl text-5xl md:text-7xl font-black leading-[1.08] tracking-tight mb-6">
          <span className="text-white">Train Your Brain to </span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400">Read Faster.</span>
          <br />
          <span className="text-zinc-400 text-4xl md:text-5xl font-bold">Upgrade When You&apos;re Ready to Dominate.</span>
        </h1>

        <p className="relative z-10 max-w-2xl text-[17px] text-zinc-400 leading-relaxed mb-10">
          Bionic Speed transforms academic reading into measurable cognitive performance — with AI checkpoints, speed analytics, and retention tracking built for serious learners.
        </p>

        {/* CTAs */}
        <div className="relative z-10 flex items-center gap-4 flex-wrap justify-center mb-16">
          <SignedOut>
            <SignUpButton mode="modal">
              <button className="flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-base font-extrabold shadow-2xl shadow-blue-700/40 hover:from-blue-500 hover:to-indigo-500 hover:-translate-y-1 hover:shadow-blue-600/50 transition-all duration-200">
                Start Free <ArrowRight className="w-4 h-4" />
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Link href="/library" className="flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-base font-extrabold shadow-2xl shadow-blue-700/40 hover:from-blue-500 hover:to-indigo-500 hover:-translate-y-1 transition-all duration-200">
              Open Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          </SignedIn>
          <a href="#pricing" className="text-sm font-semibold text-zinc-500 hover:text-zinc-200 transition-colors flex items-center gap-1">
            See Pro Features <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Live bionic text preview */}
        <div className="relative z-10 w-full max-w-2xl card-glass rounded-2xl p-6 text-left shadow-2xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-emerald-400 glow-pulse" />
            <span className="text-[11px] text-zinc-600 uppercase tracking-widest font-semibold">Live preview</span>
            <span className="ml-auto text-[11px] text-blue-400 font-semibold">{bionicActive ? 'Bionic ON' : 'Loading…'}</span>
          </div>
          <p className="text-[15px] leading-relaxed">
            {bionicActive
              ? words.map((w, i) => <BionicWord key={i} word={w} />)
              : <span className="text-zinc-500">{DEMO_TEXT}</span>
            }
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────
          SECTION 2: PROBLEM
      ──────────────────────────────────────────────────────────────────────── */}
      <section className="relative py-32 px-6 border-t border-white/[0.05]">
        <div className="max-w-3xl mx-auto text-center">
          <FadeIn>
            <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold mb-6">The Problem</p>
            <h2 className="text-4xl md:text-5xl font-black leading-tight mb-8">
              Most People Read.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">Pro Users Train.</span>
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mt-12">
            {[
              { t: 'Attention decay',     d: 'Focus drifts after 12 minutes without structure. Re-reading the same paragraphs wastes 30% of your time.' },
              { t: 'No retention loop',   d: 'Passive reading leaves knowledge as shallow memory — gone before exam day.' },
              { t: 'Zero measurement',    d: "You don't know if you're improving. Without data, you're guessing." },
              { t: 'No adaptive pacing',  d: 'One speed fits all — but your brain has an optimal zone. Nobody tells you what it is.' },
            ].map(({ t, d }, i) => (
              <FadeIn key={t} delay={i * 80}>
                <div className="card-glass rounded-2xl p-5 h-full">
                  <div className="flex items-start gap-3">
                    <div className="w-1 h-full min-h-[32px] shrink-0 rounded-full bg-gradient-to-b from-red-500/60 to-transparent mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-zinc-100 mb-1">{t}</p>
                      <p className="text-xs text-zinc-500 leading-relaxed">{d}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────
          SECTION 3: FEATURES
      ──────────────────────────────────────────────────────────────────────── */}
      <section id="features" className="py-28 px-6 border-t border-white/[0.05]">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-16">
            <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold mb-4">The Solution</p>
            <h2 className="text-4xl md:text-5xl font-black">Three Engines. One Goal.</h2>
            <p className="text-zinc-500 mt-4 max-w-xl mx-auto text-[15px]">Every feature is designed to increase your reading ROI — not just speed.</p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: Zap,
                color: 'from-blue-500 to-blue-700',
                glow: 'bg-blue-500/10',
                tag: 'Speed Engine',
                title: 'Precision WPM Control',
                desc: 'Set your reading speed from 100–1000 WPM. The system learns your optimal zone and guides you there progressively.',
                delay: 0,
              },
              {
                icon: Brain,
                color: 'from-violet-500 to-violet-700',
                glow: 'bg-violet-500/10',
                tag: 'Bionic Acceleration',
                title: 'Visual Reading Override',
                desc: "Bold the first 40–60% of every word. Your brain pattern-matches faster. Fixation time drops. Flow increases.",
                delay: 100,
              },
              {
                icon: Sparkles,
                color: 'from-indigo-500 to-indigo-700',
                glow: 'bg-indigo-500/10',
                tag: 'AI Checkpoint System',
                title: 'Comprehension Enforced',
                desc: 'Every 15% of a document, AI pauses you and generates targeted flashcards from that exact segment.',
                delay: 200,
              },
            ].map(({ icon: Icon, color, glow, tag, title, desc, delay }) => (
              <FadeIn key={tag} delay={delay}>
                <div className="group card-glass rounded-2xl p-6 h-full hover:-translate-y-1.5 hover:border-white/12 transition-all duration-300 cursor-default">
                  <div className={`w-11 h-11 rounded-xl ${glow} flex items-center justify-center mb-5`}>
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1.5">{tag}</p>
                  <h3 className="text-base font-extrabold text-white mb-2">{title}</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────
          SECTION 4: INTERACTIVE DEMO
      ──────────────────────────────────────────────────────────────────────── */}
      <section id="demo" className="py-28 px-6 border-t border-white/[0.05]">
        <div className="max-w-4xl mx-auto">
          <FadeIn className="text-center mb-14">
            <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold mb-4">How It Works</p>
            <h2 className="text-4xl md:text-5xl font-black">See It In Action</h2>
          </FadeIn>

          <div ref={demoRef} className="card-glass rounded-3xl p-8 shadow-2xl">
            {/* Mini reader header */}
            <div className="flex items-center gap-3 mb-5 pb-5 border-b border-white/[0.06]">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
              </div>
              <span className="text-[11px] text-zinc-600 flex-1 text-center font-medium">Leptospirosis.pdf — Bionic Speed Reader</span>
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1">
                <Play className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                <span className="text-[10px] text-emerald-400 font-bold">300 WPM</span>
              </div>
            </div>

            {/* Progress bar with checkpoints */}
            <div className="mb-6">
              <div className="flex justify-between text-[11px] text-zinc-600 mb-2">
                <span>{Math.round(demoProgress)}% complete</span>
                <span>AI checkpoint at 15% →</span>
              </div>
              <div className="relative h-1.5 bg-white/5 rounded-full overflow-visible">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 to-indigo-400 transition-all duration-300 shadow-[0_0_10px_rgba(99,102,241,0.6)]"
                  style={{ width: `${(demoProgress / 90) * 100}%` }}
                />
                <div className="absolute top-1/2 left-[16.7%] -translate-y-1/2 -translate-x-1/2 w-1 h-3.5 rounded-sm bg-indigo-400/60" />
              </div>
            </div>

            {/* Bionic text */}
            <div className="text-[15px] leading-loose mb-6 min-h-[80px]">
              {words.slice(0, 18).map((w, i) => <BionicWord key={i} word={w} />)}
            </div>

            {/* Flashcard modal simulation */}
            {flashcardVisible && !flashcardFlipped && (
              <div
                className="border border-indigo-500/30 bg-gradient-to-br from-indigo-950/60 to-[#0C0E1A] rounded-2xl p-6 text-center animate-[fadeIn_0.4s_ease]"
                style={{ animation: 'none', opacity: 1 }}
              >
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Brain className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">15% Checkpoint — AI Flashcard</span>
                </div>
                <p className="text-sm font-semibold text-zinc-100 mb-5">
                  What is the primary mechanism by which Leptospira causes systemic inflammation?
                </p>
                <button
                  onClick={() => setFlashcardFlipped(true)}
                  className="w-full py-2.5 rounded-xl border border-white/10 text-xs text-zinc-400 hover:bg-white/5 transition-colors"
                >
                  Tap to reveal answer
                </button>
              </div>
            )}

            {flashcardFlipped && (
              <div className="border border-emerald-500/20 bg-emerald-950/30 rounded-2xl p-6 text-center">
                <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest mb-2">Answer</p>
                <p className="text-sm text-zinc-200 mb-5 leading-relaxed">
                  Spirochete invasion through epithelial barriers triggers SIRS via endotoxin-like surface proteins and immune complex deposition.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button className="flex-1 py-2 rounded-xl border border-white/10 text-xs text-zinc-500 hover:bg-white/5 transition-colors">Review again</button>
                  <button className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Got it — Resume Reading
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────
          SECTION 5: FREE VS PRO
      ──────────────────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-28 px-6 border-t border-white/[0.05]">
        <div className="max-w-4xl mx-auto">
          <FadeIn className="text-center mb-14">
            <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold mb-4">Pricing</p>
            <h2 className="text-4xl md:text-5xl font-black">
              Free to Start.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">Pro to Dominate.</span>
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Free */}
            <FadeIn>
              <div className="card-glass rounded-2xl p-7 h-full flex flex-col">
                <div className="mb-6">
                  <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold mb-2">Free</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">$0</span>
                    <span className="text-zinc-600 text-sm">/month</span>
                  </div>
                  <p className="text-xs text-zinc-600 mt-2">Start your training. No card required.</p>
                </div>
                <ul className="space-y-3 flex-1 mb-7">
                  {[
                    '2 PDF documents',
                    'Bionic reading mode',
                    'Basic WPM control',
                    '2 AI checkpoints per doc',
                    'Split & Overlay view',
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-xs text-zinc-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <SignedOut>
                  <SignUpButton mode="modal">
                    <button className="w-full py-3 rounded-xl border border-white/10 text-sm font-bold text-zinc-300 hover:bg-white/5 hover:text-white transition-all">
                      Get Started Free
                    </button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <Link href="/library" className="w-full py-3 rounded-xl border border-white/10 text-sm font-bold text-zinc-300 hover:bg-white/5 transition-all text-center block">
                    Go to Dashboard
                  </Link>
                </SignedIn>
              </div>
            </FadeIn>

            {/* Pro */}
            <FadeIn delay={120}>
              <div className="pricing-glow relative rounded-2xl p-7 h-full flex flex-col bg-gradient-to-br from-[#0D1230] to-[#0A0C1E]">
                {/* Recommended badge */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-lg">
                  Recommended
                </div>

                <div className="mb-6">
                  <p className="text-xs text-blue-400 uppercase tracking-widest font-bold mb-2">Pro</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">$12</span>
                    <span className="text-zinc-500 text-sm">/month</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">Everything you need to train at peak performance.</p>
                </div>

                <ul className="space-y-3 flex-1 mb-7">
                  {[
                    { f: 'Unlimited PDF documents',            hl: false },
                    { f: 'All 6 AI checkpoints per document',  hl: true  },
                    { f: 'Full reading analytics dashboard',   hl: true  },
                    { f: 'WPM trend tracking & insights',      hl: true  },
                    { f: 'Flashcard performance dashboard',    hl: true  },
                    { f: 'Streak & habit optimization',        hl: false },
                    { f: 'Priority support',                   hl: false },
                  ].map(({ f, hl }) => (
                    <li key={f} className="flex items-center gap-2.5 text-xs">
                      <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 ${hl ? 'text-blue-400' : 'text-zinc-500'}`} />
                      <span className={hl ? 'text-zinc-200 font-medium' : 'text-zinc-400'}>{f}</span>
                    </li>
                  ))}
                </ul>

                <button className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-sm hover:from-blue-500 hover:to-indigo-500 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-700/30 transition-all flex items-center justify-center gap-2">
                  Upgrade to Pro <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────
          SECTION 6: ANALYTICS PREVIEW (Locked)
      ──────────────────────────────────────────────────────────────────────── */}
      <section className="py-28 px-6 border-t border-white/[0.05]">
        <div className="max-w-4xl mx-auto">
          <FadeIn className="text-center mb-12">
            <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold mb-4">Pro Analytics</p>
            <h2 className="text-4xl font-black">Your Cognitive Performance, Quantified.</h2>
          </FadeIn>

          <FadeIn>
            <div className="relative rounded-2xl overflow-hidden border border-white/[0.07]">
              {/* Blurred preview */}
              <div className="blur-sm pointer-events-none select-none p-6 bg-[#0F1520]">
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[['318 WPM', 'Avg Speed'], ['78%', 'Flashcard Accuracy'], ['4.2 hr', 'Time Saved']].map(([v, l]) => (
                    <div key={l} className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-4">
                      <p className="text-2xl font-black text-blue-400">{v}</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">{l}</p>
                    </div>
                  ))}
                </div>
                {/* Fake sparkline bars */}
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.05] h-28 flex items-end gap-1">
                  {[40, 55, 48, 70, 65, 80, 75, 88, 84, 95, 90, 100].map((h, i) => (
                    <div key={i} className="flex-1 bg-gradient-to-t from-blue-600/40 to-blue-400/20 rounded-t-sm" style={{ height: `${h}%` }} />
                  ))}
                </div>
                {/* Fake streak calendar */}
                <div className="mt-3 grid grid-cols-14 gap-1">
                  {Array.from({ length: 28 }, (_, i) => (
                    <div key={i} className={`h-4 rounded-sm ${[2, 5, 8, 12, 17, 21, 23].includes(i) ? 'bg-orange-500/30' : 'bg-white/[0.03]'}`} />
                  ))}
                </div>
              </div>

              {/* Lock overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0D12] via-[#0A0D12]/80 to-transparent flex flex-col items-center justify-end pb-10">
                <div className="flex items-center gap-2.5 mb-4 bg-white/[0.05] border border-white/[0.08] rounded-full px-5 py-2.5">
                  <Lock className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm font-bold text-zinc-200">Unlock Full Cognitive Insights with Pro</span>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold hover:from-blue-500 hover:to-indigo-500 hover:-translate-y-0.5 transition-all shadow-lg shadow-blue-700/30">
                  Upgrade to Pro <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────
          SECTION 7: FINAL CTA
      ──────────────────────────────────────────────────────────────────────── */}
      <section className="relative py-36 px-6 border-t border-white/[0.05] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] bg-blue-600/8 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-2xl mx-auto text-center">
          <FadeIn>
            <div className="inline-flex items-center gap-2 mb-6 text-orange-400">
              <Flame className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Your brain adapts to how you train it</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black leading-tight mb-6">
              Start Free.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">Upgrade When Ready.</span>
            </h2>
            <p className="text-zinc-500 mb-10 text-[15px] leading-relaxed">
              Join learners who have transformed passive reading into structured performance training. No credit card required.
            </p>
            <SignedOut>
              <SignUpButton mode="modal">
                <button className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-base font-extrabold shadow-2xl shadow-blue-700/40 hover:from-blue-500 hover:to-indigo-500 hover:-translate-y-1 hover:shadow-blue-600/50 transition-all duration-200">
                  Start Reading Smarter — Free <ArrowRight className="w-5 h-5" />
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link href="/library" className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-base font-extrabold shadow-2xl shadow-blue-700/40 hover:from-blue-500 hover:to-indigo-500 hover:-translate-y-1 transition-all duration-200">
                Open Your Dashboard <ArrowRight className="w-5 h-5" />
              </Link>
            </SignedIn>
          </FadeIn>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.05] py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-zinc-500">Bionic Speed</span>
          </div>
          <p className="text-xs text-zinc-700">© 2025 Bionic Speed. Purpose-built for serious learners.</p>
          <div className="flex gap-5 text-xs text-zinc-700">
            <a href="#" className="hover:text-zinc-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-zinc-400 transition-colors">Terms</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
