'use server';

import dbConnect from '@/lib/mongodb';
import Tag from '@/models/Tag';
import PdfDocument from '@/models/PdfDocument';
import { auth } from '@clerk/nextjs/server';

export async function createTagAction(name: string, color: string) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    await dbConnect();
    const tag = await Tag.create({ name, userId, color });
    return { success: true, tag: JSON.parse(JSON.stringify(tag)) };
  } catch (error: unknown) {
    console.error('Error creating tag:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getUserTagsAction() {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    await dbConnect();
    const tags = await Tag.find({ userId }).sort({ createdAt: 1 }).lean();
    return { success: true, tags: JSON.parse(JSON.stringify(tags)) };
  } catch (error: unknown) {
    console.error('Error fetching tags:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', tags: [] };
  }
}

export async function deleteTagAction(tagId: string) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    await dbConnect();
    await PdfDocument.updateMany({ tags: tagId, userId }, { $pull: { tags: tagId } });
    await Tag.deleteOne({ _id: tagId, userId });
    
    return { success: true };
  } catch (error: unknown) {
    console.error('Error deleting tag:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
