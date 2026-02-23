import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISmarterIndexSnapshot extends Document {
  userId: string;
  date: Date;
  siScore: number;
  psiScore: number;
  rsiScore: number;
  fsiScore: number;
  ciiScore: number;
}

const SmarterIndexSnapshotSchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  date: { type: Date, required: true, index: true }, // Normalized to start of day
  siScore: { type: Number, required: true },
  psiScore: { type: Number, required: true },
  rsiScore: { type: Number, required: true },
  fsiScore: { type: Number, required: true },
  ciiScore: { type: Number, required: true },
});

const SmarterIndexSnapshot: Model<ISmarterIndexSnapshot> =
  mongoose.models.SmarterIndexSnapshot ||
  mongoose.model<ISmarterIndexSnapshot>('SmarterIndexSnapshot', SmarterIndexSnapshotSchema);

export default SmarterIndexSnapshot;
