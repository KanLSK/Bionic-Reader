import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReadingSession extends Document {
  userId: string;
  documentId: string;
  date: Date;
  durationMs: number;
  wordsRead: number;
  wpm: number;
  regressions: number;
}

const ReadingSessionSchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  documentId: { type: String, required: true },
  date: { type: Date, default: Date.now, index: true },
  durationMs: { type: Number, required: true },
  wordsRead: { type: Number, required: true },
  wpm: { type: Number, required: true },
  regressions: { type: Number, default: 0 },
});

const ReadingSession: Model<IReadingSession> =
  mongoose.models.ReadingSession ||
  mongoose.model<IReadingSession>('ReadingSession', ReadingSessionSchema);

export default ReadingSession;
