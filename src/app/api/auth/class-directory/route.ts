import { NextResponse } from 'next/server';
import { getStudentLoginDirectory } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const teachers = await getStudentLoginDirectory();
    return NextResponse.json({ success: true, teachers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '無法取得班級座號名冊' }, { status: 500 });
  }
}
