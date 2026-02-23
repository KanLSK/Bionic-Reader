'use server';

import dbConnect from '@/lib/mongodb';
import ReadingSession from '@/models/ReadingSession';
import ReviewSession from '@/models/ReviewSession';
import SmarterIndexSnapshot from '@/models/SmarterIndexSnapshot';
import Flashcard from '@/models/Flashcard';
import ConceptCluster from '@/models/ConceptCluster';
import CognitiveProfile from '@/models/CognitiveProfile';
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

/**
 * Calculates retention half-life and SI slope velocity, updating the user's CognitiveProfile.
 */
export async function getCognitiveProfileAction() {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  await dbConnect();

  const now = new Date();
  const past30DaysDate = new Date();
  past30DaysDate.setUTCDate(now.getUTCDate() - 30);
  const past7DaysDate = new Date();
  past7DaysDate.setUTCDate(now.getUTCDate() - 7);

  // 1. Calculate Retention Half-Life (decay model proxy)
  // Get all cards to find average interval vs accuracy
  const allCards = await Flashcard.find({ userId }).select('interval accuracyHistory').lean();
  let totalIntervalDays = 0;
  
  if (allCards.length > 0) {
    allCards.forEach(c => {
      totalIntervalDays += (c.interval || 0);
    });
    // Simplified exponential proxy: Average interval * historical success rate modifier
    // A true half-life would require mapping (time delta vs recall %). 
    // Proxy: average interval of all cards (in days).
  }
  const avgInterval = allCards.length > 0 ? (totalIntervalDays / allCards.length) : 0;
  const retentionHalfLifeCurrent = Number(avgInterval.toFixed(1));
  const retentionHalfLife30dTrend = 0; // Requires historical snapshots to diff against. Simplification for now.

  // 2. Growth Velocity Tracking
  const history30d = await SmarterIndexSnapshot.find({
    userId,
    date: { $gte: past30DaysDate }
  }).sort({ date: 1 }).lean();

  const history7d = history30d.filter(h => new Date(h.date) >= past7DaysDate);

  // Helper function to calculate linear regression slope
  const getSlope = (data: Array<{ siScore?: number }>) => {
    if (data.length < 2) return 0;
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    data.forEach((d, i) => {
      sumX += i;
      sumY += d.siScore || 0;
      sumXY += i * (d.siScore || 0);
      sumXX += i * i;
    });
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return Number(slope.toFixed(2));
  };

  const siSlope7d = getSlope(history7d);
  const siSlope30d = getSlope(history30d);

  let accelerationRate: 'Plateau' | 'Gradual Growth' | 'Accelerating' | 'Declining' = 'Plateau';
  if (siSlope7d > 1.5) accelerationRate = 'Accelerating';
  else if (siSlope7d > 0.2) accelerationRate = 'Gradual Growth';
  else if (siSlope7d < -0.5) accelerationRate = 'Declining';

  const profile = await CognitiveProfile.findOneAndUpdate(
    { userId },
    {
      $set: {
        retentionHalfLifeCurrent,
        retentionHalfLife30dTrend,
        siSlope7d,
        siSlope30d,
        accelerationRate
      }
    },
    { new: true, upsert: true }
  ).lean();

  return { success: true, profile: JSON.parse(JSON.stringify(profile)) };
}

export async function logReadingSessionAction(params: {
  documentId: string;
  durationMs: number;
  wordsRead: number;
  wpm: number;
  regressions: number;
  pauses: number;
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
    pauses: params.pauses,
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

  // Fetch contextual data
  const recentReads = await ReadingSession.find({ userId, date: { $gte: past7DaysDate } }).lean();
  const allCards = await Flashcard.find({ userId }).select('accuracyHistory interval documentId conceptClusterId').lean();
  const clusters = await ConceptCluster.find({ userId }).lean();

  // 1. Processing Speed Index (PSI) = Effective WPM * comprehension %
  let avgWpm = 250;
  const totalSessions = recentReads.length;
  if (totalSessions > 0) {
    const sumWpm = recentReads.reduce((acc, r) => acc + (r.wpm || 0), 0);
    avgWpm = sumWpm / totalSessions;
  }
  
  let correctHits = 0;
  let totalHits = 0;
  let sumIntervals = 0;
  const uniqueDocs = new Set<string>();

  allCards.forEach(c => {
    if (c.interval) sumIntervals += c.interval;
    if (c.documentId) uniqueDocs.add(c.documentId);
    if (c.accuracyHistory) {
      c.accuracyHistory.forEach(h => {
        totalHits++;
        if (h) correctHits++;
      });
    }
  });

  const comprehensionPct = totalHits > 0 ? (correctHits / totalHits) : 0.5; // default 50%
  const effectiveWpm = avgWpm * comprehensionPct;
  // Normalize PSI (Max 1000 EWPM = 100)
  const psiScore = Math.min(100, Math.max(0, (effectiveWpm / 1000) * 100));

  // 2. Retention Stability Index (RSI) = Avg interval growth * recall consistency
  const avgInterval = allCards.length > 0 ? sumIntervals / allCards.length : 1;
  const intervalScore = Math.min(100, (avgInterval / 30) * 100); // 30 days is "mastered"
  const recallConsistency = comprehensionPct * 100;
  const rsiScore = (intervalScore * 0.5) + (recallConsistency * 0.5);

  // 3. Focus Stability Index (FSI) = low pause frequency * low regression rate
  let avgRegressions = 0;
  let avgPauses = 0;
  if (totalSessions > 0) {
    const totalRegressions = recentReads.reduce((acc, r) => acc + (r.regressions || 0), 0);
    const totalPauses = recentReads.reduce((acc, r) => acc + (r.pauses || 0), 0);
    avgRegressions = totalRegressions / totalSessions;
    avgPauses = totalPauses / totalSessions;
  }
  // Max regressions allowed for good score = ~10 per session, Max pauses = ~10
  const regressionPenalty = Math.min(10, avgRegressions) * 5;
  const pausePenalty = Math.min(10, avgPauses) * 5;
  let fsiScore = 100 - (regressionPenalty + pausePenalty);
  fsiScore = Math.max(0, fsiScore);

  // 4. Concept Integration Index (CII) = Cross-document concept mastery
  // Derived from ConceptClusters stability and cross doc connections
  let avgClusterAcc = 0;
  if (clusters.length > 0) {
    avgClusterAcc = clusters.reduce((acc, c) => acc + (c.averageAccuracy || 0), 0) / clusters.length;
  }
  const multiDocBonus = Math.min(20, (uniqueDocs.size * 2)); // 2 pts per unique doc read
  const ciiScore = Math.min(100, (avgClusterAcc * 100) + multiDocBonus);

  // Overall Smarter Index calculation
  // SI = (PSI × 0.3) + (RSI × 0.3) + (FSI × 0.2) + (CII × 0.2)
  const siScore = (psiScore * 0.3) + (rsiScore * 0.3) + (fsiScore * 0.2) + (ciiScore * 0.2);

  // Snapshot generation
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const currentSnapshot = await SmarterIndexSnapshot.findOneAndUpdate(
    { userId, date: today },
    { $set: { psiScore, rsiScore, fsiScore, ciiScore, siScore } },
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

export async function generateCognitiveInsightsAction() {
  const { userId } = await auth();
  if (!userId) return { success: false, insights: [] };

  await dbConnect();
  
  const insights: string[] = [];

  // Fetch the latest SI snapshot
  const latestSnapshot = await SmarterIndexSnapshot.findOne({ userId }).sort({ date: -1 }).lean();
  if (latestSnapshot) {
    if ((latestSnapshot.fsiScore || 0) < 50) {
      insights.push("Your focus stability is dropping. Try limiting your reading blocks to 15-20 minutes, then take a short walk.");
    }
    if ((latestSnapshot.psiScore || 0) < 50) {
      insights.push("Your processing speed and comprehension are plateauing. Practice slowing your WPM down by 10% on highly dense material to maintain retention.");
    }
    if ((latestSnapshot.rsiScore || 0) < 50) {
      insights.push("Retention stability is lagging. Make sure to complete your Spaced Repetition flashcards within 24 hours of generation.");
    }
  }

  // Check weak Concept Clusters
  const weakClusters = await ConceptCluster.find({ userId, averageAccuracy: { $lt: 0.6, $gt: 0 } }).sort({ averageAccuracy: 1 }).limit(1).lean();
  if (weakClusters.length > 0) {
    insights.push(`You have been struggling with the concept cluster "${weakClusters[0].name}". Consider running a targeted review session to rebuild those mental models.`);
  }

  // Check growth velocity
  const profile = await CognitiveProfile.findOne({ userId }).lean();
  if (profile) {
    if (profile.accelerationRate === 'Accelerating') {
      insights.push("Your cognitive growth velocity is accelerating! You are successfully compounding knowledge week over week.");
    } else if (profile.accelerationRate === 'Plateau' || profile.accelerationRate === 'Declining') {
      insights.push("Your growth trajectory has plateaued recently. Try varying your subject matter or increasing your focus intensity during flashcard reviews.");
    }
  }

  // Default uplifting insight if nothing flags red
  if (insights.length === 0) {
    insights.push("All systems optimal. Keep compounding your reading and retention habits.");
  }

  return { success: true, insights };
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
