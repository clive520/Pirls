import { TestPaper, TestQuestion, CognitiveProcess, ArticleIllustration } from '@/lib/types';
import { GenerateParams } from './types';
import { generateSmartImagePrompts } from './image-prompts';
import { generateSmartFallbackQuestions } from './fallback-generator';

/**
 * 將 AI 回傳或修復後的 JSON 物件格式化為標準 TestPaper 物件
 * 包含段落防呆、認知歷程正規化、插圖綁定與出題保底自癒機制
 */
export function formatToTestPaper(parsed: any, params: GenerateParams): TestPaper {
  const now = new Date().toISOString();
  const isPasteMode = params.mode === 'paste';

  // 1. 段落與文章防呆處理
  const rawArticleContent = (isPasteMode && params.pastedText)
    ? params.pastedText
    : (parsed.articleContent || parsed.content || parsed.article || params.pastedText || '');

  const rawParagraphs = parsed.paragraphs || [];
  let paragraphs: { paragraphNumber: number; text: string }[] = [];

  if (Array.isArray(rawParagraphs) && rawParagraphs.length > 0) {
    if (typeof rawParagraphs[0] === 'string') {
      paragraphs = rawParagraphs.map((text: string, idx: number) => ({
        paragraphNumber: idx + 1,
        text,
      }));
    } else {
      paragraphs = rawParagraphs.map((p: any, idx: number) => ({
        paragraphNumber: p.paragraphNumber || idx + 1,
        text: p.text || p.content || '',
      }));
    }
  }

  // 若段落為空（自選文章模式未輸出 paragraphs 或模型漏傳），自動從 rawArticleContent 進行段落切分
  if (paragraphs.length === 0 && rawArticleContent) {
    const splitParas = rawArticleContent.includes('\n\n')
      ? rawArticleContent.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0)
      : rawArticleContent.split(/\n+/).filter((p: string) => p.trim().length > 0);

    paragraphs = splitParas.map((text: string, idx: number) => {
      const cleanText = text.trim();
      const hasPrefix = cleanText.startsWith('【第') || cleanText.startsWith('第') || cleanText.match(/^[0-9一二三四五六七八九十]+[、.]/);
      return {
        paragraphNumber: idx + 1,
        text: hasPrefix ? cleanText : `【第${idx + 1}段】${cleanText}`,
      };
    });
  }

  const articleContent = rawArticleContent || paragraphs.map((p) => p.text).join('\n\n');

  // 2. 題目防呆、多鍵名相容與認知歷程正規化
  let rawQuestions =
    parsed.questions ||
    parsed.testQuestions ||
    parsed.items ||
    parsed.questionList ||
    parsed.questionsList ||
    parsed.problems ||
    parsed.quiz ||
    parsed.examQuestions ||
    parsed.test_questions ||
    parsed.testPaper?.questions ||
    parsed.testPaper?.items ||
    parsed.data?.questions ||
    parsed.exam?.questions;

  if (!Array.isArray(rawQuestions) && rawQuestions && typeof rawQuestions === 'object') {
    rawQuestions = Object.values(rawQuestions);
  }
  if (!Array.isArray(rawQuestions) && Array.isArray(parsed)) {
    rawQuestions = parsed;
  }
  if (!Array.isArray(rawQuestions)) {
    rawQuestions = [];
  }

  // 核心自癒保底：若模型回傳的題目為空 (如長文耗盡輸出 Token、超長文章截斷或格式異常)，
  // 自動依課文段落脈絡與年級深度，即時生成符合 PIRLS 四層次規範之高水準試題，絕不開天窗！
  const targetCount = params.questionCountMode === 'compact' ? 8 : 12;
  if (rawQuestions.length === 0) {
    console.warn(`[PIRLS LLM] 偵測到模型回傳題目為空 (Mode: ${params.mode}, Grade: ${params.targetGrade})，立即啟動智慧 PIRLS 四層次自癒命題引擎！`);
    rawQuestions = generateSmartFallbackQuestions(
      parsed.title || params.pastedTitle || params.theme || '自選課文',
      paragraphs,
      params.targetGrade || 6,
      params.textType || 'literary',
      targetCount
    );
  }

  const questions: TestQuestion[] = rawQuestions.map((q: any, i: number) => {
    let processLevel: CognitiveProcess = 'retrieve';
    let processLevelNumber = 1;
    const pl = String(q.processLevel || '').toLowerCase();
    const pln = Number(q.processLevelNumber);

    if (pln === 2 || pl.includes('infer')) {
      processLevel = 'inference';
      processLevelNumber = 2;
    } else if (pln === 3 || pl.includes('interpret') || pl.includes('integrate')) {
      processLevel = 'interpret';
      processLevelNumber = 3;
    } else if (pln === 4 || pl.includes('evaluate')) {
      processLevel = 'evaluate';
      processLevelNumber = 4;
    } else {
      processLevel = 'retrieve';
      processLevelNumber = 1;
    }

    const isMC = q.type === 'multiple_choice' || (!q.type && Array.isArray(q.options) && q.options.length > 0);

    return {
      id: `q_${Date.now()}_${i + 1}`,
      questionNumber: q.questionNumber || i + 1,
      processLevel,
      processLevelNumber,
      type: isMC ? 'multiple_choice' : 'constructed_response',
      subtype: isMC ? 'single_choice' : 'single_cr',
      prompt: q.prompt || q.question || `第 ${i + 1} 題`,
      points: Number(q.points) || (isMC ? 1 : 2),
      options: isMC
        ? (q.options || []).map((opt: any, optIdx: number) => ({
            label: opt.label || String.fromCharCode(65 + optIdx),
            text: opt.text || opt.content || String(opt),
            isCorrect: Boolean(opt.isCorrect || opt.correct || opt.label === q.correctAnswerLabel),
            explanation: opt.explanation || '',
          }))
        : undefined,
      correctAnswerLabel: isMC
        ? q.correctAnswerLabel || (q.options?.find((o: any) => o.isCorrect)?.label) || 'A'
        : undefined,
      rubric: !isMC
        ? {
            maxScore: Number(q.points) || 2,
            criteria: q.rubric?.criteria || [
              {
                score: Number(q.points) || 2,
                code: '20',
                description: q.rubric?.fullScoreCriteria || '能完整且精確回答問題核心要點。',
                keyEvidenceNeeded: [],
              },
              {
                score: 0,
                code: '79',
                description: q.rubric?.noScoreCriteria || '回答錯誤、未作答或與題意完全無關。',
                keyEvidenceNeeded: [],
              },
            ],
            sampleFullCreditAnswer: q.rubric?.sampleFullCreditAnswer || q.sampleAnswer || '參見給分規準說明。',
          }
        : undefined,
    };
  });

  // 3. 插圖防呆與 AI 繪圖提示詞 (預設提供 3 幅關鍵場景，穿插於文章合適段落之後)
  const shouldIncludeDiagram = params.includeDiagram !== false;
  const rawIllustrations = parsed.illustrations || [];
  let illustrations: ArticleIllustration[] = [];

  if (Array.isArray(rawIllustrations) && rawIllustrations.length > 0) {
    const list: ArticleIllustration[] = [];
    const totalParas = Math.max(1, paragraphs.length);
    for (let idx = 0; idx < rawIllustrations.length; idx++) {
      const ill = rawIllustrations[idx];
      const imagePrompt = ill?.imagePrompt || parsed.imagePrompt || '';
      const fallbackPara = idx === 0 ? 1 : idx === 1 ? Math.max(2, Math.round(totalParas / 2)) : totalParas;
      const parsedPara = Number(ill?.paragraphNumber);
      const validatedPara = (!isNaN(parsedPara) && parsedPara >= 1 && parsedPara <= totalParas)
        ? parsedPara
        : fallbackPara;
      const caption = ill?.caption || `圖 ${idx + 1}：${parsed.title || '文章'}情境插圖`;
      list.push({
        id: ill?.id || `ill_${Date.now()}_${idx + 1}`,
        paragraphNumber: validatedPara,
        caption,
        type: ill?.imageUrl ? 'illustration_url' : (ill?.type || 'illustration_url'),
        imageUrl: ill?.imageUrl || '',
        svgCode: ill?.svgCode || '',
        imagePrompt,
      });
    }
    illustrations = list;
  }

  // 若使用者勾選了配圖需求，但模型回傳不足 3 幅或無提示詞，自動為課文生成 3 幅標準關鍵場景提示詞
  if (shouldIncludeDiagram && (illustrations.length === 0 || !illustrations.some(i => i.imagePrompt))) {
    const isLit = params.textType === 'literary';
    illustrations = generateSmartImagePrompts(
      parsed.title || params.theme || params.pastedTitle || '國小閱讀課文',
      parsed.themeSummary || '溫馨啟發與情境教育',
      isLit,
      params.targetGrade || 4,
      paragraphs.length
    );
  }

  return {
    id: 'test_' + Date.now(),
    title: parsed.title || parsed.article_title || 'PIRLS 閱讀測驗',
    targetGrade: params.targetGrade,
    textType: params.textType,
    themeSummary: parsed.themeSummary || parsed.summary || '閱讀素養評量',
    wordCount: Number(parsed.wordCount) || articleContent.length || 950,
    articleContent,
    paragraphs,
    illustrations,
    questions,
    totalPoints: questions.reduce((sum, q) => sum + (q.points || 1), 0),
    creatorId: params.creatorId,
    creatorName: params.creatorName,
    isPublic: false,
    timeLimitMinutes: params.questionCountMode === 'standard' ? 40 : 20,
    createdAt: now,
    updatedAt: now,
  };
}
