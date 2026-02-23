import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IConceptCluster extends Document {
  userId: string;
  name: string; // The common topic tag
  averageAccuracy: number;
  averageIntervalGrowth: number;
  failureRate: number;
  stabilityIndex: number; // 0-100 score representing overall mastery
  createdAt: Date;
  updatedAt: Date;
}

const ConceptClusterSchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  averageAccuracy: { type: Number, default: 0 },
  averageIntervalGrowth: { type: Number, default: 1 },
  failureRate: { type: Number, default: 0 },
  stabilityIndex: { type: Number, default: 0 },
}, { timestamps: true });

const ConceptCluster: Model<IConceptCluster> =
  mongoose.models.ConceptCluster ||
  mongoose.model<IConceptCluster>('ConceptCluster', ConceptClusterSchema);

export default ConceptCluster;
