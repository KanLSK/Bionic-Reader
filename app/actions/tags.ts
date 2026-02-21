'use server';

import dbConnect from '@/lib/mongodb';
import Tag from '@/models/Tag';
import { auth } from '@clerk/nextjs/server';

export async function createTagAction(name: string, color: string) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    await dbConnect();
    const tag = await Tag.create({ name, userId, color });
    return { success: true, tag: JSON.parse(JSON.stringify(tag)) };
  } catch (error: any) {
    console.error('Error creating tag:', error);
    return { success: false, error: error.message };
  }
}

export async function getUserTagsAction() {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    await dbConnect();
    const tags = await Tag.find({ userId }).sort({ name: 1 }).lean();
    return { success: true, tags: JSON.parse(JSON.stringify(tags)) };
  } catch (error: any) {
    console.error('Error fetching tags:', error);
    return { success: false, error: error.message, tags: [] };
  }
}

export async function deleteTagAction(tagId: string) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    await dbConnect();
    await Tag.deleteOne({ _id: tagId, userId });
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting tag:', error);
    return { success: false, error: error.message };
  }
}
