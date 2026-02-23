'use server';

import dbConnect from '@/lib/mongodb';
import ReadingSession from '@/models/ReadingSession';
import ReviewSession from '@/models/ReviewSession';
import SmarterIndexSnapshot from '@/models/SmarterIndexSnapshot';
import Flashcard from '@/models/Flashcard';
import { auth } from '@clerk/nextjs/server';

export async function logReadingSessionAction(params: {
  documentId: string;
  durationMs: number;
  wordsRead: number;
  wpm: number;
  regressions: number;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await dbConnect();

  await ReadingSession.create({
    userId,
    documentId: params.documentId,
    durationMs: params.durationMs,
    wordsRead: params.wordsRead,
    wpm: params.wpm,
    regressions: params.regressions,
  });

  return { success: true };
}

export async function logReviewSessionAction(cardsReviewed: number, correctCount: number) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await dbConnect();

  // Normalize date to start of current day in UTC
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  await ReviewSession.findOneAndUpdate(
    { userId, date: today },
    { 
      $inc: { 
        cardsReviewed, 
        correctCount 
      } 
    },
    { new: true, upsert: true }
  );

  return { success: true };
}

export async function getSmarterIndexAction(testUserId?: string) {
  const { userId } = testUserId ? { userId: testUserId } : await auth();
  if (!userId) throw new Error('Unauthorized');

  await dbConnect();

  const now = new Date();
  const past30DaysDate = new Date();
  past30DaysDate.setUTCDate(now.getUTCDate() - 30);
  const past7DaysDate = new Date();
  past7DaysDate.setUTCDate(now.getUTCDate() - 7);

  // 1. Reading Efficiency (RE) - Recent WPM & Comprehension proxy minus regressions
  const recentReads = await ReadingSession.find({
    userId,
    date: { $gte: past7DaysDate }
  }).lean();

  let avgWpm = 250; // Baseline
  let totalRegressions = 0;
  let totalSessions = recentReads.length;

  if (totalSessions > 0) {
    const sumWpm = recentReads.reduce((acc, r) => acc + (r.wpm || 0), 0);
    avgWpm = sumWpm / totalSessions;
    totalRegressions = recentReads.reduce((acc, r) => acc + (r.regressions || 0), 0);
  }

  // WPM component (cap at 1000 WPM for normalization) -> 0..50
  const wpmScore = Math.min(50, (avgWpm / 1000) * 50);
  // Regression penalty: e.g. -2 points per regression average per session
  const regressionPenalty = Math.min(wpmScore, (totalSessions > 0 ? (totalRegressions / totalSessions) * 2 : 0));
  
  // Flashcard accuracy component -> 0..50
  const allCards = await Flashcard.find({ userId }).select('accuracyHistory interval').lean();
  let correctHits = 0;
  let totalHits = 0;
  let sumIntervals = 0;

  allCards.forEach(c => {
    if (c.interval) sumIntervals += c.interval;
    if (c.accuracyHistory) {
      c.accuracyHistory.forEach(h => {
        totalHits++;
        if (h) correctHits++;
      });
    }
  });

  const accuracyScore = totalHits > 0 ? (correctHits / totalHits) * 50 : 25; // Default 50% comprehension
  const reScore = Math.max(0, Math.min(100, (wpmScore - regressionPenalty) + accuracyScore));

  // 2. Retention Stability (RS) - Average interval length + Consistency of accuracy
  // We'll normalize interval growth to roughly 30 days max for score 100
  const avgInterval = allCards.length > 0 ? sumIntervals / allCards.length : 1;
  const rsScore = Math.min(100, (avgInterval / 30) * 100);

  // 3. Consistency (C) - Active days out of last 7
  // We combine ReadingSessions and ReviewSessions unique days
  const activeDays = new Set();
  recentReads.forEach(r => activeDays.add(new Date(r.date).toISOString().split('T')[0]));
  
  const recentReviews = await ReviewSession.find({
    userId,
    date: { $gte: past7DaysDate }
  }).lean();
  recentReviews.forEach(r => activeDays.add(new Date(r.date).toISOString().split('T')[0]));

  const cScore = Math.min(100, (activeDays.size / 7) * 100);

  // Smarter Index composite
  // Formula: SI = (RE * 0.4) + (RS * 0.4) + (C * 0.2)
  const siScore = (reScore * 0.4) + (rsScore * 0.4) + (cScore * 0.2);

  // Snapshot generation
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const currentSnapshot = await SmarterIndexSnapshot.findOneAndUpdate(
    { userId, date: today },
    { $set: { reScore, rsScore, cScore, siScore } },
    { new: true, upsert: true }
  ).lean();

  // Return full history for graphing
  const history = await SmarterIndexSnapshot.find({
    userId,
    date: { $gte: past30DaysDate }
  }).sort({ date: 1 }).lean();

  return {
    success: true,
    current: JSON.parse(JSON.stringify(currentSnapshot)),
    history: JSON.parse(JSON.stringify(history)),
  };
}
