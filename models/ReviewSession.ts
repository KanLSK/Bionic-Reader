import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReviewSession extends Document {
  userId: string;
  date: Date;
  cardsReviewed: number;
  correctCount: number;
}

const ReviewSessionSchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  date: { type: Date, required: true, index: true }, // We typically normalize this to the start of the day
  cardsReviewed: { type: Number, default: 0 },
  correctCount: { type: Number, default: 0 },
});

const ReviewSession: Model<IReviewSession> =
  mongoose.models.ReviewSession ||
  mongoose.model<IReviewSession>('ReviewSession', ReviewSessionSchema);

export default ReviewSession;
