import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFlashcard extends Document {
  documentId: string;
  userId: string;
  checkpoint: number;       // 15 | 30 | 45 | 60 | 75 | 90
  question: string;
  answer: string;
  gotItCount: number;
  reviewCount: number;
  
  // SM-2 fields
  easeFactor: number;
  interval: number;
  repetitionCount: number;
  nextReviewDate: Date;
  accuracyHistory: boolean[];
  responseTimeMs: number;
  
  createdAt: Date;
}

const FlashcardSchema: Schema = new Schema({
  documentId: { type: String, required: true, index: true },
  userId:     { type: String, required: true, index: true },
  checkpoint: { type: Number, required: true },
  question:   { type: String, required: true },
  answer:     { type: String, required: true },
  gotItCount: { type: Number, default: 0 },
  reviewCount:{ type: Number, default: 0 },
  
  // SM-2 fields
  easeFactor:      { type: Number, default: 2.5 },
  interval:        { type: Number, default: 0 }, // In days
  repetitionCount: { type: Number, default: 0 },
  nextReviewDate:  { type: Date, default: Date.now, index: true },
  accuracyHistory: { type: [Boolean], default: [] },
  responseTimeMs:  { type: Number, default: 0 },
  
  createdAt:  { type: Date, default: Date.now },
});

const Flashcard: Model<IFlashcard> =
  mongoose.models.Flashcard ||
  mongoose.model<IFlashcard>('Flashcard', FlashcardSchema);

export default Flashcard;
