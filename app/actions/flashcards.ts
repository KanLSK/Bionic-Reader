'use server';

import dbConnect from '@/lib/mongodb';
import Flashcard from '@/models/Flashcard';
import { auth } from '@clerk/nextjs/server';

export interface FlashcardData {
  question: string;
  answer: string;
}

export async function saveFlashcardsAction(
  documentId: string,
  checkpoint: number,
  cards: FlashcardData[],
) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await dbConnect();

  const docs = cards.map((c) => ({
    documentId,
    userId,
    checkpoint,
    question: c.question,
    answer: c.answer,
  }));

  await Flashcard.insertMany(docs);
  return { success: true };
}

export async function recordFlashcardResponseAction(
  flashcardId: string,
  gotIt: boolean,
) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await dbConnect();

  const update = gotIt
    ? { $inc: { gotItCount: 1 } }
    : { $inc: { reviewCount: 1 } };

  await Flashcard.updateOne({ _id: flashcardId, userId }, update);
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
