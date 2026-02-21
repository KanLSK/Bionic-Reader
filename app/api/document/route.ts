import { getPdfDocumentAction } from '@/app/actions/upload';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, error: 'Target ID is required' }, { status: 400 });
  }

  const result = await getPdfDocumentAction(id);
  
  if (result.success) {
    return NextResponse.json(result);
  } else {
    return NextResponse.json(result, { status: 404 });
  }
}
