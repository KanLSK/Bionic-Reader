'use server';

import dbConnect from '@/lib/mongodb';
import Project from '@/models/Project';
import PdfDocument from '@/models/PdfDocument';
import { auth } from '@clerk/nextjs/server';

export async function createProjectAction(name: string, color?: string) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    await dbConnect();
    const project = await Project.create({ name, userId, color });
    return { success: true, project: JSON.parse(JSON.stringify(project)) };
  } catch (error: any) {
    console.error('Error creating project:', error);
    return { success: false, error: error.message };
  }
}

export async function getUserProjectsAction() {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    await dbConnect();
    
    // Aggregate to get simple document counts. Full document fetching handles complex stats.
    const projects = await Project.find({ userId }).sort({ createdAt: 1 }).lean();
    
    const projectsWithCounts = await Promise.all(projects.map(async (p: any) => {
      const docCount = await PdfDocument.countDocuments({ projectId: p._id, userId });
      return { ...p, documentCount: docCount };
    }));

    return { success: true, projects: JSON.parse(JSON.stringify(projectsWithCounts)) };
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    return { success: false, error: error.message, projects: [] };
  }
}

export async function renameProjectAction(projectId: string, name: string) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    await dbConnect();
    await Project.updateOne({ _id: projectId, userId }, { name });
    return { success: true };
  } catch (error: any) {
    console.error('Error renaming project:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteProjectAction(projectId: string) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    await dbConnect();
    // Do not delete documents, just unassign them
    await PdfDocument.updateMany({ projectId, userId }, { $unset: { projectId: 1 } });
    await Project.deleteOne({ _id: projectId, userId });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting project:', error);
    return { success: false, error: error.message };
  }
}
