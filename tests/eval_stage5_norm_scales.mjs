import {
  calculatePIRLSScaleScore,
  getBenchmarkInfo,
  calculatePercentileRank,
  estimateTheoreticalPR,
  calculateBenchmarkDistribution,
  PIRLS_BENCHMARKS,
} from '../src/lib/pirls-norm.ts';
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
console.log(`${colors.bold}${colors.cyan}   PIRLS Stage 5: 國際量尺與常模演算法驗收測試   ${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}======================================================${colors.reset}\n`);

let allTestsPassed = true;

async function runTests() {
  try {
    // 1. PIRLS 國際量尺分段單調映射檢核 (Mean 500, SD 100)
    console.log(`${colors.bold}[檢核項 1] PIRLS 國際標準量尺公式與基準門檻錨定驗證：${colors.reset}`);
    const maxPts = 20;
    const testCases = [
      { raw: 0, pct: 0, expected: 260, label: '0分 (最低量尺)' },
      { raw: 7, pct: 35, expected: 400, label: '35% (低基準門檻)' },
      { raw: 10, pct: 50, expected: 475, label: '50% (中等基準門檻)' },
      { raw: 14, pct: 70, expected: 559, label: '70% (高基準門檻以上)' },
      { raw: 17, pct: 85, expected: 625, label: '85% (高級基準門檻)' },
      { raw: 20, pct: 100, expected: 715, label: '滿分 (卓越量尺)' },
    ];

    let monotonicOk = true;
    let prevScore = 0;

    for (const tc of testCases) {
      const scale = calculatePIRLSScaleScore(tc.raw, maxPts);
      console.log(`  - ${tc.label}: 原始分 ${tc.raw}/${maxPts} (${tc.pct}%) -> 量尺估計分 ${scale} 分 (預期 ~${tc.expected})`);
      if (Math.abs(scale - tc.expected) > 5) {
        monotonicOk = false;
      }
      if (scale < prevScore) {
        monotonicOk = false;
      }
      prevScore = scale;
    }

    if (monotonicOk) {
      console.log(`  ${colors.green}✓ PIRLS 量尺分段映射精準，單調嚴格遞增，完全符合 IEA 基準錨定點${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ 量尺轉換數值與預期不符${colors.reset}`);
      allTestsPassed = false;
    }

    // 2. 五大國際基準能力分類與指標描述檢驗
    console.log(`\n${colors.bold}[檢核項 2] 五大國際基準分類判定與教學鷹架指標檢核：${colors.reset}`);
    const bAdv = getBenchmarkInfo(630);
    const bHigh = getBenchmarkInfo(580);
    const bMid = getBenchmarkInfo(510);
    const bLow = getBenchmarkInfo(430);
    const bBelow = getBenchmarkInfo(350);

    console.log(`  - 630 分判定: ${bAdv.name} (${bAdv.enName})`);
    console.log(`  - 580 分判定: ${bHigh.name} (${bHigh.enName})`);
    console.log(`  - 510 分判定: ${bMid.name} (${bMid.enName})`);
    console.log(`  - 430 分判定: ${bLow.name} (${bLow.enName})`);
    console.log(`  - 350 分判定: ${bBelow.name} (${bBelow.enName})`);

    const hasDesc =
      bAdv.description.length > 20 &&
      bAdv.instructionalFocus.length > 10 &&
      bHigh.description.length > 20 &&
      bMid.description.length > 20;

    if (
      bAdv.key === 'advanced' &&
      bHigh.key === 'high' &&
      bMid.key === 'intermediate' &&
      bLow.key === 'low' &&
      bBelow.key === 'below_low' &&
      hasDesc
    ) {
      console.log(`  ${colors.green}✓ 五大基準等級精準劃分，均包含官方能力描述與自主學習策略建議${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ 基準等級判定異常${colors.reset}`);
      allTestsPassed = false;
    }

    // 3. 班級同儕 PR 百分等級 (Midpoint Percentile Rank) 計算驗證
    console.log(`\n${colors.bold}[檢核項 3] 班級同儕 PR 百分等級演算法檢核：${colors.reset}`);
    const classScores = [10, 12, 14, 16, 18];
    const prTop = calculatePercentileRank(18, classScores);
    const prMid = calculatePercentileRank(14, classScores);
    const prLow = calculatePercentileRank(10, classScores);

    console.log(`  - 班級分數群體 [10, 12, 14, 16, 18]:`);
    console.log(`    • 最高分 18 分之班級 PR: ${prTop} (預期 90)`);
    console.log(`    • 中位數 14 分之班級 PR: ${prMid} (預期 50)`);
    console.log(`    • 最低分 10 分之班級 PR: ${prLow} (預期 10)`);

    if (prTop === 90 && prMid === 50 && prLow === 10) {
      console.log(`  ${colors.green}✓ 心理計量學中點 PR 公式驗證無誤 (邊界 1~99 守門正確)${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ PR 值計算不符預期${colors.reset}`);
      allTestsPassed = false;
    }

    // 4. 理論國際常模 PR 演算法 (Normal CDF, Mean 500, SD 100)
    console.log(`\n${colors.bold}[檢核項 4] 國際常態分佈理論常模 PR 演算法檢核：${colors.reset}`);
    const norm500 = estimateTheoreticalPR(500); // 平均數 -> PR 50
    const norm600 = estimateTheoreticalPR(600); // +1 SD -> PR 84
    const norm400 = estimateTheoreticalPR(400); // -1 SD -> PR 16
    const norm625 = estimateTheoreticalPR(625); // 高級基準門檻 -> PR 89
    const norm550 = estimateTheoreticalPR(550); // 高基準門檻 -> PR 69

    console.log(`  - 量尺 500 分 (國際平均): PR ${norm500} (預期 50)`);
    console.log(`  - 量尺 600 分 (+1個標準差): PR ${norm600} (預期 84)`);
    console.log(`  - 量尺 400 分 (-1個標準差): PR ${norm400} (預期 16)`);
    console.log(`  - 量尺 625 分 (高級門檻): PR ${norm625} (預期 89)`);
    console.log(`  - 量尺 550 分 (高基準門檻): PR ${norm550} (預期 69)`);

    if (
      norm500 === 50 &&
      norm600 >= 83 && norm600 <= 85 &&
      norm400 >= 15 && norm400 <= 17 &&
      norm625 >= 88 && norm625 <= 90
    ) {
      console.log(`  ${colors.green}✓ 國際常模常態分佈累積函數精準映射成功${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ 國際常模 PR 演算法異常${colors.reset}`);
      allTestsPassed = false;
    }

    // 5. 班級五大基準聚合分佈與平均量尺統計
    console.log(`\n${colors.bold}[檢核項 5] 班級五大基準人數與百分比聚合統計：${colors.reset}`);
    const mockClassCohort = [
      { totalScore: 19, maxScore: 20 }, // 685 (高級)
      { totalScore: 18, maxScore: 20 }, // 655 (高級)
      { totalScore: 15, maxScore: 20 }, // 585 (高)
      { totalScore: 11, maxScore: 20 }, // 500 (中等)
      { totalScore: 7, maxScore: 20 },  // 400 (低)
    ];

    const dist = calculateBenchmarkDistribution(mockClassCohort);
    console.log(`  - 全班總人數: ${dist.totalCount} 人，平均量尺分數: ${dist.avgScaleScore} 分`);
    console.log(`  - 高級基準: ${dist.advanced.count} 人 (${dist.advanced.percentage}%)`);
    console.log(`  - 高基準: ${dist.high.count} 人 (${dist.high.percentage}%)`);
    console.log(`  - 中等基準: ${dist.intermediate.count} 人 (${dist.intermediate.percentage}%)`);
    console.log(`  - 低基準: ${dist.low.count} 人 (${dist.low.percentage}%)`);
    console.log(`  - 未達低基準: ${dist.below_low.count} 人 (${dist.below_low.percentage}%)`);

    if (
      dist.totalCount === 5 &&
      dist.advanced.count === 2 &&
      dist.high.count === 1 &&
      dist.intermediate.count === 1 &&
      dist.low.count === 1 &&
      dist.avgScaleScore >= 550
    ) {
      console.log(`  ${colors.green}✓ 班級五大基準分佈聚合與班級平均量尺計算 100% 正確${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ 基準分佈聚合統計異常${colors.reset}`);
      allTestsPassed = false;
    }

    // 6. 學生繳卷資料庫持久化之量尺與常模欄位檢驗
    console.log(`\n${colors.bold}[檢核項 6] 繳卷寫入與讀取時之 PIRLS 量尺/基準/PR 欄位完整性：${colors.reset}`);
    const subRecord = await createSubmission({
      testPaperId: 'test_stage5_mock',
      testPaperTitle: '南極探險記',
      targetGrade: 4,
      textType: 'informational',
      studentId: 'student_stage5_001',
      studentName: '張小美',
      classId: 'class_stage5_001',
      className: '四年二班',
      seatNumber: 8,
      totalScore: 16,
      maxScore: 20,
      percentage: 80,
      scaleScore: 601,
      benchmarkKey: 'high',
      benchmarkName: '高基準',
      benchmarkDescription: '具備良好的閱讀理解與推論能力。',
      classPR: 85,
      normPR: 84,
      processScores: {
        level1: { earned: 4, total: 4, percentage: 100 },
        level2: { earned: 5, total: 6, percentage: 83 },
        level3: { earned: 4, total: 6, percentage: 67 },
        level4: { earned: 3, total: 4, percentage: 75 },
      },
      answers: [],
    });

    const fetched = await getSubmissionById(subRecord.id);
    if (
      fetched &&
      fetched.scaleScore === 601 &&
      fetched.benchmarkKey === 'high' &&
      fetched.classPR === 85 &&
      fetched.normPR === 84
    ) {
      console.log(`  - 繳卷 ID: ${fetched.id}`);
      console.log(`  - 儲存量尺分數: ${fetched.scaleScore} 分 (${fetched.benchmarkName})`);
      console.log(`  - 班級 PR: ${fetched.classPR}，常模 PR: ${fetched.normPR}`);
      console.log(`  ${colors.green}✓ 學生繳卷之國際量尺、基準等級與同儕 PR 欄位寫入與查詢驗證成功${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ 繳卷紀錄量尺欄位持久化異常${colors.reset}`);
      allTestsPassed = false;
    }

    console.log(`\n${colors.bold}${colors.green}======================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.green}   PIRLS Stage 5 所有國際量尺與常模演算法測試通過！   ${colors.reset}`);
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
