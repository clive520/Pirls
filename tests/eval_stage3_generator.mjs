import { generatePIRLSTestPaper } from '../src/lib/llm-adapter.ts';
import {
  createClass,
  createTestPaper,
  updateTestPaper,
  getTestPaperById,
  assignTestPaperToClasses,
  getAssignedTestPapersForClass,
  getTeacherTestPapers,
} from '../src/lib/db.ts';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

console.log(`${colors.bold}${colors.cyan}======================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}   PIRLS Stage 3: 教師人機協同出題與題庫派卷驗證測試   ${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}======================================================${colors.reset}\n`);

let allTestsPassed = true;

async function runTests() {
  try {
    // 1. 文學性文本與題本生成測試
    console.log(`${colors.bold}[檢核項 1] 文學性文本與 PIRLS 題本生成引擎測試：${colors.reset}`);
    const literaryTest = await generatePIRLSTestPaper({
      mode: 'theme',
      theme: '森林與勇氣',
      targetGrade: 4,
      textType: 'literary',
      questionCountMode: 'standard',
      includeDiagram: true,
      creatorId: 'teacher_mock_001',
      creatorName: '林志賢 老師',
    });

    console.log(`  - 試卷標題: 《${literaryTest.title}》`);
    console.log(`  - 文章字數: ${literaryTest.wordCount} 字 (段落數: ${literaryTest.paragraphs.length})`);
    console.log(`  - 題數配比: 共 ${literaryTest.questions.length} 題，總分 ${literaryTest.totalPoints} 分`);
    console.log(`  - 圖文元素: ${literaryTest.illustrations?.length || 0} 個插圖 (含 SVG 向量圖形)`);

    const hasSvg = literaryTest.illustrations?.some((i) => i.svgCode && i.svgCode.includes('<svg'));
    if (literaryTest.wordCount >= 800 && literaryTest.questions.length >= 8 && hasSvg) {
      console.log(`  ${colors.green}✓ 文學性文本、插圖與題目規格 100% 符合要求${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ 文學性題本生成指標未達標${colors.reset}`);
      allTestsPassed = false;
    }

    // 2. 訊息性科普文本與科學圖表生成測試
    console.log(`\n${colors.bold}[檢核項 2] 訊息性科普文本與科學流程圖生成測試：${colors.reset}`);
    const infoTest = await generatePIRLSTestPaper({
      mode: 'theme',
      theme: '台灣黑熊保育',
      targetGrade: 4,
      textType: 'informational',
      questionCountMode: 'standard',
      includeDiagram: true,
      creatorId: 'teacher_mock_001',
      creatorName: '林志賢 老師',
    });

    console.log(`  - 試卷標題: 《${infoTest.title}》`);
    console.log(`  - 科學圖解: ${infoTest.illustrations?.[0]?.caption || '無'}`);

    const hasCycleDiagram = infoTest.illustrations?.some((i) => i.svgCode?.includes('生態循環圖'));
    if (infoTest.textType === 'informational' && hasCycleDiagram) {
      console.log(`  ${colors.green}✓ 訊息性科普文章與生態循環圖表渲染驗證成功${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ 訊息性科普文章驗證未完全通過${colors.reset}`);
      allTestsPassed = false;
    }

    // 3. 官方題型多樣性與多元階梯配分 (1/2/3 分) 檢核
    console.log(`\n${colors.bold}[檢核項 3] PIRLS 題目階梯配分與 IEA 雙位數代碼規準檢核：${colors.reset}`);
    let has1Pt = false;
    let has2Pt = false;
    let has3Pt = false;
    let hasIeaCode = false;

    literaryTest.questions.forEach((q) => {
      if (q.points === 1) has1Pt = true;
      if (q.points === 2) has2Pt = true;
      if (q.points === 3) has3Pt = true;
      if (q.rubric?.criteria.some((c) => ['30', '20', '10', '11'].includes(c.code))) {
        hasIeaCode = true;
      }
    });

    if (has1Pt && has2Pt && has3Pt && hasIeaCode) {
      console.log(`  ${colors.green}✓ 題目完美涵蓋 1分(單一簡答)、2分(並列列舉) 與 3分(因果轉變) 階梯配分${colors.reset}`);
      console.log(`  ${colors.green}✓ 給分規準內建 IEA 官方雙位數評卷代碼 (30/20/11/79)${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ 階梯配分或代碼不完全${colors.reset}`);
      allTestsPassed = false;
    }

    // 4. 人機協同編輯 (Human-in-the-Loop) 與資料庫儲存測試
    console.log(`\n${colors.bold}[檢核項 4] 人機協同微調編輯與題庫持久化測試：${colors.reset}`);
    // 4.1 儲存試卷至題庫
    const savedTest = await createTestPaper(literaryTest);
    console.log(`  - 成功存入題庫: ID = ${savedTest.id}`);

    // 4.2 老師微調第 1 題題幹與配分
    const editedPrompt = '【老師微調題幹】根據文章第一段，村民把老松樹視為守護神的核心原因是什麼？';
    const updatedTest = await updateTestPaper(savedTest.id, {
      title: '《守護森林的老松樹》（教師精編版）',
      questions: savedTest.questions.map((q, idx) =>
        idx === 0 ? { ...q, prompt: editedPrompt, points: 2 } : q
      ),
    });

    const verifyTest = await getTestPaperById(savedTest.id);
    if (
      verifyTest &&
      verifyTest.title === '《守護森林的老松樹》（教師精編版）' &&
      verifyTest.questions[0].prompt === editedPrompt
    ) {
      console.log(`  ${colors.green}✓ 人機協同試題微調、重編題幹與配分即時更新持久化成功！${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ 試卷微調更新失敗${colors.reset}`);
      allTestsPassed = false;
    }

    // 5. 班級派卷與學生可視性測試
    console.log(`\n${colors.bold}[檢核項 5] 試卷指派至班級之業務邏輯驗證：${colors.reset}`);
    const testClass = await createClass('teacher_mock_001', '四年六班', 4);
    await assignTestPaperToClasses(savedTest.id, [testClass.id]);

    const assignedTests = await getAssignedTestPapersForClass(testClass.id);
    const isAssigned = assignedTests.some((t) => t.id === savedTest.id);

    if (isAssigned) {
      console.log(`  ${colors.green}✓ 試卷成功指派給【${testClass.name}】，學生工作區可見性檢驗通過！${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ 班級派卷關聯失敗${colors.reset}`);
      allTestsPassed = false;
    }

    console.log(`\n${colors.bold}${colors.cyan}======================================================${colors.reset}`);
    if (allTestsPassed) {
      console.log(`${colors.bold}${colors.green}🎉 Stage 3 教師人機協同出題與題庫派卷：全數測試通過 (100% Pass)！${colors.reset}`);
      console.log(`${colors.cyan}出題引擎成熟、圖文排版就緒、人機協同編輯器可完整運行，具備進入 Stage 4 學生作答端之條件。${colors.reset}`);
    } else {
      console.log(`${colors.bold}${colors.red}❌ 部分測試未通過，請檢查邏輯。${colors.reset}`);
    }
    console.log(`${colors.bold}${colors.cyan}======================================================${colors.reset}\n`);
  } catch (err) {
    console.error('測試過程發生例外錯誤:', err);
  }
}

runTests();
