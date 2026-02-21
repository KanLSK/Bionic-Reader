'use server';

import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import dbConnect from '@/lib/mongodb';
import PdfDocument from '@/models/PdfDocument';
// Ensure models are registered for population
import '@/models/Tag'; 
import '@/models/Project';
import { auth } from '@clerk/nextjs/server';

export async function getUserLibraryAction() {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    await dbConnect();
    
    // Sort by uploadDate descending, populate tags
    const docs = await PdfDocument.find({ userId })
      .populate('tags')
      .sort({ uploadDate: -1 })
      .lean();
    
    return {
      success: true,
      documents: JSON.parse(JSON.stringify(docs)),
    };
  } catch (error: any) {
    console.error('Error fetching user library:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch library',
      documents: []
    };
  }
}

export async function deleteDocumentAction(documentId: string) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    await dbConnect();

    // Verify ownership before deleting
    const doc = await PdfDocument.findOne({ _id: documentId, userId }).lean();
    if (!doc) throw new Error('Document not found or unauthorized');

    // Delete from S3 / Cloudflare R2
    const s3Client = new S3Client({
      region: process.env.R2_REGION || 'auto',
      endpoint: process.env.R2_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });

    // Extract the object key from the stored URL (last path segment)
    const s3Key = doc.s3Url.split('/').pop()!;

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: s3Key,
      }),
    );

    // Delete from MongoDB
    await PdfDocument.deleteOne({ _id: documentId, userId });

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting document:', error);
    return { success: false, error: error.message || 'Failed to delete document' };
  }
}

export async function updateDocumentProgressAction(documentId: string, currentWordIndex: number) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    await dbConnect();

    const doc = await PdfDocument.findOneAndUpdate(
      { _id: documentId, userId },
      { 
        $set: { 
          currentWordIndex,
          lastOpened: new Date()
        } 
      },
      { new: true }
    );

    if (!doc) throw new Error('Document not found or unauthorized');

    return { success: true };
  } catch (error: any) {
    console.error('Error updating document progress:', error);
    return { success: false, error: error.message || 'Failed to update progress' };
  }
}

export async function updateDocumentMetadataAction(
  documentId: string, 
  data: { projectId?: string | null; tags?: string[]; status?: string; filename?: string; }
) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    await dbConnect();

    const updateData: any = {};
    if (data.projectId !== undefined) {
      if (data.projectId === null) updateData.$unset = { projectId: 1 };
      else updateData.$set = { ...updateData.$set, projectId: data.projectId };
    }
    if (data.tags !== undefined) {
      updateData.$set = { ...updateData.$set, tags: data.tags };
    }
    if (data.status !== undefined) {
      updateData.$set = { ...updateData.$set, status: data.status };
    }
    if (data.filename !== undefined) {
      updateData.$set = { ...updateData.$set, filename: data.filename };
    }

    const doc = await PdfDocument.findOneAndUpdate(
      { _id: documentId, userId },
      updateData,
      { new: true }
    );

    if (!doc) throw new Error('Document not found or unauthorized');

    return { success: true };
  } catch (error: any) {
    console.error('Error updating document metadata:', error);
    return { success: false, error: error.message || 'Failed to update metadata' };
  }
}
