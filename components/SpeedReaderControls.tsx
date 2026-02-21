'use client';

import React from 'react';
import ProgressBar from './ProgressBar';

interface SpeedReaderControlsProps {
  wpm: number;
  setWpm: (wpm: number) => void;
  isPlaying: boolean;
  togglePlay: () => void;
  resetReader: () => void;
  currentWordIndex: number;
  totalWords: number;
}

const PRESETS = [200, 300, 400];

export default function SpeedReaderControls({
  wpm,
  setWpm,
  isPlaying,
  togglePlay,
  resetReader,
  currentWordIndex,
  totalWords,
}: SpeedReaderControlsProps) {
  return (
    <div className="w-full flex items-center gap-3 py-2 px-1">

      {/* Play / Pause */}
      <button
        onClick={togglePlay}
        className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-md ${
          isPlaying
            ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30'
            : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30'
        }`}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        ) : (
          <svg className="w-5 h-5 fill-current translate-x-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        )}
      </button>

      {/* Reset */}
      <button
        onClick={resetReader}
        className="flex-shrink-0 px-3 py-1.5 rounded-lg font-medium text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 transition-colors"
      >
        Reset
      </button>

      {/* Progress bar */}
      <ProgressBar
        currentWordIndex={currentWordIndex}
        totalWords={totalWords}
        wpm={wpm}
      />

      {/* WPM preset buttons */}
      <div className="flex-shrink-0 flex items-center gap-1">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => setWpm(preset)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              wpm === preset
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Fine-tune slider + WPM display */}
      <div className="flex-shrink-0 flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">WPM</span>
        <input
          type="range"
          min="100"
          max="1000"
          step="10"
          value={wpm}
          onChange={(e) => setWpm(parseInt(e.target.value))}
          className="w-24 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <span className="text-sm font-bold font-mono text-zinc-800 dark:text-zinc-100 min-w-[2.5rem] text-right">{wpm}</span>
      </div>

    </div>
  );
}
