import {
  TestPaper,
  ExamSubmission,
  ClassRoom,
  User,
  ComparativeAnalysisData,
  LevelComparisonItem,
  StudentComparativeItem,
} from '../types';
import { getBenchmarkInfo } from '../pirls-norm';
import {
  getTestPaperById,
  getClassStudents,
  getTestPaperSubmissions,
  ensureLocalDB,
  syncCloudOnBoot,
} from '../db';

export async function computeComparativeAnalysis(options: {
  classId: string;
  preTestId: string;
  postTestId: string;
  studentId?: string;
}): Promise<ComparativeAnalysisData | null> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  const { classId, preTestId, postTestId, studentId } = options;

  const currentClass: ClassRoom | undefined = state.classes[classId];
  if (!currentClass) return null;

  const [preTest, postTest, classStudents] = await Promise.all([
    getTestPaperById(preTestId),
    getTestPaperById(postTestId),
    getClassStudents(classId),
  ]);

  if (!preTest || !postTest) return null;

  const studentMap = new Map<string, User>();
  classStudents.forEach((s) => studentMap.set(s.id, s));

  // 取得兩份試卷所有作答紀錄，並過濾出本班學生
  const [allPreSubs, allPostSubs] = await Promise.all([
    getTestPaperSubmissions(preTestId),
    getTestPaperSubmissions(postTestId),
  ]);

  const classPreSubs = allPreSubs.filter((s) => studentMap.has(s.studentId));
  const classPostSubs = allPostSubs.filter((s) => studentMap.has(s.studentId));

  // 輔助函式：計算四層次平均
  const computeLevelAvg = (subs: ExamSubmission[], levelKey: 'level1' | 'level2' | 'level3' | 'level4') => {
    if (subs.length === 0) return { pct: 0, earned: 0, total: 0 };
    const valid = subs.filter((s) => s.processScores?.[levelKey]);
    if (valid.length === 0) return { pct: 0, earned: 0, total: 0 };

    const sumPct = valid.reduce((acc, s) => acc + (s.processScores![levelKey]?.percentage || 0), 0);
    const sumEarned = valid.reduce((acc, s) => acc + (s.processScores![levelKey]?.earned || 0), 0);
    const sumTotal = valid.reduce((acc, s) => acc + (s.processScores![levelKey]?.total || 0), 0);

    return {
      pct: Math.round(sumPct / valid.length),
      earned: Math.round((sumEarned / valid.length) * 10) / 10,
      total: Math.round((sumTotal / valid.length) * 10) / 10,
    };
  };

  // 判斷是單一學生模式還是全班模式
  if (studentId) {
    const targetStudent = studentMap.get(studentId);
    const preSub = classPreSubs.find((s) => s.studentId === studentId);
    const postSub = classPostSubs.find((s) => s.studentId === studentId);

    const preL1 = preSub?.processScores?.level1?.percentage || 0;
    const postL1 = postSub?.processScores?.level1?.percentage || 0;
    const preL2 = preSub?.processScores?.level2?.percentage || 0;
    const postL2 = postSub?.processScores?.level2?.percentage || 0;
    const preL3 = preSub?.processScores?.level3?.percentage || 0;
    const postL3 = postSub?.processScores?.level3?.percentage || 0;
    const preL4 = preSub?.processScores?.level4?.percentage || 0;
    const postL4 = postSub?.processScores?.level4?.percentage || 0;

    const preScale = preSub?.scaleScore || 500;
    const postScale = postSub?.scaleScore || 500;

    const level1: LevelComparisonItem = {
      level: 'level1',
      name: '第一層：直接提取訊息',
      shortName: 'L1 直接提取',
      prePercentage: preL1,
      postPercentage: postL1,
      deltaPercentage: postL1 - preL1,
      preEarned: preSub?.processScores?.level1?.earned,
      preTotal: preSub?.processScores?.level1?.total,
      postEarned: postSub?.processScores?.level1?.earned,
      postTotal: postSub?.processScores?.level1?.total,
      description: '鎖定時間、人物、關鍵名詞與文句中明確呈現的事實細節。',
    };

    const level2: LevelComparisonItem = {
      level: 'level2',
      name: '第二層：直接推論',
      shortName: 'L2 直接推論',
      prePercentage: preL2,
      postPercentage: postL2,
      deltaPercentage: postL2 - preL2,
      preEarned: preSub?.processScores?.level2?.earned,
      preTotal: preSub?.processScores?.level2?.total,
      postEarned: postSub?.processScores?.level2?.earned,
      postTotal: postSub?.processScores?.level2?.total,
      description: '串聯相鄰文句線索，歸納出隱含的前後因果關係與角色意圖。',
    };

    const level3: LevelComparisonItem = {
      level: 'level3',
      name: '第三層：詮釋整合觀點',
      shortName: 'L3 詮釋整合',
      prePercentage: preL3,
      postPercentage: postL3,
      deltaPercentage: postL3 - preL3,
      preEarned: preSub?.processScores?.level3?.earned,
      preTotal: preSub?.processScores?.level3?.total,
      postEarned: postSub?.processScores?.level3?.earned,
      postTotal: postSub?.processScores?.level3?.total,
      description: '跨越全文多個段落歸納主旨、領會作者深意與角色心理成長轉折。',
    };

    const level4: LevelComparisonItem = {
      level: 'level4',
      name: '第四層：檢驗與評估',
      shortName: 'L4 檢驗評估',
      prePercentage: preL4,
      postPercentage: postL4,
      deltaPercentage: postL4 - preL4,
      preEarned: preSub?.processScores?.level4?.earned,
      preTotal: preSub?.processScores?.level4?.total,
      postEarned: postSub?.processScores?.level4?.earned,
      postTotal: postSub?.processScores?.level4?.total,
      description: '客觀反思寫作手法、評價論點完整性並結合個人現實經驗提出獨到見解。',
    };

    const deltas: Array<{ key: 'level1' | 'level2' | 'level3' | 'level4'; delta: number }> = [
      { key: 'level1', delta: postL1 - preL1 },
      { key: 'level2', delta: postL2 - preL2 },
      { key: 'level3', delta: postL3 - preL3 },
      { key: 'level4', delta: postL4 - preL4 },
    ];
    deltas.sort((a, b) => b.delta - a.delta);

    return {
      scope: 'student',
      classId,
      className: currentClass.name,
      studentId: targetStudent?.id,
      studentName: targetStudent?.displayName || '受測學生',
      preTest: {
        id: preTest.id,
        title: preTest.title,
        submittedCount: preSub ? 1 : 0,
        avgScore: preSub?.totalScore || 0,
        maxScore: preSub?.maxScore || preTest.totalPoints,
        scaleScore: preScale,
        benchmarkName: getBenchmarkInfo(preScale).name,
      },
      postTest: {
        id: postTest.id,
        title: postTest.title,
        submittedCount: postSub ? 1 : 0,
        avgScore: postSub?.totalScore || 0,
        maxScore: postSub?.maxScore || postTest.totalPoints,
        scaleScore: postScale,
        benchmarkName: getBenchmarkInfo(postScale).name,
      },
      scaleScoreDelta: postScale - preScale,
      levels: { level1, level2, level3, level4 },
      mostImprovedLevel: deltas[0].key,
      needsFocusLevel: deltas[deltas.length - 1].key,
      pairedStudentsCount: preSub && postSub ? 1 : 0,
      studentComparisons: [],
    };
  }

  // 全班總體對照模式
  const preL1 = computeLevelAvg(classPreSubs, 'level1');
  const postL1 = computeLevelAvg(classPostSubs, 'level1');
  const preL2 = computeLevelAvg(classPreSubs, 'level2');
  const postL2 = computeLevelAvg(classPostSubs, 'level2');
  const preL3 = computeLevelAvg(classPreSubs, 'level3');
  const postL3 = computeLevelAvg(classPostSubs, 'level3');
  const preL4 = computeLevelAvg(classPreSubs, 'level4');
  const postL4 = computeLevelAvg(classPostSubs, 'level4');

  const preAvgScore =
    classPreSubs.length > 0
      ? Math.round(
          (classPreSubs.reduce((acc, s) => acc + (s.totalScore || 0), 0) / classPreSubs.length) * 10
        ) / 10
      : 0;

  const postAvgScore =
    classPostSubs.length > 0
      ? Math.round(
          (classPostSubs.reduce((acc, s) => acc + (s.totalScore || 0), 0) / classPostSubs.length) * 10
        ) / 10
      : 0;

  const preAvgScale =
    classPreSubs.length > 0
      ? Math.round(classPreSubs.reduce((acc, s) => acc + (s.scaleScore || 500), 0) / classPreSubs.length)
      : 500;

  const postAvgScale =
    classPostSubs.length > 0
      ? Math.round(classPostSubs.reduce((acc, s) => acc + (s.scaleScore || 500), 0) / classPostSubs.length)
      : 500;

  const level1: LevelComparisonItem = {
    level: 'level1',
    name: '第一層：直接提取訊息',
    shortName: 'L1 直接提取',
    prePercentage: preL1.pct,
    postPercentage: postL1.pct,
    deltaPercentage: postL1.pct - preL1.pct,
    preEarned: preL1.earned,
    preTotal: preL1.total,
    postEarned: postL1.earned,
    postTotal: postL1.total,
    description: '全班在鎖定關鍵字詞、人物身分與顯性具體事實之掌握率。',
  };

  const level2: LevelComparisonItem = {
    level: 'level2',
    name: '第二層：直接推論',
    shortName: 'L2 直接推論',
    prePercentage: preL2.pct,
    postPercentage: postL2.pct,
    deltaPercentage: postL2.pct - preL2.pct,
    preEarned: preL2.earned,
    preTotal: preL2.total,
    postEarned: postL2.earned,
    postTotal: postL2.total,
    description: '全班在串聯文意線索、辨識因果關係與代名詞指涉之推論掌握率。',
  };

  const level3: LevelComparisonItem = {
    level: 'level3',
    name: '第三層：詮釋整合觀點',
    shortName: 'L3 詮釋整合',
    prePercentage: preL3.pct,
    postPercentage: postL3.pct,
    deltaPercentage: postL3.pct - preL3.pct,
    preEarned: preL3.earned,
    preTotal: preL3.total,
    postEarned: postL3.earned,
    postTotal: postL3.total,
    description: '全班在跨段落整合篇章主旨、提煉核心寓意與人物心境之整合掌握率。',
  };

  const level4: LevelComparisonItem = {
    level: 'level4',
    name: '第四層：檢驗與評估',
    shortName: 'L4 檢驗評估',
    prePercentage: preL4.pct,
    postPercentage: postL4.pct,
    deltaPercentage: postL4.pct - preL4.pct,
    preEarned: preL4.earned,
    preTotal: preL4.total,
    postEarned: postL4.earned,
    postTotal: postL4.total,
    description: '全班在客觀評判寫作手法、反思論點適切性並連結生活經驗之評鑑掌握率。',
  };

  const deltas: Array<{ key: 'level1' | 'level2' | 'level3' | 'level4'; delta: number }> = [
    { key: 'level1', delta: postL1.pct - preL1.pct },
    { key: 'level2', delta: postL2.pct - preL2.pct },
    { key: 'level3', delta: postL3.pct - preL3.pct },
    { key: 'level4', delta: postL4.pct - preL4.pct },
  ];
  deltas.sort((a, b) => b.delta - a.delta);

  // 建立全班每位學生的前後測對照名冊
  const preSubByStudent = new Map<string, ExamSubmission>();
  classPreSubs.forEach((s) => preSubByStudent.set(s.studentId, s));

  const postSubByStudent = new Map<string, ExamSubmission>();
  classPostSubs.forEach((s) => postSubByStudent.set(s.studentId, s));

  let pairedCount = 0;
  const studentComparisons: StudentComparativeItem[] = classStudents
    .map((st) => {
      const pre = preSubByStudent.get(st.id);
      const post = postSubByStudent.get(st.id);
      const hasBoth = Boolean(pre && post);
      if (hasBoth) pairedCount++;

      const preSc = pre?.scaleScore || 500;
      const postSc = post?.scaleScore || 500;

      return {
        studentId: st.id,
        studentName: st.displayName,
        seatNumber: st.seatNumber,
        hasBoth,
        preScore: pre?.totalScore,
        postScore: post?.totalScore,
        preMaxScore: pre?.maxScore || preTest.totalPoints,
        postMaxScore: post?.maxScore || postTest.totalPoints,
        scoreDelta: pre && post ? post.totalScore - pre.totalScore : undefined,
        preScaleScore: pre ? preSc : undefined,
        postScaleScore: post ? postSc : undefined,
        scaleScoreDelta: pre && post ? postSc - preSc : undefined,
        l1Delta:
          pre?.processScores?.level1 && post?.processScores?.level1
            ? post.processScores.level1.percentage - pre.processScores.level1.percentage
            : undefined,
        l2Delta:
          pre?.processScores?.level2 && post?.processScores?.level2
            ? post.processScores.level2.percentage - pre.processScores.level2.percentage
            : undefined,
        l3Delta:
          pre?.processScores?.level3 && post?.processScores?.level3
            ? post.processScores.level3.percentage - pre.processScores.level3.percentage
            : undefined,
        l4Delta:
          pre?.processScores?.level4 && post?.processScores?.level4
            ? post.processScores.level4.percentage - pre.processScores.level4.percentage
            : undefined,
      };
    })
    .sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));

  return {
    scope: 'class',
    classId,
    className: currentClass.name,
    preTest: {
      id: preTest.id,
      title: preTest.title,
      submittedCount: classPreSubs.length,
      avgScore: preAvgScore,
      maxScore: preTest.totalPoints,
      scaleScore: preAvgScale,
      benchmarkName: getBenchmarkInfo(preAvgScale).name,
    },
    postTest: {
      id: postTest.id,
      title: postTest.title,
      submittedCount: classPostSubs.length,
      avgScore: postAvgScore,
      maxScore: postTest.totalPoints,
      scaleScore: postAvgScale,
      benchmarkName: getBenchmarkInfo(postAvgScale).name,
    },
    scaleScoreDelta: postAvgScale - preAvgScale,
    levels: { level1, level2, level3, level4 },
    mostImprovedLevel: deltas[0].key,
    needsFocusLevel: deltas[deltas.length - 1].key,
    pairedStudentsCount: pairedCount,
    studentComparisons,
  };
}
