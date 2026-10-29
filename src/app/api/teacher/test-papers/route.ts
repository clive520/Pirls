import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import { getTeacherTestPapers, createTestPaper } from '@/lib/db';

export const dynamic = 'force-dynamic';

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
    return NextResponse.json({ error: '無存取權限' }, { status: 403 });
  }

  const testPapers = await getTeacherTestPapers(teacher.userId);
  return NextResponse.json({ testPapers });
}

export async function POST(req: NextRequest) {
  const teacher = await checkTeacher(req);
  if (!teacher) {
    return NextResponse.json({ error: '無存取權限' }, { status: 403 });
  }

  const body = await req.json();
  const {
    title,
    targetGrade,
    textType,
    themeSummary,
    wordCount,
    articleContent,
    paragraphs,
    illustrations,
    questions,
    totalPoints,
    isPublic,
    timeLimitMinutes,
  } = body;

  if (!title || !articleContent || !Array.isArray(questions)) {
    return NextResponse.json({ error: '試卷內容不完整' }, { status: 400 });
  }

  const newTest = await createTestPaper({
    title,
    targetGrade: targetGrade || 4,
    textType: textType || 'literary',
    themeSummary: themeSummary || '',
    wordCount: wordCount || articleContent.length,
    articleContent,
    paragraphs: paragraphs || [{ paragraphNumber: 1, text: articleContent }],
    illustrations: illustrations || [],
    questions,
    totalPoints: totalPoints || questions.reduce((sum: number, q: any) => sum + (q.points || 1), 0),
    creatorId: teacher.userId,
    creatorName: teacher.displayName,
    isPublic: Boolean(isPublic),
    timeLimitMinutes: timeLimitMinutes || 40,
  });

  return NextResponse.json({
    success: true,
    testPaper: newTest,
  });
}
