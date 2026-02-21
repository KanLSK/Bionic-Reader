'use client';

import React, { useMemo, useEffect, useRef } from 'react';

interface BionicTextProps {
  text: string;
  currentWordIndex: number;
  onWordClick: (index: number) => void;
  focusMode?: boolean;
  currentPara?: number;
  wordsPerPara?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT-SIDE PDF NORMALIZATION
// Applied on every render so documents already in the DB benefit too.
// This mirrors the server-side cleanPdfText in upload.ts.
// ─────────────────────────────────────────────────────────────────────────────
function normalizeText(raw: string): string {
  return raw
    // Step 1 — Normalize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

    // Step 2 — Fix PDF glyph substitutions
    .replace(/!\s*m\b/g, 'μm')
    .replace(/!\s*g\b/g, 'μg')
    .replace(/!\s*l\b/g, 'μl')
    .replace(/!\s*mol\b/g, 'μmol')
    // Lone ! on its own → remove
    .replace(/(?<=[\s\n])!(?=[\s\n])/g, '')
    .replace(/^!$/gm, '')
    .replace(/!\s*$/gm, '')   // trailing ! at end of line
    // ! before a capital word (PDF heading artifact e.g. !ETIOLOGIC) → strip !
    .replace(/!(?=[A-Z])/g, '')

    // Step 3 — Rejoin hyphenated line-wrap words
    .replace(/(\w)-\n([a-z])/g, '$1$2')

    // Step 4 — Rejoin ALL_CAPS column-break splits (EPI\nDEMIOLOGY → EPIDEMIOLOGY)
    .replace(/\b([A-Z]{2,8})\n([A-Z]{2,})\b/g, '$1$2')

    // Step 5 — Rejoin single-letter orphan (L\neptospirosis → Leptospirosis)
    .replace(/\b([A-Z])\n([a-z]{2,})/g, '$1$2')

    // Step 6 — Remaining single newlines → space
    .replace(/([^\n])\n([^\n])/g, '$1 $2')

    // Step 7 — Multiple blank lines → at most one paragraph break
    .replace(/\n{3,}/g, '\n\n')

    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION HEADER DETECTION
// A token is a section heading if:
//   • ALL CAPS (only A-Z, hyphens, digits), at least 5 characters
//   • Not a common short English word (false-positives)
// The ! prefix heuristic is intentionally removed — ! is a glyph artifact.
// ─────────────────────────────────────────────────────────────────────────────
const FALSE_POSITIVE_CAPS = new Set([
  'THE', 'AND', 'FOR', 'WITH', 'FROM', 'THAT', 'THIS', 'HAVE', 'BEEN',
  'WILL', 'WHEN', 'WERE', 'THEY', 'THEIR', 'ALSO', 'WHICH', 'INTO',
  'THAN', 'THEN', 'THESE', 'THOSE', 'BOTH', 'EACH', 'SUCH', 'ONLY',
  'SOME', 'MORE', 'MOST', 'OTHER', 'MANY', 'MUCH', 'VERY', 'EVEN',
]);

function isHeaderToken(token: string): boolean {
  // Strip surrounding punctuation
  const clean = token.replace(/[^A-Z0-9-]/gi, '');
  if (clean.length < 5) return false;
  // Must be entirely upper-case (allows digits and hyphens, e.g. "COVID-19")
  if (!/^[A-Z0-9][A-Z0-9-]+$/.test(clean)) return false;
  // Must have at least 2 actual uppercase letters (not just a number)
  if ((clean.match(/[A-Z]/g) ?? []).length < 2) return false;
  // Block common false positives
  if (FALSE_POSITIVE_CAPS.has(clean)) return false;
  return true;
}

export default function BionicText({
  text,
  currentWordIndex,
  onWordClick,
  focusMode = false,
  currentPara = 0,
  wordsPerPara = 80,
}: BionicTextProps) {
  const normalized = useMemo(() => normalizeText(text), [text]);
  const tokens = useMemo(
    () => normalized.split(/(\s+)/).filter((w) => w.length > 0),
    [normalized],
  );

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Remove active class from old word
    const oldActive = container.querySelector('.bionic-word-active');
    if (oldActive) {
      oldActive.classList.remove('bionic-word-active');
      oldActive.removeAttribute('data-active');
    }

    // Add active class to new word
    const newActive = container.querySelector(`[data-index="${currentWordIndex}"]`);
    if (newActive) {
      newActive.classList.add('bionic-word-active');
      newActive.setAttribute('data-active', 'true');
      
      // Throttle scrolling natively or use standard smooth scroll
      newActive.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentWordIndex]);

  const elements = useMemo(() => {
    let wordCount = 0;
    const result: React.ReactNode[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const chunk = tokens[i];
      const isWS  = /^\s+$/.test(chunk);

      if (isWS) {
        if (chunk.includes('\n')) {
          result.push(<br key={`br-${i}`} />);
          if ((chunk.match(/\n/g) ?? []).length > 1) {
            result.push(<div key={`para-${i}`} style={{ height: '0.6em' }} />);
          }
        } else {
          result.push(<span key={`ws-${i}`}> </span>);
        }
        continue;
      }

      const idx            = wordCount++;
      const para           = Math.floor(idx / wordsPerPara);
      const isHeader       = isHeaderToken(chunk);

      // Bionic bold split — extract core word, strip leading/trailing punctuation
      const pmatch  = chunk.match(/^(\p{P}*)(.*?)(\p{P}*)$/u);
      const prefix  = pmatch?.[1] ?? '';
      const core    = pmatch?.[2] ?? chunk;
      const suffix  = pmatch?.[3] ?? '';
      const boldLen = Math.ceil(core.length / 2);

      // Insert visual break BEFORE section header
      if (isHeader) {
        result.push(<br key={`hbr1-${i}`} />);
        result.push(<div key={`hsp-${i}`} style={{ display: 'inline-block', width: '100%', height: '0.35em' }} />);
      }

      if (focusMode) {
        result.push(
          <span
            key={`word-${i}`}
            data-index={idx}
            data-para={para}
            onClick={() => onWordClick(idx)}
            className={`bionic-word focus-mode-word cursor-pointer inline-block whitespace-nowrap mx-[0.1em] rounded-md transition-all duration-150 ${isHeader ? 'header-word' : ''}`}
          >
            {prefix}
            <strong className="bionic-core font-black tracking-tight">
              {core.slice(0, boldLen)}
            </strong>
            <span className="bionic-rest font-medium">
              {core.slice(boldLen)}
            </span>
            {suffix}
          </span>,
        );
      } else {
        result.push(
          <span
            key={`word-${i}`}
            data-index={idx}
            data-para={para}
            onClick={() => onWordClick(idx)}
            className={`bionic-word normal-mode-word cursor-pointer inline-block whitespace-nowrap mx-[0.1em] px-1 rounded-md transition-all duration-150 hover:bg-blue-100 hover:dark:bg-blue-900/50 text-zinc-700 dark:text-zinc-300 ${isHeader ? 'header-word' : ''}`}
          >
            {prefix}
            <strong className="bionic-core font-extrabold tracking-tight text-black dark:text-white">
              {core.slice(0, boldLen)}
            </strong>
            <span className="bionic-rest opacity-80 font-medium">{core.slice(boldLen)}</span>
            {suffix}
          </span>,
        );
      }

      // Insert line break AFTER header so body text starts on new line
      if (isHeader) {
        result.push(<br key={`hbr2-${i}`} />);
      }
    }

    return result;
  }, [tokens, onWordClick, focusMode, wordsPerPara]);

  const styleBlock = (
    <style>{`
      /* FOCUS MODE */
      .focus-mode-word .bionic-core { color: #e2e8f0; }
      .focus-mode-word .bionic-rest { color: #94a3b8; }
      
      .focus-mode-word.header-word .bionic-core { color: #a5b4fc; }
      .focus-mode-word.header-word .bionic-rest { color: #818cf8; }

      .focus-mode-word.bionic-word-active {
        background: rgba(99,102,241,0.18);
        box-shadow: 0 0 12px rgba(99,102,241,0.35);
        border-radius: 5px;
        padding: 1px 4px;
        transform: scale(1.04);
      }
      .focus-mode-word.bionic-word-active .bionic-core { color: #a5b4fc; }
      .focus-mode-word.bionic-word-active .bionic-rest { color: #c7d2fe; }

      ${focusMode && currentWordIndex > 0 ? `
        .bionic-container .bionic-word:not([data-para="${currentPara}"]) {
          opacity: 0.38;
        }
        .bionic-container .bionic-word[data-para="${currentPara}"] {
          opacity: 1;
        }
      ` : ''}

      /* NORMAL MODE */
      .normal-mode-word.bionic-word-active {
        background-color: rgb(254 240 138); 
        box-shadow: 0 0 0 2px rgb(250 204 21);
        border-radius: 5px;
        transform: scale(1.05);
        z-index: 10;
        position: relative;
      }
      .normal-mode-word.bionic-word-active .bionic-core,
      .normal-mode-word.bionic-word-active .bionic-rest {
        color: black !important;
      }
      .dark .normal-mode-word.bionic-word-active {
        background-color: rgba(234, 179, 8, 0.3);
        box-shadow: 0 0 0 2px rgb(234 179 8);
      }
      .dark .normal-mode-word.bionic-word-active .bionic-core,
      .dark .normal-mode-word.bionic-word-active .bionic-rest {
        color: white !important;
      }
    `}</style>
  );

  if (focusMode) {
    return (
      <div
        ref={containerRef}
        className="bionic-container text-left antialiased"
        style={{
          fontSize:      '1.18rem',
          lineHeight:    '2.05',
          letterSpacing: '0.01em',
          color:         '#94a3b8',
          fontFamily:    '"Georgia", "Times New Roman", serif',
        }}
      >
        {styleBlock}
        {elements}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="bionic-container max-w-4xl mx-auto p-8 bg-white dark:bg-zinc-950 rounded-3xl shadow-xl border border-zinc-100 dark:border-zinc-800 text-xl sm:text-2xl leading-relaxed sm:leading-loose font-serif transition-colors duration-300"
    >
      {styleBlock}
      <div className="text-left font-serif antialiased">{elements}</div>
    </div>
  );
}
