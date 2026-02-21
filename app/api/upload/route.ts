import { NextRequest, NextResponse } from 'next/server';
import { uploadPdfAction } from '@/app/actions/upload';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const result = await uploadPdfAction(formData);
    if (result.success) {
      return NextResponse.json(result);
    }
    return NextResponse.json(result, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Upload failed' }, { status: 500 });
  }
}
