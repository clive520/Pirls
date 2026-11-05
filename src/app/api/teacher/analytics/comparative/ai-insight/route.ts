import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import { ComparativeAnalysisData } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('pirls_token')?.value;
    if (!token) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session || (session.role !== 'teacher' && session.role !== 'admin')) {
      return NextResponse.json({ error: '無教師存取權限' }, { status: 403 });
    }

    const body = await req.json();
    const data: ComparativeAnalysisData = body.data;

    if (!data || !data.levels) {
      return NextResponse.json({ error: '缺少前後測分析數據' }, { status: 400 });
    }

    const {
      scope,
      className,
      studentName,
      preTest,
      postTest,
      scaleScoreDelta,
      levels,
      mostImprovedLevel,
      needsFocusLevel,
      pairedStudentsCount,
    } = data;

    const l1 = levels.level1;
    const l2 = levels.level2;
    const l3 = levels.level3;
    const l4 = levels.level4;

    const levelMap = {
      level1: '第一層：直接提取訊息',
      level2: '第二層：直接推論',
      level3: '第三層：詮釋整合觀點',
      level4: '第四層：檢驗與評估',
    };

    const bestLevelName = levelMap[mostImprovedLevel];
    const bestDelta = levels[mostImprovedLevel].deltaPercentage;
    const focusLevelName = levelMap[needsFocusLevel];
    const focusCurrentPct = levels[needsFocusLevel].postPercentage;

    // 1. 歷程成長亮點診斷
    const isPositiveScale = scaleScoreDelta >= 0;
    const targetEntity = scope === 'class' ? `${className} 全班` : `學生「${studentName}」`;

    const growthHighlight = `${targetEntity}在《${preTest.title}》（前測）至《${postTest.title}》（後測）的歷程推進中，PIRLS 國際量尺標準分由 ${preTest.scaleScore} 分 (${preTest.benchmarkName}) 成長至 ${postTest.scaleScore} 分 (${postTest.benchmarkName})，${
      isPositiveScale ? `大幅躍升 +${scaleScoreDelta} 分` : `微幅變動 ${scaleScoreDelta} 分`
    }。其中以【${bestLevelName}】表現最為亮眼，得分率躍升了 ${bestDelta >= 0 ? `+${bestDelta}%` : `${bestDelta}%`}，顯示閱讀思維的廣度與深度均有突破性成長！`;

    // 2. 核心瓶頸與思維弱項剖析
    let bottleneckAnalysis = '';
    if (needsFocusLevel === 'level4') {
      bottleneckAnalysis = `在【第四層：檢驗與評估】目前得分率為 ${focusCurrentPct}%。學生在面對需要「跳脫文本情境、反思作者寫作手法與修辭目的」或「批判論述合理性」的開放式問答時，容易僅停留於複述情節，較少展現獨立論證與多元觀點。`;
    } else if (needsFocusLevel === 'level3') {
      bottleneckAnalysis = `在【第三層：詮釋整合觀點】目前掌握度為 ${focusCurrentPct}%。學生跨段落整合長篇線索、推導角色心境轉變或歸納核心主旨的能力仍有進步空間，常見將次要細節誤判為主要宗旨的現象。`;
    } else if (needsFocusLevel === 'level2') {
      bottleneckAnalysis = `在【第二層：直接推論】目前得分率為 ${focusCurrentPct}%。對於文句間隱含的因果關係與代名詞指涉，仍偶有誤讀，需強化前後文語意連貫的推論敏銳度。`;
    } else {
      bottleneckAnalysis = `在【第一層：直接提取訊息】目前掌握度為 ${focusCurrentPct}%。需加強長文中快速定位關鍵字、時間、地點與事實數據的檢索策略，避免因閱讀速度或粗心遺漏關鍵事實。`;
    }

    // 3. 差異化下階段教學處方 (Pedagogical Action Plans)
    const actionPlans: Array<{ title: string; strategy: string }> = [
      {
        title: '鷹架式提問（QAR 閱讀策略深化）',
        strategy:
          '在課堂討論中系統化導入「作者與我 (Author and Me)」及「全憑我思 (On My Own)」兩大高階提問類型，引導學生從事實性問答轉向反思性評價。',
      },
      {
        title: '雙向因果思維地圖（Thinking Maps）',
        strategy:
          '運用多重流程圖或魚骨圖，引導學生將文本中人物的動機、行動與最終結果串聯對照，加深對「詮釋整合」與「直接推論」的結構化把握。',
      },
      {
        title: '評分規準學生自評（Rubric Co-construction）',
        strategy:
          '將 PIRLS 評分規準中「觀點明確、舉證充分、反思深化」之標準轉化為學生可理解的同儕互評檢核表，在寫作與問答練習中讓思考外顯化。',
      },
    ];

    if (scope === 'class') {
      actionPlans.push({
        title: '班級差異化分層分組任務',
        strategy: `本次配對分析之 ${pairedStudentsCount} 位學生中，針對 L3/L4 仍低於 60% 之學生提供同儕小導師伴讀，並於閱讀學習單中提供「句型引導鷹架（如：雖然作者認為...但我從現實中發現...）」。`,
      });
    }

    // 4. 下階段國際基準躍升目標
    let benchmarkTarget = '';
    if (postTest.scaleScore < 500) {
      benchmarkTarget = `當前目標定位於穩固跨越「中等基準（475 分）」，關鍵在於落實 L1 與 L2 的零失誤率，建立閱讀信心。`;
    } else if (postTest.scaleScore < 550) {
      benchmarkTarget = `當前具備穩健的中等基準，下一階段衝刺「高國際基準（550 分）」，核心突破口為攻克 L3 詮釋整合，提升跨段落統整題之滿分率。`;
    } else {
      benchmarkTarget = `已穩居「高基準（550 分以上）」甚至邁向「最高基準（625 分）」，下階段應持續深化 L4 批判思考與跨文本評析，培養具備國際視野的深度閱讀素養。`;
    }

    return NextResponse.json({
      success: true,
      insight: {
        growthHighlight,
        bottleneckAnalysis,
        actionPlans,
        benchmarkTarget,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('Comparative AI Insight error:', err);
    return NextResponse.json(
      { error: err.message || '生成教學診斷失敗' },
      { status: 500 }
    );
  }
}
