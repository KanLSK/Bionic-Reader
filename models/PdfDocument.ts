import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPdfDocument extends Document {
  filename: string;
  s3Url: string;
  rawText: string;
  userId: string;
  uploadDate: Date;
  currentWordIndex?: number;
  lastOpened?: Date;
  projectId?: mongoose.Types.ObjectId;
  tags: mongoose.Types.ObjectId[];
  status: string;
  totalReadingTimeMs: number;
  flashcardCount: number;
}

const PdfDocumentSchema: Schema = new Schema({
  filename: { type: String, required: true },
  s3Url: { type: String, required: true },
  rawText: { type: String, required: true },
  userId: { type: String, required: true, index: true },
  uploadDate: { type: Date, default: Date.now },
  currentWordIndex: { type: Number, default: 0 },
  lastOpened: { type: Date, default: Date.now },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
  tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
  status: { 
    type: String, 
    enum: ['In Progress', 'Completed', 'Paused', 'Needs Review', 'Archived'], 
    default: 'In Progress' 
  },
  totalReadingTimeMs: { type: Number, default: 0 },
  flashcardCount: { type: Number, default: 0 },
});

// Use models map to prevent OverwriteModelError in NextJS hot reloading
const PdfDocument: Model<IPdfDocument> = 
  mongoose.models.PdfDocument || mongoose.model<IPdfDocument>('PdfDocument', PdfDocumentSchema);

export default PdfDocument;
