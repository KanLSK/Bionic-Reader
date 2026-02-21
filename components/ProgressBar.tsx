'use client';

import React from 'react';

interface ProgressBarProps {
  currentWordIndex: number;
  totalWords: number;
  wpm: number;
}

const CHECKPOINTS = [15, 30, 45, 60, 75, 90];

export default function ProgressBar({ currentWordIndex, totalWords, wpm }: ProgressBarProps) {
  const progress = totalWords > 0 ? (currentWordIndex / totalWords) * 100 : 0;
  const wordsRemaining = Math.max(0, totalWords - currentWordIndex);
  const minutesRemaining = wpm > 0 ? wordsRemaining / wpm : 0;

  const formatTime = (minutes: number) => {
    if (minutes < 1)   return `<1 min`;
    if (minutes < 60)  return `${Math.ceil(minutes)} min`;
    const h = Math.floor(minutes / 60);
    const m = Math.ceil(minutes % 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      {/* Bar */}
      <div className="relative flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-visible">
        {/* Fill */}
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
        {/* Checkpoint tick marks */}
        {CHECKPOINTS.map((cp) => (
          <div
            key={cp}
            title={`${cp}% checkpoint`}
            style={{ left: `${cp}%` }}
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-3 rounded-sm transition-colors ${
              progress >= cp
                ? 'bg-indigo-400 dark:bg-indigo-300'
                : 'bg-zinc-400 dark:bg-zinc-500'
            }`}
          />
        ))}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2 text-xs font-semibold tabular-nums text-zinc-500 dark:text-zinc-400 whitespace-nowrap flex-shrink-0">
        <span className="text-zinc-700 dark:text-zinc-200">{Math.floor(progress)}%</span>
        <span className="text-zinc-300 dark:text-zinc-600">·</span>
        <span>{formatTime(minutesRemaining)} left</span>
      </div>
    </div>
  );
}
