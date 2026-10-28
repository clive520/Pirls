import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import { assignTestPaperToClasses } from '@/lib/db';

async function checkTeacher(req: NextRequest) {
  const token = req.cookies.get('pirls_token')?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session || (session.role !== 'teacher' && session.role !== 'admin')) return null;
  return session;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const teacher = await checkTeacher(req);
  if (!teacher) {
    return NextResponse.json({ error: '無存取權限' }, { status: 403 });
  }

  const body = await req.json();
  const { classIds, isPublic, examCode } = body;

  if (!Array.isArray(classIds)) {
    return NextResponse.json({ error: '請提供班級 ID 陣列' }, { status: 400 });
  }

  const success = await assignTestPaperToClasses(params.id, classIds, {
    isPublic,
    examCode,
  });
  if (!success) {
    return NextResponse.json({ error: '找不到試卷' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    message: `已成功將試卷指派給 ${classIds.length} 個班級！`,
  });
}
