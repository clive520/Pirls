import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import { generateQuestionRubric } from '@/lib/ai/rubric-generator';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 支援長效 AI 思考與階梯規準生成

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('pirls_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: '請先登入系統' }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session || (session.role !== 'teacher' && session.role !== 'admin')) {
      return NextResponse.json({ success: false, error: '無出題與編輯權限' }, { status: 403 });
    }

    const body = await req.json();
    const {
      articleTitle,
      articleContent,
      prompt,
      processLevel,
      processLevelNumber,
      targetGrade,
      newPoints,
      currentRubric,
      provider,
      apiKey,
      customBaseUrl,
      preferredModel,
    } = body;

    if (!prompt) {
      return NextResponse.json({ success: false, error: '缺少題幹內容' }, { status: 400 });
    }

    const points = parseInt(String(newPoints), 10);
    if (isNaN(points) || points < 1 || points > 10) {
      return NextResponse.json({ success: false, error: '無效的配分數值' }, { status: 400 });
    }

    let finalProvider = provider || 'gemini';
    const trimmedKey = (apiKey || '').trim();

    // 智慧防呆：根據金鑰前綴自動辨識提供商
    if (trimmedKey.startsWith('sk-ant-') && finalProvider !== 'claude') {
      finalProvider = 'claude';
    } else if (trimmedKey.startsWith('gsk_') && finalProvider !== 'groq') {
      finalProvider = 'groq';
    } else if (trimmedKey.startsWith('sk-or-v1-') && finalProvider !== 'openrouter') {
      finalProvider = 'openrouter';
    } else if (trimmedKey.startsWith('AIzaSy') && finalProvider !== 'gemini') {
      finalProvider = 'gemini';
    }

    const rubric = await generateQuestionRubric({
      articleTitle: articleTitle || '未命名文章',
      articleContent: articleContent || '',
      prompt,
      processLevel: processLevel || '檢驗評估',
      processLevelNumber: Number(processLevelNumber) || 4,
      targetGrade: targetGrade ? parseInt(String(targetGrade), 10) : 4,
      newPoints: points,
      currentRubric,
      provider: finalProvider,
      apiKey: trimmedKey || undefined,
      customBaseUrl: customBaseUrl?.trim() || undefined,
      preferredModel: preferredModel?.trim() || undefined,
    });

    return NextResponse.json({
      success: true,
      rubric,
    });
  } catch (error: any) {
    console.error('[API regenerate-rubric] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '生成評分規準失敗' },
      { status: 500 }
    );
  }
}
