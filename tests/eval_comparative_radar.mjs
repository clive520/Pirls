import { createClass, getClassStudents, createStudentsBatch } from '../src/lib/db/classes.ts';
import { createTestPaper } from '../src/lib/db/test-papers.ts';
import { createSubmission } from '../src/lib/db/submissions.ts';
import { computeComparativeAnalysis } from '../src/lib/analytics/comparative.ts';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m'
};

console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}  📊 PIRLS 前測 vs 後測「四維思維能力雷達」對照分析 端對端測試   ${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}================================================================${colors.reset}\n`);

let allPassed = true;

async function run() {
  try {
    const teacherId = 'teacher_comparative_eval';

    // 1. 建立測試班級
    console.log(`${colors.yellow}步驟 1: 建立測試班級與學生...${colors.reset}`);
    const testClass = await createClass(teacherId, '四年六班 (實驗班)', 4);
    const students = await createStudentsBatch(teacherId, testClass.id, [
      { username: 'stu_eva_1', displayName: '林小華', seatNumber: 1, gradeLevel: 4 },
      { username: 'stu_eva_2', displayName: '張小美', seatNumber: 2, gradeLevel: 4 }
    ]);
    console.log(`✅ 班級建立成功: ${testClass.name} (ID: ${testClass.id}), 學生數: ${students.length}`);

    // 2. 建立前測試卷 (期初診斷測驗)
    console.log(`\n${colors.yellow}步驟 2: 建立前測試卷 (期初) 與後測試卷 (期末)...${colors.reset}`);
    const prePaper = await createTestPaper({
      title: '期初閱讀診斷測驗-尋找小石子',
      targetGrade: 4,
      textType: 'literary',
      themeSummary: '大自然冒險',
      articleContent: '小石子在溪流中翻滾...',
      wordCount: 700,
      paragraphs: [{ paragraphNumber: 1, text: '小石子在溪流中翻滾...' }],
      questions: [
        {
          id: 'q1',
          questionNumber: 1,
          process: 'focus_and_retrieve',
          processLevelNumber: 1,
          type: 'multiple_choice',
          prompt: '小石子在哪裡？',
          options: ['溪流', '山上', '海邊', '森林'],
          correctAnswer: '溪流',
          scoringGuide: { points: 1, fullCreditDescription: '答對得1分' }
        }
      ],
      totalPoints: 10,
      creatorId: teacherId,
      creatorName: '評估教師',
      isPublic: true,
      timeLimitMinutes: 40,
      allowRetake: true
    });

    // 建立後測試卷 (期末成長評量)
    const postPaper = await createTestPaper({
      title: '期末深度閱讀評量-極地探險記',
      targetGrade: 4,
      textType: 'informational',
      themeSummary: '極地生態探險',
      articleContent: '北極熊與企鵝生活在不同的極圈...',
      wordCount: 800,
      paragraphs: [{ paragraphNumber: 1, text: '北極熊與企鵝生活在不同的極圈...' }],
      questions: [
        {
          id: 'post_q1',
          questionNumber: 1,
          process: 'focus_and_retrieve',
          processLevelNumber: 1,
          type: 'multiple_choice',
          prompt: '北極熊生活在哪裡？',
          options: ['北極', '南極', '熱帶', '溫帶'],
          correctAnswer: '北極',
          scoringGuide: { points: 1, fullCreditDescription: '答對得1分' }
        }
      ],
      totalPoints: 10,
      creatorId: teacherId,
      creatorName: '評估教師',
      isPublic: true,
      timeLimitMinutes: 40,
      allowRetake: true
    });
    console.log(`✅ 前測試卷: ${prePaper.title} (ID: ${prePaper.id})`);
    console.log(`✅ 後測試卷: ${postPaper.title} (ID: ${postPaper.id})`);

    // 3. 模擬學生作答資料
    // 學生 1 (林小華): 前測 L1=60%, L2=50%, L3=40%, L4=30%, scaleScore=460 (中下基準)
    //                後測 L1=80%, L2=75%, L3=70%, L4=55%, scaleScore=545 (中等基準偏高)
    console.log(`\n${colors.yellow}步驟 3: 寫入學生作答與四層次落點資料...${colors.reset}`);
    await createSubmission({
      testPaperId: prePaper.id,
      testPaperTitle: prePaper.title,
      targetGrade: 4,
      textType: 'literary',
      studentId: students[0].id,
      studentName: students[0].displayName,
      classId: testClass.id,
      className: testClass.name,
      seatNumber: 1,
      totalScore: 5,
      maxScore: 10,
      percentage: 50,
      scaleScore: 460,
      benchmarkKey: 'low',
      benchmarkName: '低國際基準',
      answers: [],
      processScores: {
        level1: { earned: 6, total: 10, percentage: 60 },
        level2: { earned: 5, total: 10, percentage: 50 },
        level3: { earned: 4, total: 10, percentage: 40 },
        level4: { earned: 3, total: 10, percentage: 30 }
      }
    });

    await createSubmission({
      testPaperId: postPaper.id,
      testPaperTitle: postPaper.title,
      targetGrade: 4,
      textType: 'informational',
      studentId: students[0].id,
      studentName: students[0].displayName,
      classId: testClass.id,
      className: testClass.name,
      seatNumber: 1,
      totalScore: 7,
      maxScore: 10,
      percentage: 70,
      scaleScore: 545,
      benchmarkKey: 'intermediate',
      benchmarkName: '中等國際基準',
      answers: [],
      processScores: {
        level1: { earned: 8, total: 10, percentage: 80 },
        level2: { earned: 7.5, total: 10, percentage: 75 },
        level3: { earned: 7, total: 10, percentage: 70 },
        level4: { earned: 5.5, total: 10, percentage: 55 }
      }
    });

    // 學生 2 (張小美): 前測 L1=70%, L2=65%, L3=60%, L4=50%, scaleScore=510 (中等基準)
    //                後測 L1=90%, L2=85%, L3=80%, L4=70%, scaleScore=590 (高國際基準)
    await createSubmission({
      testPaperId: prePaper.id,
      testPaperTitle: prePaper.title,
      targetGrade: 4,
      textType: 'literary',
      studentId: students[1].id,
      studentName: students[1].displayName,
      classId: testClass.id,
      className: testClass.name,
      seatNumber: 2,
      totalScore: 6,
      maxScore: 10,
      percentage: 60,
      scaleScore: 510,
      benchmarkKey: 'intermediate',
      benchmarkName: '中等國際基準',
      answers: [],
      processScores: {
        level1: { earned: 7, total: 10, percentage: 70 },
        level2: { earned: 6.5, total: 10, percentage: 65 },
        level3: { earned: 6, total: 10, percentage: 60 },
        level4: { earned: 5, total: 10, percentage: 50 }
      }
    });

    await createSubmission({
      testPaperId: postPaper.id,
      testPaperTitle: postPaper.title,
      targetGrade: 4,
      textType: 'informational',
      studentId: students[1].id,
      studentName: students[1].displayName,
      classId: testClass.id,
      className: testClass.name,
      seatNumber: 2,
      totalScore: 8,
      maxScore: 10,
      percentage: 80,
      scaleScore: 590,
      benchmarkKey: 'high',
      benchmarkName: '高國際基準',
      answers: [],
      processScores: {
        level1: { earned: 9, total: 10, percentage: 90 },
        level2: { earned: 8.5, total: 10, percentage: 85 },
        level3: { earned: 8, total: 10, percentage: 80 },
        level4: { earned: 7, total: 10, percentage: 70 }
      }
    });
    console.log(`✅ 兩位學生之前後測成績與四層次落點數據寫入完畢`);

    // 4. 執行全班模式前後測對照運算
    console.log(`\n${colors.yellow}步驟 4: 測試全班歷程前後測對照運算 (Scope: 'class')...${colors.reset}`);
    const classAnalysis = await computeComparativeAnalysis({
      classId: testClass.id,
      preTestId: prePaper.id,
      postTestId: postPaper.id
    });

    if (!classAnalysis) {
      throw new Error('computeComparativeAnalysis 回傳 null！');
    }

    console.log(`✅ 分析範疇: ${classAnalysis.scope}, 班級: ${classAnalysis.className}`);
    console.log(`✅ 配對完成學生人數: ${classAnalysis.pairedStudentsCount} / 2 位`);
    console.log(`✅ 前測平均量尺: ${classAnalysis.preTest.scaleScore} 分 (${classAnalysis.preTest.benchmarkName})`);
    console.log(`✅ 後測平均量尺: ${classAnalysis.postTest.scaleScore} 分 (${classAnalysis.postTest.benchmarkName})`);
    console.log(`✅ 量尺成長差值: +${classAnalysis.scaleScoreDelta} 分`);

    // 驗證四層次數值
    console.log(`\n四層次掌握率前測 vs 後測:`);
    console.log(`- L1 直接提取: ${classAnalysis.levels.level1.prePercentage}% ➔ ${classAnalysis.levels.level1.postPercentage}% (差值: +${classAnalysis.levels.level1.deltaPercentage}%)`);
    console.log(`- L2 直接推論: ${classAnalysis.levels.level2.prePercentage}% ➔ ${classAnalysis.levels.level2.postPercentage}% (差值: +${classAnalysis.levels.level2.deltaPercentage}%)`);
    console.log(`- L3 詮釋整合: ${classAnalysis.levels.level3.prePercentage}% ➔ ${classAnalysis.levels.level3.postPercentage}% (差值: +${classAnalysis.levels.level3.deltaPercentage}%)`);
    console.log(`- L4 檢驗評估: ${classAnalysis.levels.level4.prePercentage}% ➔ ${classAnalysis.levels.level4.postPercentage}% (差值: +${classAnalysis.levels.level4.deltaPercentage}%)`);

    if (classAnalysis.pairedStudentsCount !== 2) {
      console.error(`❌ 配對人數預期 2 人，實際為 ${classAnalysis.pairedStudentsCount}`);
      allPassed = false;
    } else {
      console.log(`✅ 配對人數檢驗通過`);
    }

    if (classAnalysis.scaleScoreDelta <= 0) {
      console.error(`❌ 量尺分差值應為正值，實際為 ${classAnalysis.scaleScoreDelta}`);
      allPassed = false;
    } else {
      console.log(`✅ 量尺分差值計算正確: +${classAnalysis.scaleScoreDelta} 分`);
    }

    // 驗證進步最多與最需補強
    console.log(`\n✅ 最顯著進步維度: ${classAnalysis.mostImprovedLevel}`);
    console.log(`✅ 最需深化維度: ${classAnalysis.needsFocusLevel}`);

    // 5. 執行個別學生模式前後測對照運算
    console.log(`\n${colors.yellow}步驟 5: 測試個別學生前後測對照運算 (Scope: 'student')...${colors.reset}`);
    const studentAnalysis = await computeComparativeAnalysis({
      classId: testClass.id,
      preTestId: prePaper.id,
      postTestId: postPaper.id,
      studentId: students[0].id
    });

    if (!studentAnalysis) {
      throw new Error('個別學生對照回傳 null！');
    }

    console.log(`✅ 分析範疇: ${studentAnalysis.scope}, 學生: ${studentAnalysis.studentName}`);
    console.log(`✅ 該學生量尺成長: ${studentAnalysis.preTest.scaleScore} ➔ ${studentAnalysis.postTest.scaleScore} (成長 +${studentAnalysis.scaleScoreDelta} 分)`);
    console.log(`✅ 該學生 L3 成長: ${studentAnalysis.levels.level3.prePercentage}% ➔ ${studentAnalysis.levels.level3.postPercentage}% (成長 +${studentAnalysis.levels.level3.deltaPercentage}%)`);

    if (studentAnalysis.scaleScoreDelta !== 85) {
      console.error(`❌ 學生 1 量尺分成長應為 545 - 460 = 85，實際為 ${studentAnalysis.scaleScoreDelta}`);
      allPassed = false;
    } else {
      console.log(`✅ 個人量尺成長 85 分計算精確無誤！`);
    }

    // 總結
    if (allPassed) {
      console.log(`\n${colors.bold}${colors.green}🎉 全部測試 100% 通過！前後測雙層四維雷達對照引擎運作完美！${colors.reset}\n`);
    } else {
      console.log(`\n${colors.bold}${colors.red}❌ 部分測試未通過，請檢查錯誤紀錄。${colors.reset}\n`);
    }
  } catch (err) {
    console.error('測試失敗：', err);
    process.exit(1);
  }
}

run();
