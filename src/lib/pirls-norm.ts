import { BenchmarkKey, PIRLSBenchmarkInfo, ExamSubmission } from './types';

/**
 * PIRLS 國際量尺與常模演算法 (PIRLS Scaling & Norm Model)
 * 對齊 IEA PIRLS 國際標準（平均數 500、標準差 100）
 */

export const PIRLS_BENCHMARKS: Record<BenchmarkKey, PIRLSBenchmarkInfo> = {
  advanced: {
    key: 'advanced',
    name: '高級基準',
    enName: 'Advanced International Benchmark',
    minScore: 625,
    maxScore: 1000,
    badgeColor: 'bg-gradient-to-r from-amber-500 to-purple-600 text-white',
    badgeTextColor: 'text-purple-700',
    description:
      '具備卓越的深層閱讀素養。能整合全篇分散的訊息，洞察隱含的主題與人物複雜的心態轉變；能全面評估作者的寫作手法、視角與語言風格，並提出具備充實文本證據的獨立見解。',
    instructionalFocus:
      '建議引導閱讀批判性社論、跨文本主題比較、哲學性故事寓意探討，並鼓勵進行多角度的思辨寫作。',
  },
  high: {
    key: 'high',
    name: '高基準',
    enName: 'High International Benchmark',
    minScore: 550,
    maxScore: 624,
    badgeColor: 'bg-emerald-600 text-white',
    badgeTextColor: 'text-emerald-700',
    description:
      '具備良好的閱讀理解與推論能力。能掌握篇章核心論點與情節發展因果關係；能依據上下文進行合理推論，並能從文章中列舉兩項以上的具體文本細節佐證自己的觀點。',
    instructionalFocus:
      '建議加強「檢驗與評估」題型的深度練習，引導學生反思作者遣詞用字的原因，以及圖表在科普說明文中的修辭功能。',
  },
  intermediate: {
    key: 'intermediate',
    name: '中等基準',
    enName: 'Intermediate International Benchmark',
    minScore: 475,
    maxScore: 549,
    badgeColor: 'bg-sky-600 text-white',
    badgeTextColor: 'text-sky-700',
    description:
      '具備基本完整的字面理解力。能準確找出文章直接陳述的訊息，並能進行初步的淺層推論（如單一原因與結果）；能理解科普圖表的直接圖意，但在跨段落綜合與深層觀點統整上需要指引。',
    instructionalFocus:
      '建議採用「心智圖或情節轉折表」梳理長文結構，訓練學生在回答時使用完整語句，並主動回到文章標記關鍵段落。',
  },
  low: {
    key: 'low',
    name: '低基準',
    enName: 'Low International Benchmark',
    minScore: 400,
    maxScore: 474,
    badgeColor: 'bg-amber-500 text-white',
    badgeTextColor: 'text-amber-700',
    description:
      '具備基礎的字面提取能力。能找出文章中直接提及的人名、時間、地點或簡單情節；但對於需要連結相鄰兩句以上的隱含推論，容易受到干擾選項吸引。',
    instructionalFocus:
      '建議從短篇生活故事與段落大意摘要切入，加強生字詞彙量與閱讀流暢度，透過關鍵字圈選技巧建立作答信心。',
  },
  below_low: {
    key: 'below_low',
    name: '未達低基準',
    enName: 'Below Low International Benchmark',
    minScore: 0,
    maxScore: 399,
    badgeColor: 'bg-slate-500 text-white',
    badgeTextColor: 'text-slate-700',
    description:
      '在面對長篇連續性文本時閱讀負荷較大，較難維持閱讀專注與段落連貫性，字詞理解與訊息提取需要持續且密集的個別化鷹架支持。',
    instructionalFocus:
      '建議提供圖文並茂的階梯式短文、朗讀共讀，逐步培養閱讀習慣與基本的語感連貫能力。',
  },
};

/**
 * PIRLS 國際量尺錨定點 (分段單調遞增映射)
 * 嚴格對應 IEA 官方基準劃分門檻：
 * 0% -> 260 分
 * 35% -> 400 分 (低基準門檻)
 * 50% -> 475 分 (中等基準門檻)
 * 68% -> 550 分 (高基準門檻)
 * 85% -> 625 分 (高級基準門檻)
 * 100% -> 715 分
 */
const SCALE_ANCHORS = [
  { pct: 0.0, score: 260 },
  { pct: 0.2, score: 340 },
  { pct: 0.35, score: 400 },
  { pct: 0.5, score: 475 },
  { pct: 0.68, score: 550 },
  { pct: 0.85, score: 625 },
  { pct: 1.0, score: 715 },
];

/**
 * 依據原始得分計算 PIRLS 國際標準量尺估計分數 (Scale Score)
 */
export function calculatePIRLSScaleScore(totalScore: number, maxScore: number): number {
  if (maxScore <= 0) return 500;
  const rawRatio = Math.max(0, Math.min(1, totalScore / maxScore));

  // 尋找區間進行分段線性內插
  for (let i = 0; i < SCALE_ANCHORS.length - 1; i++) {
    const a1 = SCALE_ANCHORS[i];
    const a2 = SCALE_ANCHORS[i + 1];
    if (rawRatio >= a1.pct && rawRatio <= a2.pct) {
      const rangeRatio = (rawRatio - a1.pct) / (a2.pct - a1.pct);
      const estimatedScore = a1.score + rangeRatio * (a2.score - a1.score);
      return Math.round(estimatedScore);
    }
  }

  return rawRatio >= 1.0 ? 715 : 260;
}

/**
 * 依據量尺分數判定所屬國際基準
 */
export function getBenchmarkInfo(scaleScore: number): PIRLSBenchmarkInfo {
  if (scaleScore >= 625) return PIRLS_BENCHMARKS.advanced;
  if (scaleScore >= 550) return PIRLS_BENCHMARKS.high;
  if (scaleScore >= 475) return PIRLS_BENCHMARKS.intermediate;
  if (scaleScore >= 400) return PIRLS_BENCHMARKS.low;
  return PIRLS_BENCHMARKS.below_low;
}

/**
 * 計算同儕群體中的百分等級 (Percentile Rank, 1 ~ 99)
 * 採用標準心理計量學中點 PR 公式 (Midpoint Percentile Rank)
 */
export function calculatePercentileRank(score: number, allScores: number[]): number {
  if (!allScores || allScores.length <= 1) {
    return 50; // 單一樣本時返回中位數 50
  }

  const n = allScores.length;
  let lessCount = 0;
  let equalCount = 0;

  for (const s of allScores) {
    if (s < score) lessCount++;
    else if (s === score) equalCount++;
  }

  const rawPR = ((lessCount + 0.5 * equalCount) / n) * 100;
  return Math.max(1, Math.min(99, Math.round(rawPR)));
}

/**
 * 常態分佈累積函數近似 (用于在樣本數有限時計算國際/同年級理論常模 PR)
 * PIRLS 母體設定：Mean = 500, SD = 100
 */
export function estimateTheoreticalPR(scaleScore: number): number {
  const z = (scaleScore - 500) / 100;

  // Abramowitz & Stegun 誤差函數近似法
  const t = 1.0 / (1.0 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const prob =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

  const cdf = z > 0 ? 1.0 - prob : prob;
  const pr = Math.round(cdf * 100);
  return Math.max(1, Math.min(99, pr));
}

/**
 * 班級五大國際基準人數與比例分佈統計
 */
export interface BenchmarkDistributionSummary {
  totalCount: number;
  avgScaleScore: number;
  advanced: { count: number; percentage: number };
  high: { count: number; percentage: number };
  intermediate: { count: number; percentage: number };
  low: { count: number; percentage: number };
  below_low: { count: number; percentage: number };
}

export function calculateBenchmarkDistribution(
  submissions: { scaleScore?: number; totalScore: number; maxScore: number }[]
): BenchmarkDistributionSummary {
  const counts: Record<BenchmarkKey, number> = {
    advanced: 0,
    high: 0,
    intermediate: 0,
    low: 0,
    below_low: 0,
  };

  let totalScaleScore = 0;
  const totalCount = submissions.length;

  for (const s of submissions) {
    const sc = s.scaleScore ?? calculatePIRLSScaleScore(s.totalScore, s.maxScore);
    totalScaleScore += sc;
    const b = getBenchmarkInfo(sc);
    counts[b.key]++;
  }

  const calcPct = (key: BenchmarkKey) =>
    totalCount > 0 ? Math.round((counts[key] / totalCount) * 100) : 0;

  return {
    totalCount,
    avgScaleScore: totalCount > 0 ? Math.round(totalScaleScore / totalCount) : 0,
    advanced: { count: counts.advanced, percentage: calcPct('advanced') },
    high: { count: counts.high, percentage: calcPct('high') },
    intermediate: { count: counts.intermediate, percentage: calcPct('intermediate') },
    low: { count: counts.low, percentage: calcPct('low') },
    below_low: { count: counts.below_low, percentage: calcPct('below_low') },
  };
}
