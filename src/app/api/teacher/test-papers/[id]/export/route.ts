import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import { getTestPaperById, getTestPaperSubmissions } from '@/lib/db';
import { calculatePIRLSScaleScore, getBenchmarkInfo } from '@/lib/pirls-norm';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.cookies.get('pirls_token')?.value;
    if (!token) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session || (session.role !== 'teacher' && session.role !== 'admin')) {
      return NextResponse.json({ error: '無存取權限' }, { status: 403 });
    }

    const testPaper = await getTestPaperById(params.id);
    if (!testPaper) {
      return NextResponse.json({ error: '找不到該試卷' }, { status: 404 });
    }

    const submissions = await getTestPaperSubmissions(params.id);

    // CSV 表頭定義
    const headers = [
      '班級',
      '座號',
      '學生姓名',
      '原始總得分',
      '試卷滿分',
      '得分率(%)',
      'PIRLS國際量尺分數',
      '國際基準落點',
      '班級同儕PR',
      '國際常模PR',
      'L1提取特定資訊得分',
      'L1提取掌握率(%)',
      'L2推論主要觀點得分',
      'L2推論掌握率(%)',
      'L3詮釋整合訊息得分',
      'L3詮釋整合掌握率(%)',
      'L4檢驗評估批判得分',
      'L4檢驗評估掌握率(%)',
      '繳卷時間',
    ];

    // CSV 內容列轉換
    const rows = submissions.map((s) => {
      const sc = s.scaleScore ?? calculatePIRLSScaleScore(s.totalScore, s.maxScore);
      const bench = getBenchmarkInfo(sc);

      const l1Earned = s.processScores?.level1?.earned ?? 0;
      const l1Total = s.processScores?.level1?.total ?? 0;
      const l1Pct = s.processScores?.level1?.percentage ?? 0;

      const l2Earned = s.processScores?.level2?.earned ?? 0;
      const l2Total = s.processScores?.level2?.total ?? 0;
      const l2Pct = s.processScores?.level2?.percentage ?? 0;

      const l3Earned = s.processScores?.level3?.earned ?? 0;
      const l3Total = s.processScores?.level3?.total ?? 0;
      const l3Pct = s.processScores?.level3?.percentage ?? 0;

      const l4Earned = s.processScores?.level4?.earned ?? 0;
      const l4Total = s.processScores?.level4?.total ?? 0;
      const l4Pct = s.processScores?.level4?.percentage ?? 0;

      return [
        `"${s.className || '未分班'}"`,
        s.seatNumber ?? '',
        `"${s.studentName}"`,
        s.totalScore,
        s.maxScore,
        s.percentage,
        sc,
        `"${bench.name}"`,
        s.classPR ?? 50,
        s.normPR ?? 50,
        `"${l1Earned}/${l1Total}"`,
        l1Pct,
        `"${l2Earned}/${l2Total}"`,
        l2Pct,
        `"${l3Earned}/${l3Total}"`,
        l3Pct,
        `"${l4Earned}/${l4Total}"`,
        l4Pct,
        `"${new Date(s.submittedAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}"`,
      ].join(',');
    });

    // 加上 UTF-8 BOM 避免 Excel 開啟時中文亂碼
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');

    const filename = encodeURIComponent(`PIRLS_${testPaper.title}_成績名冊.csv`);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${filename}`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '匯出失敗' }, { status: 500 });
  }
}
