import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICognitiveProfile extends Document {
  userId: string;
  retentionHalfLifeCurrent: number; // in days
  retentionHalfLife30dTrend: number;
  siSlope7d: number;
  siSlope30d: number;
  accelerationRate: 'Plateau' | 'Gradual Growth' | 'Accelerating' | 'Declining';
  createdAt: Date;
  updatedAt: Date;
}

const CognitiveProfileSchema: Schema = new Schema({
  userId: { type: String, required: true, index: true, unique: true },
  retentionHalfLifeCurrent: { type: Number, default: 0 },
  retentionHalfLife30dTrend: { type: Number, default: 0 },
  siSlope7d: { type: Number, default: 0 },
  siSlope30d: { type: Number, default: 0 },
  accelerationRate: { 
    type: String, 
    enum: ['Plateau', 'Gradual Growth', 'Accelerating', 'Declining'], 
    default: 'Plateau' 
  }
}, { timestamps: true });

const CognitiveProfile: Model<ICognitiveProfile> =
  mongoose.models.CognitiveProfile ||
  mongoose.model<ICognitiveProfile>('CognitiveProfile', CognitiveProfileSchema);

export default CognitiveProfile;
