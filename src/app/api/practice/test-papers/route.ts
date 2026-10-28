import { NextResponse } from 'next/server';
import { getPublicTestPapers } from '@/lib/db';

export async function GET() {
  try {
    const testPapers = await getPublicTestPapers();

    return NextResponse.json({
      testPapers: testPapers.map((t) => ({
        id: t.id,
        title: t.title,
        targetGrade: t.targetGrade,
        textType: t.textType,
        themeSummary: t.themeSummary,
        wordCount: t.wordCount,
        totalPoints: t.totalPoints,
        questionsCount: t.questions?.length || 0,
        createdAt: t.createdAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '無法取得開放試卷' }, { status: 500 });
  }
}
