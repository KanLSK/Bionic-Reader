'use server';

import dbConnect from '@/lib/mongodb';
import ReadingSession from '@/models/ReadingSession';
import ReviewSession from '@/models/ReviewSession';
import SmarterIndexSnapshot from '@/models/SmarterIndexSnapshot';
import Flashcard from '@/models/Flashcard';
import { auth } from '@clerk/nextjs/server';

export interface DashboardStats {
  wpmAvg: number;
  wpmDeltaPercent: number;
  wpmTrend: number[];
  wpmDeltaStartPercent: number;
  thisWeekHrs: string;
  timeSavedHrs: string;
  sessionsThisMonth: number;
  streak: number;
  calendarDays: { day: number; active: boolean }[];
  weeklyFocusPct: number;
  weeklyFocusLeftMins: number;
  cardsMastered: number;
  dueForReview: number;
  accuracyRate: number;
}

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

export async function getProDashboardStatsAction() {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await dbConnect();

  const now = new Date();
  
  // Date ranges
  const past7Days = new Date();
  past7Days.setUTCDate(now.getUTCDate() - 7);
  
  const past14Days = new Date();
  past14Days.setUTCDate(now.getUTCDate() - 14);

  const past30Days = new Date();
  past30Days.setUTCDate(now.getUTCDate() - 30);

  // 1. Reading Sessions Queries
  const last7DaysSessions = await ReadingSession.find({ userId, date: { $gte: past7Days } }).lean();
  const prior7DaysSessions = await ReadingSession.find({ userId, date: { $gte: past14Days, $lt: past7Days } }).lean();
  const last30DaysSessions = await ReadingSession.find({ userId, date: { $gte: past30Days } }).lean();

  // WPM & Delta
  let currentWpmAvg = 250;
  if (last7DaysSessions.length > 0) {
    currentWpmAvg = Math.round(last7DaysSessions.reduce((sum, s) => sum + (s.wpm || 0), 0) / last7DaysSessions.length);
  } else if (last30DaysSessions.length > 0) {
    currentWpmAvg = Math.round(last30DaysSessions.reduce((sum, s) => sum + (s.wpm || 0), 0) / last30DaysSessions.length); // fallback to 30d
  }

  let priorWpmAvg = 250;
  if (prior7DaysSessions.length > 0) {
    priorWpmAvg = Math.round(prior7DaysSessions.reduce((sum, s) => sum + (s.wpm || 0), 0) / prior7DaysSessions.length);
  }

  let wpmDeltaPercent = 0;
  if (priorWpmAvg > 0) {
    wpmDeltaPercent = Math.round(((currentWpmAvg - priorWpmAvg) / priorWpmAvg) * 100);
  }

  // WPM Sparkline Trend (last 15 sessions)
  const recent15Sessions = await ReadingSession.find({ userId })
    .sort({ date: -1 })
    .limit(15)
    .select('wpm')
    .lean();
  let wpmTrend = recent15Sessions.map(s => s.wpm || 250).reverse();
  if (wpmTrend.length === 0) wpmTrend = [250];

  const wpmDeltaStartPercent = wpmTrend.length > 1 
    ? Math.round(((wpmTrend[wpmTrend.length - 1] - wpmTrend[0]) / wpmTrend[0]) * 100) 
    : 0;

  // Time Saved calculation
  // Total words read in the last 30 days
  const totalWords30d = last30DaysSessions.reduce((sum, s) => sum + (s.wordsRead || 0), 0);
  const avgReaderMins = totalWords30d / 250; 
  const userReaderMins = currentWpmAvg > 0 ? totalWords30d / currentWpmAvg : 0;
  // Time saved in hours
  const timeSavedHrs = Math.max(0, (avgReaderMins - userReaderMins) / 60);

  // This Week Reading Hrs
  const thisWeekMs = last7DaysSessions.reduce((sum, s) => sum + (s.durationMs || 0), 0);
  const thisWeekHrs = thisWeekMs / (1000 * 60 * 60);

  // Sessions this month
  const sessionsThisMonthCount = last30DaysSessions.length;

  // 2. Flashcard Queries
  const allCards = await Flashcard.find({ userId }).lean();
  let totalHits = 0;
  let correctHits = 0;
  let cardsMastered = 0; // arbitrary definition: interval > 21 days
  let dueForReview = 0;

  allCards.forEach(c => {
    if ((c.interval || 0) > 21) cardsMastered++;
    const nextReview = c.nextReviewDate ? new Date(c.nextReviewDate) : new Date(0);
    if (nextReview <= now) dueForReview++;
    
    if (c.accuracyHistory) {
      c.accuracyHistory.forEach(h => {
        totalHits++;
        if (h) correctHits++;
      });
    }
  });

  const accuracyRate = totalHits > 0 ? Math.round((correctHits / totalHits) * 100) : 0;

  // 3. Calendar & Streak
  // Get all session dates for the last 28 days
  const past28Days = new Date();
  past28Days.setUTCDate(now.getUTCDate() - 28);
  past28Days.setUTCHours(0, 0, 0, 0);

  const readingDates28d = await ReadingSession.find({ userId, date: { $gte: past28Days } }).select('date').lean();
  const reviewDates28d = await ReviewSession.find({ userId, date: { $gte: past28Days } }).select('date').lean();

  const activeDateStrings = new Set<string>();
  readingDates28d.forEach(d => activeDateStrings.add(new Date(d.date).toISOString().split('T')[0]));
  reviewDates28d.forEach(d => activeDateStrings.add(new Date(d.date).toISOString().split('T')[0]));

  const calendarDays = [];
  let currentStreak = 0;
  let streakActive = true;

  // Iterate backwards 28 days to build calendar and streak
  for (let i = 27; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(now.getUTCDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const isActive = activeDateStrings.has(dateStr);
    
    calendarDays.push({
      day: d.getUTCDate(), // just the day of the month
      active: isActive
    });

    // Calculate streak looking backwards from today (i=0 is 27 days ago, i=27 is today)
    // Actually simpler to calculate streak by going from today backwards:
  }
  
  // Streak calculation (working backwards from today)
  for (let i = 0; i < 28; i++) {
    const d = new Date();
    d.setUTCDate(now.getUTCDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    if (activeDateStrings.has(dateStr)) {
      currentStreak++;
    } else {
      // If it's today and we haven't read yet, it doesn't break yesterday's streak
      if (i > 0) {
          break; // Streak broken
      }
    }
  }

  // Weekly Focus Completion (target: 5h = 300 mins)
  const weeklyFocusTargetMins = 300;
  const thisWeekMins = thisWeekMs / (1000 * 60);
  const weeklyFocusPct = Math.min(100, Math.round((thisWeekMins / weeklyFocusTargetMins) * 100));
  const weeklyFocusLeftMins = Math.max(0, Math.round(weeklyFocusTargetMins - thisWeekMins));

  // Assemble the payload
  const stats = {
    wpmAvg: currentWpmAvg,
    wpmDeltaPercent,
    wpmTrend,
    wpmDeltaStartPercent,
    thisWeekHrs: thisWeekHrs.toFixed(1),
    timeSavedHrs: timeSavedHrs.toFixed(1),
    sessionsThisMonth: sessionsThisMonthCount,
    streak: currentStreak,
    calendarDays,
    weeklyFocusPct,
    weeklyFocusLeftMins,
    cardsMastered,
    dueForReview,
    accuracyRate,
  };

  return { success: true, stats };
}
