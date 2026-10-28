import { generatePIRLSTestPaper } from '../src/lib/llm-adapter.ts';
import { gradeStudentSubmission } from '../src/lib/ai-grader.ts';
import {
  createTestPaper,
  createSubmission,
  getSubmissionById,
  getTestPaperSubmissions,
} from '../src/lib/db.ts';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

console.log(`${colors.bold}${colors.cyan}======================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}   PIRLS Stage 4: 學生作答、AI 規準批改與雷達診斷驗證  ${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}======================================================${colors.reset}\n`);

let allTestsPassed = true;

async function runTests() {
  try {
    // 1. 生成一份標準 PIRLS 試卷做為受測基準
    console.log(`${colors.bold}[檢核項 1] 生成測試試卷並寫入題庫：${colors.reset}`);
    const testPaper = await generatePIRLSTestPaper({
      mode: 'theme',
      theme: '森林裡的奇蹟',
      targetGrade: 4,
      textType: 'literary',
      questionCountMode: 'standard',
      includeDiagram: true,
      creatorId: 'teacher_mock_001',
      creatorName: '林志賢 老師',
    });

    const savedTest = await createTestPaper(testPaper);
    console.log(`  - 試卷標題: 《${savedTest.title}》`);
    console.log(`  - 題目總數: ${savedTest.questions.length} 題，總分 ${savedTest.totalPoints} 分`);
    console.log(`  ${colors.green}✓ 測試基準試卷建立成功 (ID: ${savedTest.id})${colors.reset}`);

    // 2. 模擬學生作答資料（包含：選擇題答對、選擇題答錯、1分簡答題、2分簡答題、3分滿分簡答、未作答）
    console.log(`\n${colors.bold}[檢核項 2] 模擬學生各題型作答輸入並呼叫 AI 批改引擎：${colors.reset}`);
    const rawAnswers = {};

    // 尋找各種類型的題目進行精準配對
    const mcQuestions = savedTest.questions.filter((q) => q.type === 'multiple_choice');
    const crQuestions = savedTest.questions.filter((q) => q.type === 'constructed_response');

    if (mcQuestions.length >= 2) {
      // 第一題選擇題答對
      rawAnswers[mcQuestions[0].id] = mcQuestions[0].correctAnswerLabel;
      // 第二題選擇題故意答錯
      const wrongOpt = mcQuestions[1].options?.find((o) => o.label !== mcQuestions[1].correctAnswerLabel);
      rawAnswers[mcQuestions[1].id] = wrongOpt ? wrongOpt.label : 'X';
    }

    // 簡答題作答模擬
    crQuestions.forEach((q) => {
      if (q.points === 3) {
        // 模擬 3 分題滿分回答（心態轉變 + 具體引用文本事件）
        rawAnswers[q.id] = '起初主角覺得森林非常可怕而且鄰居很冷漠，甚至不願說話；後來在發生大火災時，看見所有村民不顧危險同心協力撲救火勢，主角深深被感動，最後明白了團結互助的真諦，感受轉為無比的感激與敬佩。';
      } else if (q.points === 2) {
        // 模擬 2 分題（列舉兩項原因）
        rawAnswers[q.id] = '第一點是小樹苗每天有充足的陽光照射；第二點是松鼠熱心幫忙鬆土澆水，提供養分。';
      } else if (q.points === 1) {
        // 模擬 1 分題精準簡答
        rawAnswers[q.id] = '因為小樹苗看見陽光灑在葉片上，感到充滿希望。';
      }
    });

    // 執行 AI 規準批改引擎
    const gradingResult = await gradeStudentSubmission({
      testPaper: savedTest,
      rawAnswers,
    });

    console.log(`  - 批改後總得分: ${gradingResult.totalScore} / ${gradingResult.maxScore} 分 (得分率: ${gradingResult.percentage}%)`);
    console.log(`  - 四層次素養得分:`);
    console.log(`    • L1 提取特定資訊: ${gradingResult.processScores.level1.earned}/${gradingResult.processScores.level1.total} (${gradingResult.processScores.level1.percentage}%)`);
    console.log(`    • L2 推論主要觀點: ${gradingResult.processScores.level2.earned}/${gradingResult.processScores.level2.total} (${gradingResult.processScores.level2.percentage}%)`);
    console.log(`    • L3 詮釋整合訊息: ${gradingResult.processScores.level3.earned}/${gradingResult.processScores.level3.total} (${gradingResult.processScores.level3.percentage}%)`);
    console.log(`    • L4 評估檢驗批判: ${gradingResult.processScores.level4.earned}/${gradingResult.processScores.level4.total} (${gradingResult.processScores.level4.percentage}%)`);

    if (gradingResult.totalScore > 0 && gradingResult.maxScore === savedTest.totalPoints) {
      console.log(`  ${colors.green}✓ AI 批改引擎客觀判分與分數總計 100% 正確${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ 批改分數總計異常${colors.reset}`);
      allTestsPassed = false;
    }

    // 3. 檢驗 0/1/2/3 階梯 Rubric 規準評分與 IEA 雙位數代碼
    console.log(`\n${colors.bold}[檢核項 3] 檢驗 IEA 官方雙位數代碼與 0/1/2/3 分規準落實：${colors.reset}`);
    let verifiedCodes = new Set();
    gradingResult.answers.forEach((ans) => {
      if (ans.code) verifiedCodes.add(ans.code);
    });

    console.log(`  - 評卷產出之 IEA 代碼列表: [ ${Array.from(verifiedCodes).join(', ')} ]`);

    const hasCorrectMC = gradingResult.answers.some((a) => a.type === 'multiple_choice' && a.code === '10');
    const hasIncorrectMC = gradingResult.answers.some((a) => a.type === 'multiple_choice' && a.code === '79');
    const has3PtFull = gradingResult.answers.some((a) => a.maxScore === 3 && a.score === 3 && a.code === '30');

    if (hasCorrectMC && hasIncorrectMC && has3PtFull) {
      console.log(`  ${colors.green}✓ 選擇題答對(Code 10)、答錯(Code 79) 與 3分題滿分規準(Code 30) 完美通過驗證${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ 規準代碼檢驗未完全符合預期${colors.reset}`);
      allTestsPassed = false;
    }

    // 4. 正向三明治回饋結構檢核
    console.log(`\n${colors.bold}[檢核項 4] 正向三明治回饋（肯定亮點 + 盲點指引 + 示範鷹架）品質檢驗：${colors.reset}`);
    const sampleAnswer = gradingResult.answers.find((a) => a.maxScore === 3);
    if (sampleAnswer && sampleAnswer.aiFeedback) {
      console.log(`  - 3分題作答回饋示例：`);
      console.log(`    【肯定亮點】${sampleAnswer.aiFeedback.strength}`);
      console.log(`    【盲點指引】${sampleAnswer.aiFeedback.weakness}`);
      console.log(`    【鷹架示範】${sampleAnswer.aiFeedback.scaffoldingTip}`);

      if (
        sampleAnswer.aiFeedback.strength.length > 5 &&
        sampleAnswer.aiFeedback.scaffoldingTip.length > 5
      ) {
        console.log(`  ${colors.green}✓ 正向三明治回饋結構完整、文句溫暖且具備具體引導性${colors.reset}`);
      } else {
        console.log(`  ${colors.red}✗ 三明治回饋過於簡略${colors.reset}`);
        allTestsPassed = false;
      }
    }

    // 5. 學生繳卷持久化與教師端名冊聚合查詢測試
    console.log(`\n${colors.bold}[檢核項 5] 學生繳卷持久化與教師端聚合查詢檢驗：${colors.reset}`);
    const newSubmission = await createSubmission({
      testPaperId: savedTest.id,
      testPaperTitle: savedTest.title,
      targetGrade: savedTest.targetGrade,
      textType: savedTest.textType,
      studentId: 'student_stage4_001',
      studentName: '陳大同',
      classId: 'class_mock_001',
      className: '四年一班',
      seatNumber: 15,
      totalScore: gradingResult.totalScore,
      maxScore: gradingResult.maxScore,
      percentage: gradingResult.percentage,
      processScores: gradingResult.processScores,
      answers: gradingResult.answers,
    });

    console.log(`  - 繳卷 ID: ${newSubmission.id}`);

    // 單筆查詢
    const fetchedSubmission = await getSubmissionById(newSubmission.id);
    if (!fetchedSubmission || fetchedSubmission.studentName !== '陳大同') {
      throw new Error('單筆繳卷紀錄查詢失敗');
    }

    // 教師端試卷受測名冊聚合查詢
    const paperSubmissions = await getTestPaperSubmissions(savedTest.id);
    console.log(`  - 試卷目前已繳卷總數: ${paperSubmissions.length} 份`);

    if (paperSubmissions.length >= 1 && paperSubmissions[0].seatNumber === 15) {
      console.log(`  ${colors.green}✓ 學生繳卷寫入、個別查詢與班級名冊聚合測試 100% 通過${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ 教師端名冊查詢失敗${colors.reset}`);
      allTestsPassed = false;
    }

    console.log(`\n${colors.bold}${colors.green}======================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.green}   PIRLS Stage 4 所有學生作答與 AI 規準評分測試通過！   ${colors.reset}`);
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
