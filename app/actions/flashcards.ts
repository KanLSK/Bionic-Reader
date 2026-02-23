'use server';

import dbConnect from '@/lib/mongodb';
import Flashcard from '@/models/Flashcard';
import PdfDocument from '@/models/PdfDocument';
import ConceptCluster from '@/models/ConceptCluster';
import UserSetting from '@/models/UserSetting';
import { auth } from '@clerk/nextjs/server';

export interface FlashcardData {
  question: string;
  answer: string;
  topicTag?: string;
  sectionComplexityScore?: number;
}

// Basic Jaccard Similarity for duplicate prevention
function calculateJaccardSimilarity(str1: string, str2: string): number {
  const set1 = new Set(str1.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/));
  const set2 = new Set(str2.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/));
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / (union.size || 1);
}

export async function saveFlashcardsAction(
  documentId: string,
  checkpoint: number,
  cards: FlashcardData[],
) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await dbConnect();

  // Fetch existing cards for this doc to prevent duplicates
  const existingCards = await Flashcard.find({ documentId, userId }).lean();
  
  const docsToInsert = [];
  
  for (const newCard of cards) {
    let isDuplicate = false;
    for (const existingCard of existingCards) {
      const similarity = calculateJaccardSimilarity(newCard.question, existingCard.question);
      if (similarity > 0.8) {
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate) {
      // 1. Resolve ConceptCluster ID
      let clusterId = undefined;
      let initialDiffMod = 1.0;

      if (newCard.topicTag) {
        // Find existing cluster or create one
        let cluster = await ConceptCluster.findOne({ userId, name: newCard.topicTag });
        if (!cluster) {
          cluster = await ConceptCluster.create({
            userId,
            name: newCard.topicTag,
            averageAccuracy: 0,
            averageIntervalGrowth: 1,
            failureRate: 0,
            stabilityIndex: 0
          });
        }
        clusterId = cluster._id.toString();

        // Optional: Look at cluster stats to adjust initial difficulty
        if (cluster.averageAccuracy > 0 && cluster.averageAccuracy < 0.6) {
           initialDiffMod = 0.8; // harder, interval grows slower
        } else if (cluster.averageAccuracy >= 0.8) {
           initialDiffMod = 1.2; // easier, interval grows faster
        }
      }

      docsToInsert.push({
        documentId,
        userId,
        checkpoint,
        question: newCard.question,
        answer: newCard.answer,
        topicTag: newCard.topicTag,
        conceptClusterId: clusterId,
        sectionComplexityScore: newCard.sectionComplexityScore,
        initialDifficultyModifier: initialDiffMod,
      });
    }
  }

  if (docsToInsert.length > 0) {
    await Flashcard.insertMany(docsToInsert);
    // Also update document flashcard count if desired
    try {
      await PdfDocument.updateOne(
        { _id: documentId },
        { $inc: { flashcardCount: docsToInsert.length } }
      );
    } catch(err) {
      console.error("Could not update PdfDocument flashcardCount", err);
    }
  }
  
  return { success: true, savedCount: docsToInsert.length };
}

export async function recordFlashcardResponseAction(
  flashcardId: string,
  rating: 'Again' | 'Hard' | 'Good' | 'Easy',
  responseTimeMs: number = 0
) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await dbConnect();

  const card = await Flashcard.findOne({ _id: flashcardId, userId });
  if (!card) throw new Error('Flashcard not found');

  // Fetch user settings or use defaults
  const settings = await UserSetting.findOne({ userId }).lean();
  let hardMultiplier = 1.2;
  let easyMultiplier = 1.3;
  let intervalModifier = 1.0;
  
  if (settings?.sm2) {
    hardMultiplier = settings.sm2.hardMultiplier ?? 1.2;
    easyMultiplier = settings.sm2.easyMultiplier ?? 1.3;
    intervalModifier = settings.sm2.intervalModifier ?? 1.0;
  }

  // SM-2 Logic
  // Quality: Again=0, Hard=3, Good=4, Easy=5
  const qMap: Record<'Again' | 'Hard' | 'Good' | 'Easy', number> = { Again: 0, Hard: 3, Good: 4, Easy: 5 };
  const q = qMap[rating];

  let newInterval = 0;
  let newRepetitions = card.repetitionCount;
  let newEaseFactor = card.easeFactor || 2.5;

  // Context-Aware Modifiers
  const initialDiffMod = card.initialDifficultyModifier || 1.0;
  let clusterWeight = 1.0;

  if (card.conceptClusterId) {
    const cluster = await ConceptCluster.findById(card.conceptClusterId).lean();
    if (cluster) {
      if (cluster.averageAccuracy > 0 && cluster.averageAccuracy < 0.6) {
        clusterWeight = 0.8; // User historically weak: intervals grow slower
      } else if (cluster.averageAccuracy >= 0.8) {
        clusterWeight = 1.1; // User historically strong: intervals grow faster
      }
    }
  }

  const combinedContextMod = initialDiffMod * clusterWeight * intervalModifier;

  if (q < 3) { // Again
    newRepetitions = 0;
    newInterval = 1; // 1 day interval to review again soon
  } else { // Hard, Good, Easy
    if (newRepetitions === 0) {
      newInterval = 1;
    } else if (newRepetitions === 1) {
      newInterval = 6;
    } else {
      if (rating === 'Hard') {
        newInterval = Math.round(card.interval * hardMultiplier * combinedContextMod);
      } else if (rating === 'Easy') {
        newInterval = Math.round(card.interval * newEaseFactor * easyMultiplier * combinedContextMod);
      } else { // Good
        newInterval = Math.round(card.interval * newEaseFactor * combinedContextMod);
      }
    }
    newRepetitions += 1;
  }

  // Update ease factor: EF = EF + (0.1 - (5-q)*(0.08 + (5-q)*0.02))
  newEaseFactor = newEaseFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (newEaseFactor < 1.3) newEaseFactor = 1.3;

  const nextReviewDate = new Date(Date.now() + newInterval * 24 * 60 * 60 * 1000);
  
  const isCorrect = q >= 3;

  await Flashcard.updateOne(
    { _id: flashcardId },
    {
      $set: {
        easeFactor: newEaseFactor,
        interval: newInterval,
        repetitionCount: newRepetitions,
        nextReviewDate,
        responseTimeMs,
      },
      $push: { accuracyHistory: isCorrect },
      $inc: { reviewCount: 1, gotItCount: isCorrect ? 1 : 0 }
    }
  );

  // Hook into analytics pipeline
  try {
    const { logReviewSessionAction } = await import('@/app/actions/analytics');
    await logReviewSessionAction(1, isCorrect ? 1 : 0);
  } catch (err) {
    console.error("Failed to log review session", err);
  }

  return { success: true };
}

export async function getFlashcardsForDocumentAction(documentId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await dbConnect();

  const cards = await Flashcard.find({ documentId, userId })
    .sort({ createdAt: -1 })
    .lean();

  return { success: true, flashcards: JSON.parse(JSON.stringify(cards)) };
}

export async function getDailyReviewQueueAction() {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await dbConnect();

  const now = new Date();

  // Cards ready for review: nextReviewDate <= now or missing
  // Prioritize: Overdue (nextReviewDate asc), Weak (easeFactor asc), New (repetitionCount asc)
  const dueCards = await Flashcard.find({
    userId,
    $or: [{ nextReviewDate: { $lte: now } }, { nextReviewDate: { $exists: false } }]
  })
    .sort({ nextReviewDate: 1, easeFactor: 1, repetitionCount: 1 })
    .limit(100) // cap queue for sanity
    .lean();

  // Populate document names manually since it's a cross-collection string ref
  const docIds = [...new Set(dueCards.map(c => c.documentId))];
  const docs = await PdfDocument.find({ _id: { $in: docIds } }, { filename: 1 }).lean();
  
  const docMap = docs.reduce((acc, doc) => {
    acc[doc._id.toString()] = doc.filename;
    return acc;
  }, {} as Record<string, string>);

  const enrichedCards = dueCards.map(card => ({
    ...card,
    documentData: {
      filename: docMap[card.documentId] || 'Unknown Document'
    }
  }));

  return { success: true, queue: JSON.parse(JSON.stringify(enrichedCards)) };
}

export async function getUserSettingsAction() {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await dbConnect();

  let settings = await UserSetting.findOne({ userId }).lean();
  if (!settings) {
    settings = await UserSetting.create({ userId });
  }

  return { success: true, settings: JSON.parse(JSON.stringify(settings)) };
}

export async function updateUserSettingsAction(updateData: Record<string, unknown>) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await dbConnect();

  const settings = await UserSetting.findOneAndUpdate(
    { userId },
    { $set: updateData },
    { new: true, upsert: true }
  ).lean();

  return { success: true, settings: JSON.parse(JSON.stringify(settings)) };
}
