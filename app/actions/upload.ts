'use server';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import dbConnect from '@/lib/mongodb';
import PdfDocument from '@/models/PdfDocument';
import { auth } from '@clerk/nextjs/server';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (buffer: Buffer) => Promise<{ text: string; numpages: number }> = require('pdf-parse');

// ─────────────────────────────────────────────────────────────────────────────
// PDF text normalizer — fixes artifacts produced by pdf-parse on multi-column
// academic/medical PDFs before storing or rendering.
// ─────────────────────────────────────────────────────────────────────────────
function cleanPdfText(raw: string): string {
  return raw
    // Step 1 — Normalize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

    // Step 2 — Fix known PDF glyph substitutions
    // !m (and !g, !l, !s, !n, !mol) → the appropriate Unicode / abbreviation
    // pdf-parse substitutes μ, fi, fl ligatures etc. with ! or ?
    .replace(/!\s*m\b/g, '\u03bcm')   // !m  → μm
    .replace(/!\s*g\b/g, '\u03bcg')   // !g  → μg
    .replace(/!\s*l\b/g, '\u03bcl')   // !l  → μl
    .replace(/!\s*mol\b/g, '\u03bcmol') // !mol → μmol
    .replace(/~/g, '\u2248')          // ~   → ≈ (approximately) when used as a prefix
    // Lone ! not followed by letters — just remove
    .replace(/(?<=[\s\n])!(?=[\s\n])/g, '')
    .replace(/^!$/gm, '')
    // ! before a capital word (PDF heading artifact, e.g. !ETIOLOGIC) — strip the !
    .replace(/!(?=[A-Z])/g, '')

    // Step 3 — Rejoin hyphenated line-wrap words  (hemor-\nrhage → hemorrhage)
    .replace(/(\w)-\n([a-z])/g, '$1$2')

    // Step 4 — Rejoin ALL_CAPS words split across PDF columns
    // If two consecutive CAPS-only tokens (2–8 letters each) are separated by
    // a single newline, join them into one word.
    // e.g. EPI\nDEMIOLOGY → EPIDEMIOLOGY
    .replace(/\b([A-Z]{2,8})\n([A-Z]{2,})\b/g, '$1$2')

    // Step 5 — Rejoin single-uppercase-letter orphan at start of a word
    // e.g. L\neptospirosis → Leptospirosis   (PDF column-orphan)
    .replace(/\b([A-Z])\n([a-z]{2,})/g, '$1$2')

    // Step 6 — Collapse remaining single newlines (line-wraps) → space
    .replace(/([^\n])\n([^\n])/g, '$1 $2')

    // Step 7 — Normalize multiple blank lines → at most one paragraph break
    .replace(/\n{3,}/g, '\n\n')

    // Trim leading/trailing whitespace
    .trim();
}

export async function uploadPdfAction(formData: FormData) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    const file = formData.get('file') as File | null;
    if (!file) {
      throw new Error('No file provided');
    }

    const projectId = formData.get('projectId') as string | null;
    const tagsString = formData.get('tags') as string | null;
    let tags: string[] = [];
    if (tagsString) {
      try {
        tags = JSON.parse(tagsString);
      } catch (e) {
        console.warn('Failed to parse tags JSON', e);
      }
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Extract text from PDF using pdf-parse (Node-native, no web worker)
    const pdfData = await pdfParse(buffer);
    const rawText = cleanPdfText(pdfData.text);

    // 2. Upload to S3 / Cloudflare R2
    const s3Client = new S3Client({
      region: process.env.R2_REGION || 'auto',
      endpoint: process.env.R2_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });

    const fileExtension = file.name.split('.').pop();
    const fileKey = `${uuidv4()}.${fileExtension}`;
    const bucketName = process.env.R2_BUCKET_NAME!;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(command);

    // Public URL logic depends on whether you have a custom domain for R2
    const publicUrl = process.env.R2_PUBLIC_DOMAIN 
      ? `${process.env.R2_PUBLIC_DOMAIN}/${fileKey}`
      : `${process.env.R2_ENDPOINT}/${bucketName}/${fileKey}`; // Fallback, usually private without custom config

    // 3. Save to MongoDB
    await dbConnect();

    const newDoc = new PdfDocument({
      filename: file.name,
      s3Url: publicUrl,
      rawText: rawText,
      userId: userId,
      projectId: projectId || undefined,
      tags: tags,
    });

    const savedDoc = await newDoc.save();

    return {
      success: true,
      documentId: savedDoc._id.toString(),
    };
  } catch (error: any) {
    console.error('Error in uploadPdfAction:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload and process PDF',
    };
  }
}

export async function getPdfDocumentAction(id: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error('Unauthorized');
    }

    await dbConnect();
    const doc = await PdfDocument.findOne({ _id: id, userId: userId }).lean();
    if (!doc) {
      throw new Error('Document not found or unauthorized access');
    }
    return {
      success: true,
      document: JSON.parse(JSON.stringify(doc)),
    };
  } catch (error: any) {
    console.error('Error fetching document:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch document',
    };
  }
}
