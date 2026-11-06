import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import { getTeacherTestPapers, createTestPaper, getAssignmentStatsSummary } from '@/lib/db';

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

  const isAdmin = teacher.role === 'admin';
  const testPapers = await getTeacherTestPapers(teacher.userId, isAdmin);
  const assignmentStats = await getAssignmentStatsSummary();

  return NextResponse.json({
    testPapers,
    assignmentStats,
    currentUserId: teacher.userId,
    currentUserName: teacher.displayName,
    isAdmin,
  });
}

export async function POST(req: NextRequest) {
  const teacher = await checkTeacher(req);
  if (!teacher) {
    return NextResponse.json({ error: '無存取權限' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const payload = body.testPaper || body;
    const {
      title,
      targetGrade,
      textType,
      themeSummary,
      wordCount,
      paragraphs,
      illustrations,
      questions,
      totalPoints,
      isPublic,
      timeLimitMinutes,
    } = payload;

    let articleContent = payload.articleContent;
    if (!articleContent && Array.isArray(paragraphs) && paragraphs.length > 0) {
      articleContent = paragraphs.map((p: any) => p.text).join('\n\n');
    }

    if (!title || !articleContent || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: '試卷內容不完整 (缺少標題、文章正文或題目清單)' }, { status: 400 });
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
  } catch (err: any) {
    console.error('[API] createTestPaper failed:', err);
    return NextResponse.json(
      { error: '儲存試卷至資料庫失敗：' + (err.message || '未知錯誤') },
      { status: 500 }
    );
  }
}
