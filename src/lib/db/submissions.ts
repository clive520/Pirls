import { ExamSubmission, StudentAnswer } from '../types';
import {
  calculatePIRLSScaleScore,
  getBenchmarkInfo,
  calculatePercentileRank,
  estimateTheoreticalPR,
} from '../pirls-norm';
import {
  ensureLocalDB,
  saveLocalDB,
  syncCloudOnBoot,
  syncToBlob,
  syncSubmissionToFirestore,
} from './core';

export async function createSubmission(
  data: Omit<ExamSubmission, 'id' | 'submittedAt'>
): Promise<ExamSubmission> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  const id = 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const now = new Date().toISOString();
  const newSubmission: ExamSubmission = {
    ...data,
    id,
    submittedAt: now,
  };
  state.submissions[id] = newSubmission;
  saveLocalDB(state);
  await syncSubmissionToFirestore(newSubmission);
  await syncToBlob(state);
  return newSubmission;
}

export async function getSubmissionById(id: string): Promise<ExamSubmission | null> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  return state.submissions[id] || null;
}

export async function getStudentSubmissions(studentId: string): Promise<ExamSubmission[]> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  return Object.values(state.submissions)
    .filter((s) => s.studentId === studentId)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
}

export async function getStudentTestSubmission(
  studentId: string,
  testPaperId: string
): Promise<ExamSubmission | null> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  for (const sub of Object.values(state.submissions)) {
    if (sub.studentId === studentId && sub.testPaperId === testPaperId) {
      return sub;
    }
  }
  return null;
}

export async function getTestPaperSubmissions(testPaperId: string): Promise<ExamSubmission[]> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  return Object.values(state.submissions)
    .filter((s) => s.testPaperId === testPaperId)
    .sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));
}

export async function getGradeSubmissions(targetGrade: number): Promise<ExamSubmission[]> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  return Object.values(state.submissions).filter((s) => s.targetGrade === targetGrade);
}

/**
 * 教師閱卷改分與複核更新：
 * 重新計算總分、百分比、四維度得分率、PIRLS 國際量尺標準分、能力基準與全班同儕 PR
 */
export async function updateSubmissionReview(
  submissionId: string,
  reviewerName: string,
  answersUpdates: Array<{
    questionId: string;
    newScore: number;
    teacherComment?: string;
  }>,
  teacherGeneralNote?: string,
  aiPedagogicalAdvice?: {
    levelAnalysis: string;
    improvementSuggestions: string[];
    actionPlan?: string;
    generatedAt?: string;
  }
): Promise<ExamSubmission | null> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  const sub = state.submissions[submissionId];
  if (!sub) return null;

  const updateMap = new Map(answersUpdates.map((u) => [u.questionId, u]));

  const processEarned = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const processTotal = { 1: 0, 2: 0, 3: 0, 4: 0 };

  const updatedAnswers: StudentAnswer[] = sub.answers.map((ans) => {
    const pLevel = ans.processLevelNumber as 1 | 2 | 3 | 4;
    processTotal[pLevel] += ans.points;

    const update = updateMap.get(ans.questionId);
    if (update !== undefined) {
      const origScore = ans.originalScore !== undefined ? ans.originalScore : ans.score;
      const validScore = Math.max(0, Math.min(ans.points, Number(update.newScore)));
      processEarned[pLevel] += validScore;
      return {
        ...ans,
        originalScore: origScore,
        score: validScore,
        isTeacherReviewed: true,
        teacherScore: validScore,
        teacherComment: update.teacherComment !== undefined ? update.teacherComment : ans.teacherComment,
      };
    } else {
      processEarned[pLevel] += ans.score;
      return ans;
    }
  });

  const totalScore = Object.values(processEarned).reduce((a, b) => a + b, 0);
  const maxScore = sub.maxScore;
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  // 重新計算量尺與常模
  const scaleScore = calculatePIRLSScaleScore(totalScore, maxScore);
  const benchmark = getBenchmarkInfo(scaleScore);
  const normPR = estimateTheoreticalPR(scaleScore);

  sub.answers = updatedAnswers;
  sub.totalScore = totalScore;
  sub.percentage = percentage;
  sub.scaleScore = scaleScore;
  sub.benchmarkKey = benchmark.key;
  sub.benchmarkName = benchmark.name;
  sub.benchmarkDescription = benchmark.description;
  sub.normPR = normPR;
  sub.processScores = {
    level1: {
      earned: processEarned[1],
      total: processTotal[1],
      percentage: processTotal[1] > 0 ? Math.round((processEarned[1] / processTotal[1]) * 100) : 0,
    },
    level2: {
      earned: processEarned[2],
      total: processTotal[2],
      percentage: processTotal[2] > 0 ? Math.round((processEarned[2] / processTotal[2]) * 100) : 0,
    },
    level3: {
      earned: processEarned[3],
      total: processTotal[3],
      percentage: processTotal[3] > 0 ? Math.round((processEarned[3] / processTotal[3]) * 100) : 0,
    },
    level4: {
      earned: processEarned[4],
      total: processTotal[4],
      percentage: processTotal[4] > 0 ? Math.round((processEarned[4] / processTotal[4]) * 100) : 0,
    },
  };
  sub.isTeacherReviewed = true;
  sub.reviewedAt = new Date().toISOString();
  sub.reviewedBy = reviewerName;
  if (teacherGeneralNote !== undefined) {
    sub.teacherGeneralNote = teacherGeneralNote;
  }
  if (aiPedagogicalAdvice !== undefined) {
    sub.aiPedagogicalAdvice = aiPedagogicalAdvice;
  }

  // 重新計算同試卷所有學生的班級同儕 PR
  const testSubs = Object.values(state.submissions).filter((s) => s.testPaperId === sub.testPaperId);
  const allScores = testSubs.map((s) => s.totalScore);
  for (const s of testSubs) {
    s.classPR = calculatePercentileRank(s.totalScore, allScores);
  }

  saveLocalDB(state);
  await syncSubmissionToFirestore(sub);
  await syncToBlob(state);
  return sub;
}

export interface TestPaperClassStats {
  submittedCount: number;
  avgScore: number;
  maxScore: number;
}

export interface TestPaperAssignmentStats {
  totalSubmitted: number;
  classes: Record<string, TestPaperClassStats>; // className -> stats
}

/**
 * 統計全站各試卷在各班級中的實際作答與繳卷概況（指派明細表專用）
 */
export async function getAssignmentStatsSummary(): Promise<Record<string, TestPaperAssignmentStats>> {
  await syncCloudOnBoot();
  const state = ensureLocalDB();
  const summary: Record<string, TestPaperAssignmentStats> = {};

  const allSubs = Object.values(state.submissions || {});

  for (const sub of allSubs) {
    const paperId = sub.testPaperId;
    if (!summary[paperId]) {
      summary[paperId] = { totalSubmitted: 0, classes: {} };
    }
    summary[paperId].totalSubmitted++;

    const cName = sub.className || '自主練習/無班級';
    if (!summary[paperId].classes[cName]) {
      summary[paperId].classes[cName] = { submittedCount: 0, avgScore: 0, maxScore: 0 };
    }
    const clsStats = summary[paperId].classes[cName];
    clsStats.submittedCount++;
    clsStats.maxScore = Math.max(clsStats.maxScore, sub.totalScore);
  }

  // 計算各班平均分
  for (const [paperId, stats] of Object.entries(summary)) {
    for (const [cName, cStats] of Object.entries(stats.classes)) {
      const matchingSubs = allSubs.filter(
        (s) => s.testPaperId === paperId && (s.className || '自主練習/無班級') === cName
      );
      if (matchingSubs.length > 0) {
        const sum = matchingSubs.reduce((acc, s) => acc + s.totalScore, 0);
        cStats.avgScore = Math.round((sum / matchingSubs.length) * 10) / 10;
      }
    }
  }

  return summary;
}
