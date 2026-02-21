import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProject extends Document {
  name: string;
  userId: string;
  color?: string;
  createdAt: Date;
}

const ProjectSchema: Schema = new Schema({
  name: { type: String, required: true },
  userId: { type: String, required: true, index: true },
  color: { type: String, default: '#3b82f6' },
  createdAt: { type: Date, default: Date.now },
});

const Project: Model<IProject> =
  mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema);

export default Project;
