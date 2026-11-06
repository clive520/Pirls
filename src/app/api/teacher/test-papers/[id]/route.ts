import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import { getTestPaperById, updateTestPaper, deleteTestPaper, getTeacherClasses } from '@/lib/db';

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

  // 僅建立者本人、管理者、已設為公開，或指派給該教師任教班級之試卷可存取
  const teacherClasses = await getTeacherClasses(teacher.userId, teacher.role);
  const teacherClassIds = new Set(teacherClasses.map((c) => c.id));
  const hasAssignedToMyClass = testPaper.assignedClassIds?.some((cid) => teacherClassIds.has(cid));

  if (testPaper.creatorId !== teacher.userId && !testPaper.isPublic && !hasAssignedToMyClass && teacher.role !== 'admin') {
    return NextResponse.json({ error: '您無權存取其他教師之未公開試卷' }, { status: 403 });
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

  const existing = await getTestPaperById(params.id);
  if (!existing) {
    return NextResponse.json({ error: '找不到該試卷' }, { status: 404 });
  }

  // 僅試卷建立者本人或最高管理員可以再度編輯
  if (existing.creatorId !== teacher.userId && teacher.role !== 'admin') {
    return NextResponse.json(
      { error: '您只能編輯自己建立的試卷，無法修改其他教師之試卷' },
      { status: 403 }
    );
  }

  const body = await req.json();
  const payload = body.testPaper || body;
  const updated = await updateTestPaper(params.id, payload);

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

  const testPaper = await getTestPaperById(params.id);
  if (!testPaper) {
    return NextResponse.json({ error: '找不到該試卷' }, { status: 404 });
  }

  // 僅建立者本人或最高管理員可刪除試卷；別人的文章不能刪除
  if (testPaper.creatorId !== teacher.userId && teacher.role !== 'admin') {
    return NextResponse.json(
      { error: '您只能刪除自己建立的試卷，無法刪除其他教師或校本公共題庫之試卷' },
      { status: 403 }
    );
  }

  const success = await deleteTestPaper(params.id);
  return NextResponse.json({ success });
}
