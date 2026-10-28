import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import { getTestPaperById, updateTestPaper, deleteTestPaper } from '@/lib/db';

async function checkTeacher(req: NextRequest) {
  const token = req.cookies.get('pirls_token')?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session || (session.role !== 'teacher' && session.role !== 'admin')) return null;
  return session;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const teacher = await checkTeacher(req);
  if (!teacher) {
    return NextResponse.json({ error: '無存取權限' }, { status: 403 });
  }

  const testPaper = await getTestPaperById(params.id);
  if (!testPaper) {
    return NextResponse.json({ error: '找不到該試卷' }, { status: 404 });
  }

  return NextResponse.json({ testPaper });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const teacher = await checkTeacher(req);
  if (!teacher) {
    return NextResponse.json({ error: '無存取權限' }, { status: 403 });
  }

  const body = await req.json();
  const updated = await updateTestPaper(params.id, body);

  if (!updated) {
    return NextResponse.json({ error: '更新失敗' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    testPaper: updated,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const teacher = await checkTeacher(req);
  if (!teacher) {
    return NextResponse.json({ error: '無存取權限' }, { status: 403 });
  }

  const success = await deleteTestPaper(params.id);
  return NextResponse.json({ success });
}
