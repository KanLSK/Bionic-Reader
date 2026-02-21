import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITag extends Document {
  name: string;
  userId: string;
  color: string;
}

const TagSchema: Schema = new Schema({
  name: { type: String, required: true },
  userId: { type: String, required: true, index: true },
  color: { type: String, default: '#6366f1' },
});

const Tag: Model<ITag> =
  mongoose.models.Tag || mongoose.model<ITag>('Tag', TagSchema);

export default Tag;
