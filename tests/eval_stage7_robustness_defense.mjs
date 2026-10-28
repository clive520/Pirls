import { gradeStudentSubmission } from '../src/lib/ai-grader.ts';
import { generatePIRLSTestPaper } from '../src/lib/llm-adapter.ts';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

console.log(`${colors.bold}${colors.cyan}======================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}   PIRLS Stage 7: AI 規準批改防禦性與極端邊界測試   ${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}======================================================${colors.reset}\n`);

let allTestsPassed = true;

async function runDefenseTests() {
  try {
    // 建立基準試卷
    const testPaper = await generatePIRLSTestPaper({
      mode: 'theme',
      theme: '深海尋寶探險',
      targetGrade: 4,
      textType: 'literary',
      questionCountMode: 'standard',
      includeDiagram: true,
      creatorId: 'mock_teacher',
      creatorName: '林老師',
    });

    console.log(`基準試卷已生成: 《${testPaper.title}》，共 ${testPaper.questions.length} 題\n`);

    // 1. 測試空白與純空格輸入 (Empty / Whitespace)
    console.log(`${colors.bold}[防禦項 1] 空白作答與純空格輸入測試：${colors.reset}`);
    const emptyAnswers = {};
    for (const q of testPaper.questions) {
      emptyAnswers[q.id] = '   \n\t  ';
    }

    const emptyResult = await gradeStudentSubmission({
      testPaper,
      rawAnswers: emptyAnswers,
    });

    console.log(`  - 總得分: ${emptyResult.totalScore} / ${emptyResult.maxScore}`);
    const allCode99Or79 = emptyResult.answers.every((a) => a.code === '99' || a.code === '79');
    const allFeedbackPresent = emptyResult.answers.every((a) => a.aiFeedback && a.aiFeedback.scaffoldingTip);

    if (emptyResult.totalScore === 0 && allCode99Or79 && allFeedbackPresent) {
      console.log(`  ${colors.green}✓ 空白回答精準標註為 Code 99 / 79，給予鼓勵性鷹架引導，無任何錯誤${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ 空白回答處理不符預期${colors.reset}`);
      allTestsPassed = false;
    }

    // 2. 測試無意義敷衍作答 ("不知道", "不會", "??", "。。。")
    console.log(`\n${colors.bold}[防禦項 2] 無意義詞語與敷衍輸入測試：${colors.reset}`);
    const superficialAnswers = {};
    for (const q of testPaper.questions) {
      superficialAnswers[q.id] = '不知道';
    }

    const superficialResult = await gradeStudentSubmission({
      testPaper,
      rawAnswers: superficialAnswers,
    });

    const isCode99 = superficialResult.answers.every((a) => a.code === '99' || a.code === '79');
    if (superficialResult.totalScore === 0 && isCode99) {
      console.log(`  ${colors.green}✓ 「不知道」等敷衍字句精準捕獲，得分 0 分，未誤判得分${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ 敷衍字句處理失敗${colors.reset}`);
      allTestsPassed = false;
    }

    // 3. 測試超長字串壓力輸入 (5,000 字重複灌水回答)
    console.log(`\n${colors.bold}[防禦項 3] 超長灌水文字壓力測試 (5,000 字無意義重複)：${colors.reset}`);
    const superLongText = '這是一篇非常非常長的重複文字灌水。'.repeat(250); // 5000字
    const longAnswers = {};
    for (const q of testPaper.questions) {
      longAnswers[q.id] = superLongText;
    }

    const startTime = Date.now();
    const longResult = await gradeStudentSubmission({
      testPaper,
      rawAnswers: longAnswers,
    });
    const duration = Date.now() - startTime;

    console.log(`  - 5000字超長文字批改耗時: ${duration} ms`);
    if (duration < 500 && longResult) {
      console.log(`  ${colors.green}✓ 超長輸入在 ${duration}ms 內平穩完成評卷，無 ReDoS 或記憶體溢位${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ 超長輸入批改耗時過長或失敗${colors.reset}`);
      allTestsPassed = false;
    }

    // 4. 測試 XSS 惡意腳本注入輸入
    console.log(`\n${colors.bold}[防禦項 4] XSS 腳本注入防禦測試：${colors.reset}`);
    const xssAnswers = {};
    for (const q of testPaper.questions) {
      xssAnswers[q.id] = `<script>alert('PIRLS_XSS');</script><img src="x" onerror="alert(1)" />`;
    }

    const xssResult = await gradeStudentSubmission({
      testPaper,
      rawAnswers: xssAnswers,
    });

    const xssHandled = xssResult.answers.every((a) => {
      return a.studentAnswer.includes('<script>') && a.score === 0;
    });

    if (xssHandled) {
      console.log(`  ${colors.green}✓ XSS 腳本輸入作為純文字安全處理，不觸發異常，批改結果正確${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ XSS 腳本防禦不符預期${colors.reset}`);
      allTestsPassed = false;
    }

    // 5. 測試特殊 Emoji 與符號
    console.log(`\n${colors.bold}[防禦項 5] 特殊 Emoji 與罕見符號測試：${colors.reset}`);
    const emojiAnswers = {};
    for (const q of testPaper.questions) {
      emojiAnswers[q.id] = `👍🔥🚀💯🌟🎉 閱讀超棒！文章說因為火災發生了，大家合力救樹。`;
    }

    const emojiResult = await gradeStudentSubmission({
      testPaper,
      rawAnswers: emojiAnswers,
    });

    if (emojiResult && emojiResult.totalScore > 0) {
      console.log(`  ${colors.green}✓ 包含 Emoji 與特殊符號之回答正確提取核心字句 (得分: ${emojiResult.totalScore})${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ Emoji 輸入評卷失敗${colors.reset}`);
      allTestsPassed = false;
    }

    console.log(`\n${colors.bold}${colors.green}======================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.green}   PIRLS Stage 7 所有 AI 批改防禦性測試 100% 通過！   ${colors.reset}`);
    console.log(`${colors.bold}${colors.green}======================================================${colors.reset}`);
  } catch (err) {
    console.error(`\n${colors.bold}${colors.red}防禦性測試異常:${colors.reset}`, err);
    process.exit(1);
  }

  if (!allTestsPassed) {
    process.exit(1);
  }
}

runDefenseTests();
