import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';
import { createClass, getTeacherClasses } from '@/lib/db';

async function checkTeacher(req: NextRequest) {
  const token = req.cookies.get('pirls_token')?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session || (session.role !== 'teacher' && session.role !== 'admin')) return null;
  return session;
}

export async function GET(req: NextRequest) {
  const teacher = await checkTeacher(req);
  if (!teacher) {
    return NextResponse.json({ error: '無教師存取權限' }, { status: 403 });
  }

  const classes = await getTeacherClasses(teacher.userId);
  return NextResponse.json({ classes });
}

export async function POST(req: NextRequest) {
  const teacher = await checkTeacher(req);
  if (!teacher) {
    return NextResponse.json({ error: '無教師存取權限' }, { status: 403 });
  }

  const body = await req.json();
  const { name, gradeLevel } = body;

  if (!name || !gradeLevel) {
    return NextResponse.json({ error: '請輸入班級名稱與年級' }, { status: 400 });
  }

  const parsedGrade = parseInt(gradeLevel, 10);
  if (isNaN(parsedGrade) || parsedGrade < 3 || parsedGrade > 6) {
    return NextResponse.json({ error: '年級必須在 3 到 6 年級之間' }, { status: 400 });
  }

  const newClass = await createClass(teacher.userId, name.trim(), parsedGrade);

  return NextResponse.json({
    success: true,
    class: newClass,
  });
}
