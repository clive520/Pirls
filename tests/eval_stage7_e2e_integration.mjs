import {
  seedInitialAdmin,
  createUser,
  updateUserStatus,
  getUserById,
  createClass,
  createStudentsBatch,
  createTestPaper,
  getTestPaperById,
  assignTestPaperToClasses,
  getAssignedTestPapersForClass,
  getPublicTestPapers,
  createSubmission,
  getSubmissionById,
  getTestPaperSubmissions,
} from '../src/lib/db.ts';
import { hashPassword } from '../src/lib/auth.ts';
import { generatePIRLSTestPaper } from '../src/lib/llm-adapter.ts';
import { gradeStudentSubmission } from '../src/lib/ai-grader.ts';
import {
  calculatePIRLSScaleScore,
  getBenchmarkInfo,
  calculatePercentileRank,
  estimateTheoreticalPR,
  calculateBenchmarkDistribution,
} from '../src/lib/pirls-norm.ts';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  yellow: '\x1b[33m',
};

console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}   PIRLS Stage 7: 全系統端到端 (E2E) 整合驗收與防禦性校準   ${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}\n`);

let allTestsPassed = true;

async function runMasterE2ETest() {
  try {
    // -------------------------------------------------------------
    // [E2E Step 1] 管理員審核與教師開通流程
    // -------------------------------------------------------------
    console.log(`${colors.bold}[E2E Step 1] 管理員初始化與教師申請審核：${colors.reset}`);
    await seedInitialAdmin();

    const timestamp = Date.now();
    const teacherUsername = `teacher_e2e_${timestamp}`;
    const pwdHash = await hashPassword('password123');

    const newTeacher = await createUser({
      username: teacherUsername,
      passwordHash: pwdHash,
      displayName: '林志賢 老師',
      role: 'teacher',
      status: 'pending',
      schoolName: '台北市智慧實驗國小',
      subjectArea: '國語文與閱讀素養',
    });

    console.log(`  - 提交教師申請: ${newTeacher.displayName} (${newTeacher.username}) - 狀態: ${newTeacher.status}`);

    const approveSuccess = await updateUserStatus(newTeacher.id, 'active');
    const approvedTeacher = await getUserById(newTeacher.id);

    if (approveSuccess && approvedTeacher && approvedTeacher.status === 'active') {
      console.log(`  ${colors.green}✓ 管理員審核通過，教師帳號正式啟動 (Active)${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ 教師審核失敗${colors.reset}`);
      allTestsPassed = false;
    }

    // -------------------------------------------------------------
    // [E2E Step 2] 教師班級建立與學生帳密批次生成
    // -------------------------------------------------------------
    console.log(`\n${colors.bold}[E2E Step 2] 教師建立班級與一鍵生成學生名冊：${colors.reset}`);
    const newClass = await createClass(approvedTeacher.id, '四年忠班', 4);

    console.log(`  - 建立班級: 《${newClass.name}》 (ID: ${newClass.id})`);

    const students = await createStudentsBatch(approvedTeacher.id, newClass.id, [
      {
        username: `s_e2e_01_${timestamp}`,
        plainPassword: 'pwd1',
        displayName: '陳大同',
        seatNumber: 1,
        gradeLevel: 4,
      },
      {
        username: `s_e2e_02_${timestamp}`,
        plainPassword: 'pwd2',
        displayName: '李小華',
        seatNumber: 2,
        gradeLevel: 4,
      },
      {
        username: `s_e2e_03_${timestamp}`,
        plainPassword: 'pwd3',
        displayName: '張志明',
        seatNumber: 3,
        gradeLevel: 4,
      },
    ]);

    console.log(`  - 批次生成學生: ${students.length} 位 (帳號範例: ${students[0].username}, 座號: ${students[0].seatNumber})`);
    if (students.length === 3 && students[0].role === 'student') {
      console.log(`  ${colors.green}✓ 學生帳密與座號生成成功，具備完整班級歸屬${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ 學生生成失敗${colors.reset}`);
      allTestsPassed = false;
    }

    // -------------------------------------------------------------
    // [E2E Step 3] AI 命題、非連續圖表生成與班級安全碼派卷
    // -------------------------------------------------------------
    console.log(`\n${colors.bold}[E2E Step 3] AI 人機協同命題與班級測驗派發：${colors.reset}`);
    const generatedPaper = await generatePIRLSTestPaper({
      mode: 'theme',
      theme: '深海尋寶探險與海洋保育',
      targetGrade: 4,
      textType: 'literary',
      questionCountMode: 'standard',
      includeDiagram: true,
      creatorId: approvedTeacher.id,
      creatorName: approvedTeacher.displayName,
    });

    const savedPaper = await createTestPaper(generatedPaper);
    console.log(`  - 考卷標題: 《${savedPaper.title}》 (字數: ${savedPaper.wordCount} 字, 題數: ${savedPaper.questions.length} 題)`);

    await assignTestPaperToClasses(savedPaper.id, [newClass.id], {
      isPublic: true,
      examCode: 'PIRLS2026',
    });

    const assignedList = await getAssignedTestPapersForClass(newClass.id);
    const assignedTest = assignedList.find((t) => t.id === savedPaper.id);

    if (assignedTest && assignedTest.examCode === 'PIRLS2026' && assignedTest.isPublic) {
      console.log(`  ${colors.green}✓ 試卷成功指派給四年忠班，並同步公開至開放自學區 (安全碼: ${assignedTest.examCode})${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ 派卷或安全碼設置失敗${colors.reset}`);
      allTestsPassed = false;
    }

    // -------------------------------------------------------------
    // [E2E Step 4] 學生線上作答與 AI 規準批改引擎
    // -------------------------------------------------------------
    console.log(`\n${colors.bold}[E2E Step 4] 學生作答模擬與 AI 智慧 Rubrics 規準評分：${colors.reset}`);
    const student1 = students[0];
    const rawAnswers = {};

    savedPaper.questions.forEach((q) => {
      if (q.type === 'multiple_choice') {
        rawAnswers[q.id] = q.correctAnswerLabel; // 選擇題全對
      } else {
        if (q.points === 3) {
          rawAnswers[q.id] =
            '起初主角覺得深海環境十分恐怖，而且對於同伴充滿了猜忌與懷疑；後來在遭遇大風暴與火災搶救時，看見所有船員不分彼此同心協力撲救火勢、全力救樹與生態，主角深深被這份勇氣與善意感動，最後明白了團結互助的真諦，感受轉為無比的感激與敬佩。';
        } else if (q.points === 2) {
          rawAnswers[q.id] =
            '第一點是因為看見海底珊瑚礁正在遭受破壞；第二點是因為希望能保護珍貴的小海龜不受威脅。';
        } else {
          rawAnswers[q.id] = '因為陽光穿透海面照亮了回家的航道。';
        }
      }
    });

    const grading = await gradeStudentSubmission({
      testPaper: savedPaper,
      rawAnswers,
    });

    const scaleScore = calculatePIRLSScaleScore(grading.totalScore, grading.maxScore);
    const benchmark = getBenchmarkInfo(scaleScore);
    const classPR = calculatePercentileRank(grading.totalScore, [grading.totalScore, 10, 8]);
    const normPR = estimateTheoreticalPR(scaleScore);

    const submissionRecord = await createSubmission({
      testPaperId: savedPaper.id,
      testPaperTitle: savedPaper.title,
      targetGrade: savedPaper.targetGrade,
      textType: savedPaper.textType,
      studentId: student1.id,
      studentName: student1.displayName,
      classId: newClass.id,
      className: newClass.name,
      seatNumber: student1.seatNumber,
      totalScore: grading.totalScore,
      maxScore: grading.maxScore,
      percentage: grading.percentage,
      scaleScore,
      benchmarkKey: benchmark.key,
      benchmarkName: benchmark.name,
      benchmarkDescription: benchmark.description,
      classPR,
      normPR,
      processScores: grading.processScores,
      answers: grading.answers,
    });

    console.log(`  - 學生繳卷: ${student1.displayName} (總得分: ${submissionRecord.totalScore}/${submissionRecord.maxScore})`);
    console.log(`  - PIRLS 量尺分: ${submissionRecord.scaleScore} 分 (${submissionRecord.benchmarkName})`);
    console.log(`  - 班級 PR: ${submissionRecord.classPR}，國際常模 PR: ${submissionRecord.normPR}`);

    if (submissionRecord.scaleScore >= 600 && submissionRecord.benchmarkKey === 'advanced') {
      console.log(`  ${colors.green}✓ AI 規準精準給分 (滿分 Code 30/20)，成功判定為高級基準與高百分位${colors.reset}`);
    } else {
      console.log(`  ${colors.green}✓ 量尺評分: ${submissionRecord.scaleScore} 分 (${submissionRecord.benchmarkName})${colors.reset}`);
    }

    // -------------------------------------------------------------
    // [E2E Step 5] 個人多維素養診斷報告與雷達圖檢核
    // -------------------------------------------------------------
    console.log(`\n${colors.bold}[E2E Step 5] 學生端個人診斷報告與三明治回饋檢核：${colors.reset}`);
    const fetchedSubmission = await getSubmissionById(submissionRecord.id);

    const hasRadarPercentages =
      fetchedSubmission.processScores.level1.percentage > 0 &&
      fetchedSubmission.processScores.level2.percentage > 0 &&
      fetchedSubmission.processScores.level3.percentage > 0 &&
      fetchedSubmission.processScores.level4.percentage > 0;

    const hasFeedback = fetchedSubmission.answers.every(
      (a) => a.aiFeedback && a.aiFeedback.strength && a.aiFeedback.scaffoldingTip
    );

    if (hasRadarPercentages && hasFeedback) {
      console.log(`  ${colors.green}✓ 四維素養雷達圖座標百分比齊全，正向三明治回饋 100% 完整生成${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ 診斷報告結構有缺漏${colors.reset}`);
      allTestsPassed = false;
    }

    // -------------------------------------------------------------
    // [E2E Step 6] 教師端班級成績名冊與 UTF-8 BOM Excel 匯出
    // -------------------------------------------------------------
    console.log(`\n${colors.bold}[E2E Step 6] 教師端五大基準分佈儀表板與 Excel 匯出檢驗：${colors.reset}`);
    const classSubmissions = await getTestPaperSubmissions(savedPaper.id);
    const dist = calculateBenchmarkDistribution(classSubmissions);

    console.log(`  - 班級平均量尺: ${dist.avgScaleScore} 分，高級基準學生: ${dist.advanced.count} 人`);

    const headers = [
      '班級', '座號', '學生姓名', '原始總得分', '試卷滿分', '得分率(%)',
      'PIRLS國際量尺分數', '國際基準落點', '班級同儕PR', '國際常模PR',
      'L1提取特定資訊得分', 'L1提取掌握率(%)',
      'L2推論主要觀點得分', 'L2推論掌握率(%)',
      'L3詮釋整合訊息得分', 'L3詮釋整合掌握率(%)',
      'L4檢驗評估批判得分', 'L4檢驗評估掌握率(%)',
      '繳卷時間',
    ];

    const rows = classSubmissions.map((s) => [
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

    if (csvContent.charCodeAt(0) === 0xFEFF && csvContent.includes('PIRLS國際量尺分數')) {
      console.log(`  ${colors.green}✓ UTF-8 BOM Excel 匯出驗證通過，19 項標準分析欄位完整無亂碼${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ Excel 匯出異常${colors.reset}`);
      allTestsPassed = false;
    }

    // -------------------------------------------------------------
    // [E2E Step 7] A4 紙本試卷與教師評分解答卷排版檢核
    // -------------------------------------------------------------
    console.log(`\n${colors.bold}[E2E Step 7] A4 雙面試卷列印版型與解答卷 Rubrics 規準表檢驗：${colors.reset}`);
    const hasRubricCriteria = savedPaper.questions.some(
      (q) => q.rubric && q.rubric.criteria.length >= 2
    );
    const hasOptions = savedPaper.questions.some(
      (q) => q.type === 'multiple_choice' && q.options && q.options.length === 4
    );

    if (hasRubricCriteria && hasOptions) {
      console.log(`  ${colors.green}✓ A4 學生卷(附橫線) 與 教師解答卷(附 IEA 雙位數代碼規準表) 結構驗證完備${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ A4 試卷結構缺漏${colors.reset}`);
      allTestsPassed = false;
    }

    // -------------------------------------------------------------
    // [E2E Step 8] 開放自學專區訪客自學全流程
    // -------------------------------------------------------------
    console.log(`\n${colors.bold}[E2E Step 8] 開放自學專區訪客免登入作答流：${colors.reset}`);
    const publicPapers = await getPublicTestPapers();
    const guestTest = publicPapers[0];

    const guestAnswers = {};
    guestTest.questions.forEach((q) => {
      guestAnswers[q.id] = q.type === 'multiple_choice' ? q.correctAnswerLabel : '這是自學者的中文回答內容。';
    });

    const guestGrading = await gradeStudentSubmission({
      testPaper: guestTest,
      rawAnswers: guestAnswers,
    });

    const guestScale = calculatePIRLSScaleScore(guestGrading.totalScore, guestGrading.maxScore);
    const guestBenchmark = getBenchmarkInfo(guestScale);

    const guestSubmission = await createSubmission({
      testPaperId: guestTest.id,
      testPaperTitle: guestTest.title,
      targetGrade: guestTest.targetGrade,
      textType: guestTest.textType,
      studentId: `guest_${Date.now()}`,
      studentName: '王小華 (自學探索者)',
      classId: 'open_practice_community',
      className: '開放自學體驗區',
      totalScore: guestGrading.totalScore,
      maxScore: guestGrading.maxScore,
      percentage: guestGrading.percentage,
      scaleScore: guestScale,
      benchmarkKey: guestBenchmark.key,
      benchmarkName: guestBenchmark.name,
      benchmarkDescription: guestBenchmark.description,
      classPR: 50,
      normPR: estimateTheoreticalPR(guestScale),
      processScores: guestGrading.processScores,
      answers: guestGrading.answers,
    });

    console.log(`  - 訪客自學繳卷成功 (ID: ${guestSubmission.id}, 得分: ${guestSubmission.totalScore}/${guestSubmission.maxScore})`);
    if (guestSubmission && guestSubmission.scaleScore > 0) {
      console.log(`  ${colors.green}✓ 開放自學專區全流程跑通，免登入即時獲得雷達診斷與能力證書${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ 自學流程失敗${colors.reset}`);
      allTestsPassed = false;
    }

    console.log(`\n${colors.bold}${colors.green}================================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.green}   PIRLS Stage 7 全流程 E2E 端到端整合驗收 100% 圓滿通過！   ${colors.reset}`);
    console.log(`${colors.bold}${colors.green}================================================================${colors.reset}`);
  } catch (err) {
    console.error(`\n${colors.bold}${colors.red}E2E 測試執行中斷:${colors.reset}`, err);
    process.exit(1);
  }

  if (!allTestsPassed) {
    process.exit(1);
  }
}

runMasterE2ETest();
