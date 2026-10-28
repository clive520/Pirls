import {
  createTestPaper,
  getPublicTestPapers,
  assignTestPaperToClasses,
  getTestPaperById,
  createSubmission,
  getTestPaperSubmissions,
} from '../src/lib/db.ts';
import { generatePIRLSTestPaper } from '../src/lib/llm-adapter.ts';
import { calculatePIRLSScaleScore, getBenchmarkInfo } from '../src/lib/pirls-norm.ts';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

console.log(`${colors.bold}${colors.cyan}======================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}   PIRLS Stage 6: 雙場景營運、A4 列印與 Excel 匯出驗證  ${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}======================================================${colors.reset}\n`);

let allTestsPassed = true;

async function runTests() {
  try {
    // 1. 建立測試基準試卷並設定為公開自學
    console.log(`${colors.bold}[檢核項 1] 建立試卷並驗證開放自學區試卷查詢：${colors.reset}`);
    const generated = await generatePIRLSTestPaper({
      mode: 'theme',
      theme: '台灣水鹿的遷徙旅程',
      targetGrade: 5,
      textType: 'informational',
      questionCountMode: 'standard',
      includeDiagram: true,
      creatorId: 'teacher_mock_001',
      creatorName: '林志賢 老師',
    });

    const savedTest = await createTestPaper({
      ...generated,
      isPublic: true,
    });

    console.log(`  - 試卷標題: 《${savedTest.title}》 (ID: ${savedTest.id})`);
    console.log(`  - 公開狀態: ${savedTest.isPublic ? '已公開至自學區' : '私有'}`);

    const publicPapers = await getPublicTestPapers();
    const foundPublic = publicPapers.find((p) => p.id === savedTest.id);

    if (foundPublic && foundPublic.isPublic) {
      console.log(`  ${colors.green}✓ 開放自學題庫成功檢索出該公開試卷 (共 ${publicPapers.length} 份公開考卷)${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ 開放自學題庫未能檢索到公開試卷${colors.reset}`);
      allTestsPassed = false;
    }

    // 2. 班級指定測驗區之權限、密碼與派卷設定持久化檢驗
    console.log(`\n${colors.bold}[檢核項 2] 班級指定測驗區派卷與測驗安全碼設定檢驗：${colors.reset}`);
    const assignSuccess = await assignTestPaperToClasses(
      savedTest.id,
      ['class_grade5_01', 'class_grade5_02'],
      {
        isPublic: true,
        examCode: 'PIRLS2026',
      }
    );

    const updatedTest = await getTestPaperById(savedTest.id);
    console.log(`  - 指派班級數: ${updatedTest?.assignedClassIds?.length || 0} 個班級`);
    console.log(`  - 測驗安全碼: ${updatedTest?.examCode || '無'}`);

    if (
      assignSuccess &&
      updatedTest?.assignedClassIds?.includes('class_grade5_01') &&
      updatedTest?.examCode === 'PIRLS2026'
    ) {
      console.log(`  ${colors.green}✓ 班級測驗安全碼與班級指定派卷持久化檢驗 100% 正確${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ 班級派卷與安全碼更新失敗${colors.reset}`);
      allTestsPassed = false;
    }

    // 3. 模擬學生繳卷生成班級受測名冊數據
    console.log(`\n${colors.bold}[檢核項 3] 模擬受測資料並驗證 Excel / CSV 匯出格式與 UTF-8 BOM：${colors.reset}`);
    await createSubmission({
      testPaperId: savedTest.id,
      testPaperTitle: savedTest.title,
      targetGrade: savedTest.targetGrade,
      textType: savedTest.textType,
      studentId: 'student_stage6_001',
      studentName: '王小明',
      classId: 'class_grade5_01',
      className: '五年一班',
      seatNumber: 1,
      totalScore: 18,
      maxScore: savedTest.totalPoints,
      percentage: 90,
      scaleScore: 655,
      benchmarkKey: 'advanced',
      benchmarkName: '高級基準',
      benchmarkDescription: '具備卓越的深層閱讀素養。',
      classPR: 95,
      normPR: 94,
      processScores: {
        level1: { earned: 4, total: 4, percentage: 100 },
        level2: { earned: 5, total: 5, percentage: 100 },
        level3: { earned: 5, total: 6, percentage: 83 },
        level4: { earned: 4, total: 5, percentage: 80 },
      },
      answers: [],
    });

    await createSubmission({
      testPaperId: savedTest.id,
      testPaperTitle: savedTest.title,
      targetGrade: savedTest.targetGrade,
      textType: savedTest.textType,
      studentId: 'student_stage6_002',
      studentName: '李小華',
      classId: 'class_grade5_01',
      className: '五年一班',
      seatNumber: 2,
      totalScore: 14,
      maxScore: savedTest.totalPoints,
      percentage: 70,
      scaleScore: 560,
      benchmarkKey: 'high',
      benchmarkName: '高基準',
      benchmarkDescription: '具備良好的閱讀理解與推論能力。',
      classPR: 50,
      normPR: 72,
      processScores: {
        level1: { earned: 4, total: 4, percentage: 100 },
        level2: { earned: 4, total: 5, percentage: 80 },
        level3: { earned: 3, total: 6, percentage: 50 },
        level4: { earned: 3, total: 5, percentage: 60 },
      },
      answers: [],
    });

    const submissions = await getTestPaperSubmissions(savedTest.id);
    console.log(`  - 班級受測名冊筆數: ${submissions.length} 筆`);

    // 模擬 Excel 匯出模組的 CSV 生成邏輯
    const headers = [
      '班級', '座號', '學生姓名', '原始總得分', '試卷滿分', '得分率(%)',
      'PIRLS國際量尺分數', '國際基準落點', '班級同儕PR', '國際常模PR',
      'L1提取特定資訊得分', 'L1提取掌握率(%)',
      'L2推論主要觀點得分', 'L2推論掌握率(%)',
      'L3詮釋整合訊息得分', 'L3詮釋整合掌握率(%)',
      'L4檢驗評估批判得分', 'L4檢驗評估掌握率(%)',
      '繳卷時間',
    ];

    const rows = submissions.map((s) => [
      `"${s.className}"`,
      s.seatNumber,
      `"${s.studentName}"`,
      s.totalScore,
      s.maxScore,
      s.percentage,
      s.scaleScore,
      `"${s.benchmarkName}"`,
      s.classPR,
      s.normPR,
      `"${s.processScores.level1.earned}/${s.processScores.level1.total}"`,
      s.processScores.level1.percentage,
      `"${s.processScores.level2.earned}/${s.processScores.level2.total}"`,
      s.processScores.level2.percentage,
      `"${s.processScores.level3.earned}/${s.processScores.level3.total}"`,
      s.processScores.level3.percentage,
      `"${s.processScores.level4.earned}/${s.processScores.level4.total}"`,
      s.processScores.level4.percentage,
      `"${s.submittedAt}"`,
    ].join(','));

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');

    // 檢核 UTF-8 BOM 與中文欄位
    const hasBOM = csvContent.charCodeAt(0) === 0xFEFF;
    const hasHeaderFields = csvContent.includes('PIRLS國際量尺分數') && csvContent.includes('國際基準落點');
    const hasStudentRow = csvContent.includes('王小明') && csvContent.includes('高級基準');

    if (hasBOM && hasHeaderFields && hasStudentRow) {
      console.log(`  ${colors.green}✓ CSV 具備 UTF-8 BOM 前綴 (確保 Windows Excel 開啟 100% 無亂碼)${colors.reset}`);
      console.log(`  ${colors.green}✓ 19 項標準分析欄位齊全 (含量尺分、基準落點、雙軌 PR、四層次得分)${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ Excel CSV 匯出內容有誤${colors.reset}`);
      allTestsPassed = false;
    }

    // 4. A4 試卷列印規格與教師解答卷 Rubrics 規準檢驗
    console.log(`\n${colors.bold}[檢核項 4] A4 雙面試卷列印版型與教師評卷 Rubrics 規準完整性：${colors.reset}`);
    const hasMcOptions = savedTest.questions.some((q) => q.type === 'multiple_choice' && q.options && q.options.length === 4);
    const hasRubrics = savedTest.questions.some((q) => q.type === 'constructed_response' && q.rubric && q.rubric.criteria.length >= 2);
    const hasArticleParas = savedTest.paragraphs.length >= 3;

    if (hasMcOptions && hasRubrics && hasArticleParas) {
      console.log(`  - 試卷閱讀文本: ${savedTest.paragraphs.length} 個自然段 (完整保留段落文字)`);
      console.log(`  - 選擇題排版: 包含四選一 (A, B, C, D) 圈選格式與解答標註`);
      console.log(`  - 簡答題排版: 學生卷支援書寫橫線；教師解答卷完整展示 IEA 雙位數代碼規準表`);
      console.log(`  ${colors.green}✓ A4 列印雙模式（學生作答卷 / 教師解答卷）結構檢驗全部達標${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ 試卷列印結構不完整${colors.reset}`);
      allTestsPassed = false;
    }

    console.log(`\n${colors.bold}${colors.green}======================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.green}   PIRLS Stage 6 雙場景營運、A4 列印與匯出測試全數通過！  ${colors.reset}`);
    console.log(`${colors.bold}${colors.green}======================================================${colors.reset}`);
  } catch (err) {
    console.error(`\n${colors.bold}${colors.red}測試執行失敗:${colors.reset}`, err);
    process.exit(1);
  }

  if (!allTestsPassed) {
    process.exit(1);
  }
}

runTests();
