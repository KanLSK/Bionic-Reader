import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISmarterIndexSnapshot extends Document {
  userId: string;
  date: Date;
  siScore: number;
  reScore: number;
  rsScore: number;
  cScore: number;
}

const SmarterIndexSnapshotSchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  date: { type: Date, required: true, index: true }, // Normalized to start of day
  siScore: { type: Number, required: true },
  reScore: { type: Number, required: true },
  rsScore: { type: Number, required: true },
  cScore: { type: Number, required: true },
});

const SmarterIndexSnapshot: Model<ISmarterIndexSnapshot> =
  mongoose.models.SmarterIndexSnapshot ||
  mongoose.model<ISmarterIndexSnapshot>('SmarterIndexSnapshot', SmarterIndexSnapshotSchema);

export default SmarterIndexSnapshot;
