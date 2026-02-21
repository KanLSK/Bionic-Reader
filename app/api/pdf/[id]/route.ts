import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import PdfDocument from '@/models/PdfDocument';

const s3Client = new S3Client({
  region: process.env.R2_REGION || 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;

    // Fetch the document record to verify ownership and get the R2 file key
    await dbConnect();
    const doc = await PdfDocument.findOne({ _id: id, userId }).lean() as { s3Url: string } | null;

    if (!doc) {
      return new NextResponse('Not found', { status: 404 });
    }

    // Extract the file key from the stored S3 URL
    const s3Url = doc.s3Url;
    const bucketName = process.env.R2_BUCKET_NAME!;

    // The key is the last path segment of the URL
    const fileKey = s3Url.split('/').pop()!;

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      return new NextResponse('File not found in storage', { status: 404 });
    }

    // Stream the PDF bytes back to the browser
    const bytes = await response.Body.transformToByteArray();
    const arrayBuffer = bytes.buffer as ArrayBuffer;

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(bytes.byteLength),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('PDF proxy error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
