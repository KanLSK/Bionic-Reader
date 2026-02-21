'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface BionicPdfViewerProps {
  pdfUrl: string;
  mode: 'pdf-only' | 'line-highlight' | 'overlay';
  currentWordIndex?: number;
}

// A word entry: the source span (for line-bar positioning) and its text
interface WordEntry {
  span: HTMLSpanElement;
  word: string;
}

export default function BionicPdfViewer({
  pdfUrl,
  mode,
  currentWordIndex = 0,
}: BionicPdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [containerWidth, setWidth] = useState(0);

  const scrollRef    = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const lineBarRef   = useRef<HTMLDivElement>(null);

  // For overlay mode: one entry per text-layer span (span-level index)
  const spansRef = useRef<HTMLSpanElement[]>([]);

  // For line-highlight mode: one entry per WORD (word-level index, reading order)
  const wordsRef = useRef<WordEntry[]>([]);

  // ─── Collect & index spans after all pages render ─────────────────────────
  const collectSpans = useCallback(() => {
    if (!scrollRef.current) return;

    // Grab all non-empty presentation spans
    const rawSpans = Array.from(
      scrollRef.current.querySelectorAll<HTMLSpanElement>(
        '.react-pdf__Page__textContent span[role="presentation"]',
      ),
    ).filter((s) => s.textContent?.trim());

    // ── Overlay: keep DOM order (1 span ≈ 1 token, close enough) ─────────────
    spansRef.current = rawSpans;

    // ── Line-highlight: sort by visual reading order, then expand to word list ─
    // Sort: top-to-bottom first, then left-to-right within the same line (±8px)
    const LINE_TOLERANCE = 8;
    const sorted = [...rawSpans].sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      if (Math.abs(ra.top - rb.top) > LINE_TOLERANCE) return ra.top - rb.top;
      return ra.left - rb.left;
    });

    // Expand each span into individual words
    const wordEntries: WordEntry[] = [];
    for (const span of sorted) {
      const text = span.textContent ?? '';
      const tokens = text.split(/\s+/).filter(Boolean);
      for (const token of tokens) {
        // Strip punctuation for matching robustness, but keep the span reference
        wordEntries.push({ span, word: token.replace(/[^a-zA-Z0-9'-]/g, '') });
      }
    }
    wordsRef.current = wordEntries;
  }, []);

  // ─── Overlay: move word highlight box ────────────────────────────────────
  useEffect(() => {
    if (mode !== 'overlay') return;
    if (!highlightRef.current || !scrollRef.current) return;

    const span = spansRef.current[currentWordIndex];
    const box  = highlightRef.current;

    if (!span) { box.style.opacity = '0'; return; }

    const scrollEl   = scrollRef.current;
    const spanRect   = span.getBoundingClientRect();
    const parentRect = scrollEl.getBoundingClientRect();

    const top  = spanRect.top  - parentRect.top  + scrollEl.scrollTop;
    const left = spanRect.left - parentRect.left + scrollEl.scrollLeft;

    box.style.top     = `${top  - 2}px`;
    box.style.left    = `${left - 3}px`;
    box.style.width   = `${spanRect.width  + 6}px`;
    box.style.height  = `${spanRect.height + 4}px`;
    box.style.opacity = '1';

    const visible =
      spanRect.top >= parentRect.top && spanRect.bottom <= parentRect.bottom;
    if (!visible) span.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentWordIndex, mode]);

  // ─── Line-highlight: move full-line bar using word-level index ────────────
  useEffect(() => {
    if (mode !== 'line-highlight') return;
    if (!lineBarRef.current || !scrollRef.current) return;

    const entry = wordsRef.current[currentWordIndex];
    const bar   = lineBarRef.current;

    if (!entry) { bar.style.opacity = '0'; return; }

    const { span: activeSpan } = entry;
    const scrollEl   = scrollRef.current;
    const parentRect = scrollEl.getBoundingClientRect();
    const activeRect = activeSpan.getBoundingClientRect();

    // All spans on the same line (same top ± tolerance)
    const LINE_TOLERANCE = 4;
    const lineTop = activeRect.top;

    // Collect line spans from the sorted word list's unique spans
    const lineSpans = Array.from(
      new Set(
        wordsRef.current
          .filter((e) => Math.abs(e.span.getBoundingClientRect().top - lineTop) <= LINE_TOLERANCE)
          .map((e) => e.span),
      ),
    );

    const rects    = lineSpans.map((s) => s.getBoundingClientRect());
    const minLeft  = Math.min(...rects.map((r) => r.left));
    const maxRight = Math.max(...rects.map((r) => r.right));

    const top  = activeRect.top  - parentRect.top  + scrollEl.scrollTop;
    const left = minLeft - parentRect.left + scrollEl.scrollLeft;

    bar.style.top     = `${top - 2}px`;
    bar.style.left    = `${left - 6}px`;
    bar.style.width   = `${maxRight - minLeft + 12}px`;
    bar.style.height  = `${activeRect.height + 4}px`;
    bar.style.opacity = '1';

    // Auto-scroll into view if off-screen
    const visible =
      activeRect.top >= parentRect.top && activeRect.bottom <= parentRect.bottom;
    if (!visible) activeSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentWordIndex, mode]);

  const measureRef = useCallback((node: HTMLDivElement | null) => {
    if (node) setWidth(node.clientWidth);
  }, []);

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      measureRef(node);
    },
    [measureRef],
  );

  const needsTextLayer = mode === 'overlay' || mode === 'line-highlight';

  return (
    <div className="flex flex-col h-full">
      <div
        ref={setRefs}
        className="flex-1 overflow-y-auto flex flex-col items-center bg-zinc-200 dark:bg-zinc-800 gap-6 py-6 px-4 relative"
      >
        {/* Overlay: word highlight */}
        {mode === 'overlay' && (
          <div
            ref={highlightRef}
            style={{
              position:        'absolute',
              top: 0, left: 0, width: 0, height: 0,
              opacity:         0,
              pointerEvents:   'none',
              backgroundColor: 'rgba(250, 204, 21, 0.45)',
              borderRadius:    '3px',
              boxShadow:       '0 0 0 2px rgba(234, 179, 8, 0.6)',
              transition:      'top 80ms ease, left 80ms ease, width 80ms ease, height 80ms ease',
              zIndex:          10,
            }}
          />
        )}

        {/* Line-highlight: full-line blue bar */}
        {mode === 'line-highlight' && (
          <div
            ref={lineBarRef}
            style={{
              position:        'absolute',
              top: 0, left: 0, width: 0, height: 0,
              opacity:         0,
              pointerEvents:   'none',
              backgroundColor: 'rgba(59, 130, 246, 0.12)',
              borderBottom:    '2px solid rgba(59, 130, 246, 0.55)',
              borderRadius:    '4px',
              transition:      'top 120ms ease, left 120ms ease, width 120ms ease, height 120ms ease',
              zIndex:          10,
            }}
          />
        )}

        <Document
          file={pdfUrl}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          loading={
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500 gap-3">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Loading PDF…</span>
            </div>
          }
          error={
            <div className="text-red-500 bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl text-center text-sm max-w-sm">
              Failed to load PDF. Try refreshing.
            </div>
          }
        >
          {Array.from({ length: numPages }, (_, i) => (
            <Page
              key={`page-${i + 1}`}
              pageNumber={i + 1}
              width={containerWidth ? Math.min(containerWidth - 32, 960) : undefined}
              renderTextLayer={needsTextLayer}
              renderAnnotationLayer={false}
              className={`shadow-2xl mb-4 ${mode === 'line-highlight' ? 'line-highlight-page' : ''}`}
              onRenderTextLayerSuccess={i === numPages - 1 ? collectSpans : undefined}
            />
          ))}
        </Document>

        {/* Hide text layer visually — used only for position data */}
        {mode === 'line-highlight' && (
          <style>{`
            .line-highlight-page .react-pdf__Page__textContent {
              opacity: 0 !important;
              pointer-events: none !important;
            }
          `}</style>
        )}
      </div>
    </div>
  );
}
