'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Users, Award, BookOpen, BarChart3,
  CheckCircle2, Clock, Eye, AlertCircle, Trophy,
  Globe2, TrendingUp, ShieldCheck, Printer, FileSpreadsheet,
  Edit3, HelpCircle, Sparkles, Bot, UserCheck, Hourglass,
  ArrowUpDown, ArrowUp, ArrowDown, Play, Pause, XCircle, RefreshCw
} from 'lucide-react';
import { BenchmarkKey, ExamSubmission, TestPaper, ReviewStatus } from '@/lib/types';
import { getBenchmarkInfo } from '@/lib/pirls-norm';
import { ThinkingSkillsRadarCard, PIRLSBenchmarkScaleMeter } from '@/components/analytics';
import { api, ApiClientError } from '@/lib/api-client';

interface SubmissionItem {
  id: string;
  studentId: string;
  studentName: string;
  className?: string;
  seatNumber?: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
  scaleScore: number;
  benchmarkKey?: BenchmarkKey;
  benchmarkName?: string;
  classPR?: number;
  normPR?: number;
  isTeacherReviewed?: boolean;
  teacherGeneralNote?: string;
  processScores: {
    level1: { earned: number; total: number; percentage: number };
    level2: { earned: number; total: number; percentage: number };
    level3: { earned: number; total: number; percentage: number };
    level4: { earned: number; total: number; percentage: number };
  };
  submittedAt: string;
  startedAt?: string;
  durationSeconds?: number;
  reviewStatus?: ReviewStatus;
  reviewedByRole?: 'ai' | 'teacher';
  reviewedBy?: string;
  aiReviewedAt?: string;
  hasAiPedagogicalAdvice?: boolean;
}

interface BenchmarkCategorySummary {
  count: number;
  percentage: number;
}

interface ResultsData {
  testPaper: {
    id: string;
    title: string;
    totalPoints: number;
    targetGrade: number;
    textType: string;
  };
  assignment?: {
    id: string;
    assignmentTitle: string;
    className: string;
    teacherName: string;
    dueDate?: string | null;
    deadlineType?: string;
  } | null;
  stats: {
    totalSubmitted: number;
    avgScore: number;
    maxScore: number;
    avgScaleScore?: number;
  };
  benchmarkDistribution?: {
    totalCount: number;
    avgScaleScore: number;
    advanced: BenchmarkCategorySummary;
    high: BenchmarkCategorySummary;
    intermediate: BenchmarkCategorySummary;
    low: BenchmarkCategorySummary;
    below_low: BenchmarkCategorySummary;
  };
  submissions: SubmissionItem[];
}

type SortField = 'seatNumber' | 'totalScore' | 'scaleScore' | 'durationSeconds' | 'reviewStatus' | 'studentName';
type SortDirection = 'asc' | 'desc';
type FilterStatus = 'all' | 'unreviewed' | 'ai_reviewed' | 'teacher_reviewed';

interface QueueState {
  isOpen: boolean;
  type: 'regrade' | 'advice';
  total: number;
  current: number;
  currentStudentName: string;
  currentSeat?: number;
  isPaused: boolean;
  isStopped: boolean;
  successCount: number;
  failCount: number;
  isCompleted: boolean;
}

export default function TeacherTestResultsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const testId = params.id as string;
  const assignmentId = searchParams.get('assignmentId') || undefined;

  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // 排序與篩選狀態
  const [sortField, setSortField] = useState<SortField>('seatNumber');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  // 全班批次佇列狀態
  const [queueState, setQueueState] = useState<QueueState>({
    isOpen: false,
    type: 'regrade',
    total: 0,
    current: 0,
    currentStudentName: '',
    isPaused: false,
    isStopped: false,
    successCount: 0,
    failCount: 0,
    isCompleted: false,
  });

  const stopQueueRef = useRef(false);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const json = await api.teacher.getTestSubmissions(testId, assignmentId);
      setData(json as any);
    } catch (err: any) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        router.push('/login');
        return;
      }
      setError(err.message || '載入受測成績失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (testId) {
      fetchResults();
    }
  }, [testId, assignmentId, router]);

  // 格式化作答耗時 (分秒)
  const formatDuration = (seconds?: number) => {
    if (seconds === undefined || seconds === null || seconds <= 0) return '未記錄';
    if (seconds < 60) return `${seconds} 秒`;
    const mins = Math.floor(seconds / 60);
    const rem = seconds % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs} 小時 ${remMins} 分`;
    }
    return `${mins} 分 ${rem} 秒`;
  };

  // 取得複閱三態徽章
  const getReviewStatusBadge = (item: SubmissionItem) => {
    const isTeacher =
      item.reviewStatus === 'teacher_reviewed' ||
      (item.isTeacherReviewed && item.reviewedBy !== 'AI 智慧複閱');

    const isAi =
      item.reviewStatus === 'ai_reviewed' ||
      item.reviewedBy === 'AI 智慧複閱';

    if (isTeacher) {
      return (
        <span
          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200"
          title="經授課教師親自複閱核定"
        >
          <UserCheck className="w-3 h-3 text-purple-600" />
          <span>👨‍🏫 老師複閱</span>
        </span>
      );
    }

    if (isAi) {
      return (
        <span
          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200"
          title="由 AI 依據 IEA PIRLS 給分規準逐題深度再閱核定"
        >
          <Bot className="w-3 h-3 text-sky-600" />
          <span>🤖 AI 複閱</span>
        </span>
      );
    }

    return (
      <span
        className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200"
        title="初始交卷，尚未進行 AI 或教師深度複閱"
      >
        <Hourglass className="w-3 h-3 text-amber-600" />
        <span>⏳ 未複閱</span>
      </span>
    );
  };

  // 排序切換處理
  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      // 分數與時間預設先從高到低 (desc)，其餘從低到高 (asc)
      if (field === 'totalScore' || field === 'scaleScore' || field === 'durationSeconds') {
        setSortDirection('desc');
      } else {
        setSortDirection('asc');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-500">正在統計學生受測成績、PIRLS 國際量尺與常模常態分佈...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">無法讀取成績</h2>
          <p className="text-sm text-slate-500">{error || '找不到試卷受測資料'}</p>
          <Link
            href="/dashboard/teacher/test-papers"
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>返回題庫列表</span>
          </Link>
        </div>
      </div>
    );
  }

  const { testPaper, stats, submissions, benchmarkDistribution, assignment } = data;

  // 計算全班四層次平均得分率
  const computeClassProcessAvg = (level: 'level1' | 'level2' | 'level3' | 'level4') => {
    if (submissions.length === 0) return 0;
    const totalPct = submissions.reduce(
      (acc, s) => acc + (s.processScores?.[level]?.percentage || 0),
      0
    );
    return Math.round(totalPct / submissions.length);
  };

  const l1Avg = computeClassProcessAvg('level1');
  const l2Avg = computeClassProcessAvg('level2');
  const l3Avg = computeClassProcessAvg('level3');
  const l4Avg = computeClassProcessAvg('level4');

  // 計算各狀態數量
  const countUnreviewed = submissions.filter(
    (s) =>
      s.reviewStatus === 'unreviewed' ||
      (!s.reviewStatus && !s.isTeacherReviewed && s.reviewedBy !== 'AI 智慧複閱')
  ).length;

  const countAiReviewed = submissions.filter(
    (s) => s.reviewStatus === 'ai_reviewed' || s.reviewedBy === 'AI 智慧複閱'
  ).length;

  const countTeacherReviewed = submissions.filter(
    (s) =>
      s.reviewStatus === 'teacher_reviewed' ||
      (s.isTeacherReviewed && s.reviewedBy !== 'AI 智慧複閱')
  ).length;

  const countWithoutAdvice = submissions.filter((s) => !s.hasAiPedagogicalAdvice).length;

  // 1. 篩選
  const filteredSubmissions = submissions.filter((s) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'unreviewed') {
      return (
        s.reviewStatus === 'unreviewed' ||
        (!s.reviewStatus && !s.isTeacherReviewed && s.reviewedBy !== 'AI 智慧複閱')
      );
    }
    if (filterStatus === 'ai_reviewed') {
      return s.reviewStatus === 'ai_reviewed' || s.reviewedBy === 'AI 智慧複閱';
    }
    if (filterStatus === 'teacher_reviewed') {
      return (
        s.reviewStatus === 'teacher_reviewed' ||
        (s.isTeacherReviewed && s.reviewedBy !== 'AI 智慧複閱')
      );
    }
    return true;
  });

  // 2. 排序
  const sortedSubmissions = [...filteredSubmissions].sort((a, b) => {
    let valA: any;
    let valB: any;

    if (sortField === 'seatNumber') {
      valA = a.seatNumber ?? 9999;
      valB = b.seatNumber ?? 9999;
    } else if (sortField === 'totalScore') {
      valA = a.totalScore;
      valB = b.totalScore;
    } else if (sortField === 'scaleScore') {
      valA = a.scaleScore;
      valB = b.scaleScore;
    } else if (sortField === 'durationSeconds') {
      valA = a.durationSeconds ?? 0;
      valB = b.durationSeconds ?? 0;
    } else if (sortField === 'reviewStatus') {
      const getStatusWeight = (item: SubmissionItem) => {
        if (
          item.reviewStatus === 'unreviewed' ||
          (!item.reviewStatus && !item.isTeacherReviewed && item.reviewedBy !== 'AI 智慧複閱')
        )
          return 0; // 未複閱排前
        if (item.reviewStatus === 'ai_reviewed' || item.reviewedBy === 'AI 智慧複閱') return 1;
        return 2; // 老師複閱
      };
      valA = getStatusWeight(a);
      valB = getStatusWeight(b);
    } else if (sortField === 'studentName') {
      return sortDirection === 'asc'
        ? (a.studentName || '').localeCompare(b.studentName || '', 'zh-Hant')
        : (b.studentName || '').localeCompare(a.studentName || '', 'zh-Hant');
    }

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // 啟動一鍵全班 AI 深度複閱佇列
  const startBatchRegrade = async () => {
    // 找出所有尚未 AI 複閱之試卷，嚴格按座號由小到大排序 (1號 -> 2號...)
    const targets = submissions
      .filter(
        (s) =>
          s.reviewStatus === 'unreviewed' ||
          (!s.reviewStatus && !s.isTeacherReviewed && s.reviewedBy !== 'AI 智慧複閱')
      )
      .sort((a, b) => (a.seatNumber ?? 9999) - (b.seatNumber ?? 9999));

    if (targets.length === 0) {
      alert('全班考卷皆已完成複閱（或由教師親自核定），目前沒有未複閱的試卷！');
      return;
    }

    stopQueueRef.current = false;
    setQueueState({
      isOpen: true,
      type: 'regrade',
      total: targets.length,
      current: 0,
      currentStudentName: targets[0].studentName,
      currentSeat: targets[0].seatNumber,
      isPaused: false,
      isStopped: false,
      successCount: 0,
      failCount: 0,
      isCompleted: false,
    });

    let success = 0;
    let fail = 0;

    for (let i = 0; i < targets.length; i++) {
      if (stopQueueRef.current) break;

      const student = targets[i];
      setQueueState((prev) => ({
        ...prev,
        current: i + 1,
        currentStudentName: student.studentName,
        currentSeat: student.seatNumber,
      }));

      try {
        const res = await api.teacher.autoRegradeAllSubmission(student.id);
        if (res.success && res.submission) {
          success++;
          // 即時更新該學生的本地狀態
          setData((prevData) => {
            if (!prevData) return prevData;
            return {
              ...prevData,
              submissions: prevData.submissions.map((s) =>
                s.id === student.id
                  ? {
                      ...s,
                      totalScore: res.submission.totalScore,
                      percentage: res.submission.percentage,
                      scaleScore: res.submission.scaleScore || s.scaleScore,
                      reviewStatus: 'ai_reviewed',
                      reviewedBy: 'AI 智慧複閱',
                      reviewedByRole: 'ai',
                    }
                  : s
              ),
            };
          });
        } else {
          fail++;
        }
      } catch (err) {
        console.warn(`[Batch Regrade] 學生 ${student.studentName} 批閱失敗:`, err);
        fail++;
      }

      setQueueState((prev) => ({
        ...prev,
        successCount: success,
        failCount: fail,
      }));
    }

    setQueueState((prev) => ({
      ...prev,
      isCompleted: true,
    }));

    // 重新載入最新統計數據
    await fetchResults();
    setToastMsg(`🎉 已順利完成 ${success} 位學生的 AI 深度複閱！`);
    setTimeout(() => setToastMsg(''), 4000);
  };

  // 啟動一鍵全班 AI 智能分析與建議佇列
  const startBatchAdvice = async () => {
    // 找出尚未生成建議的試卷，按座號排序
    const targets = submissions
      .filter((s) => !s.hasAiPedagogicalAdvice)
      .sort((a, b) => (a.seatNumber ?? 9999) - (b.seatNumber ?? 9999));

    if (targets.length === 0) {
      alert('全班學生皆已完成 AI 智能分析與改進建議生成！');
      return;
    }

    stopQueueRef.current = false;
    setQueueState({
      isOpen: true,
      type: 'advice',
      total: targets.length,
      current: 0,
      currentStudentName: targets[0].studentName,
      currentSeat: targets[0].seatNumber,
      isPaused: false,
      isStopped: false,
      successCount: 0,
      failCount: 0,
      isCompleted: false,
    });

    let success = 0;
    let fail = 0;

    for (let i = 0; i < targets.length; i++) {
      if (stopQueueRef.current) break;

      const student = targets[i];
      setQueueState((prev) => ({
        ...prev,
        current: i + 1,
        currentStudentName: student.studentName,
        currentSeat: student.seatNumber,
      }));

      try {
        const res = await api.teacher.getAiPedagogicalAdvice(student.id, undefined, true);
        if (res.success) {
          success++;
          setData((prevData) => {
            if (!prevData) return prevData;
            return {
              ...prevData,
              submissions: prevData.submissions.map((s) =>
                s.id === student.id ? { ...s, hasAiPedagogicalAdvice: true } : s
              ),
            };
          });
        } else {
          fail++;
        }
      } catch (err) {
        console.warn(`[Batch Advice] 學生 ${student.studentName} 生成失敗:`, err);
        fail++;
      }

      setQueueState((prev) => ({
        ...prev,
        successCount: success,
        failCount: fail,
      }));
    }

    setQueueState((prev) => ({
      ...prev,
      isCompleted: true,
    }));

    await fetchResults();
    setToastMsg(`🎉 已順利為 ${success} 位學生生成 AI 智能診斷與精進建議！`);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleStopQueue = () => {
    stopQueueRef.current = true;
    setQueueState((prev) => ({ ...prev, isStopped: true }));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* 導覽列 */}
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard/teacher/test-papers"
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              title="返回題庫清單"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold text-slate-900">{testPaper.title}</h1>
                <span className="text-xs px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-bold">
                  國小 {testPaper.targetGrade} 年級
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                  {testPaper.textType === 'literary' ? '文學性故事' : '訊息性科普'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {assignment?.className ? (
                  <span>班級：<strong className="text-slate-800">{assignment.className}</strong>（指派：{assignment.assignmentTitle}）</span>
                ) : (
                  <span>全校/公開測驗受測記錄彙整</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <a
              href={`/print/${testPaper.id}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold inline-flex items-center space-x-1 transition"
              title="A4 學生測驗紙本卷"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>A4 學生卷</span>
            </a>

            <a
              href={`/print/${testPaper.id}?showAnswers=true`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-emerald-700 font-bold inline-flex items-center space-x-1 transition"
              title="A4 教師評分解答卷 (含 Rubrics)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>A4 解答卷</span>
            </a>

            <Link
              href="/guide/score-metrics"
              target="_blank"
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-bold inline-flex items-center space-x-1 transition border border-slate-200 shadow-sm text-xs"
              title="查看各項指標與常模計算說明"
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
              <span>指標計算說明</span>
            </Link>

            <Link
              href={`/dashboard/teacher/analytics/comparative?preTestId=${testPaper.id}`}
              className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold inline-flex items-center space-x-1 transition border border-indigo-200/60 shadow-sm text-xs"
              title="以此卷為基準，展開前後測四維雷達對照"
            >
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              <span>前後測雷達對照</span>
            </Link>

            <a
              href={`/api/teacher/test-papers/${testPaper.id}/export`}
              download
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold inline-flex items-center space-x-1 transition shadow-sm"
              title="下載全班 Excel 成績與素養分析表"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>匯出 Excel</span>
            </a>
          </div>
        </div>
      </header>

      {/* 主體區塊 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1">
        {/* 指標概覽卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">已繳卷人數</div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {stats.totalSubmitted} <span className="text-sm font-normal text-slate-500">人</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">全班平均原始得分</div>
              <div className="text-2xl font-black text-indigo-600 mt-1">
                {stats.avgScore} <span className="text-sm font-normal text-slate-500">/ {stats.maxScore}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Globe2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">PIRLS 班級平均國際量尺</div>
              <div className="text-2xl font-black text-purple-700 mt-1">
                {stats.avgScaleScore || 500}
                <span className="text-xs font-bold text-slate-400 ml-1.5">
                  ({getBenchmarkInfo(stats.avgScaleScore || 500).name})
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">全班平均掌握率</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {stats.maxScore > 0 ? Math.round((stats.avgScore / stats.maxScore) * 100) : 0}
                <span className="text-sm font-normal text-slate-500"> %</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stage 5: PIRLS 五大國際基準全班分佈 */}
        {benchmarkDistribution && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <PIRLSBenchmarkScaleMeter
              scaleScore={stats.avgScaleScore || 500}
              title="一、班級平均 PIRLS 國際標準基準落點"
              showTitle={true}
              showTopCard={false}
              showBottomDescription={false}
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 pt-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span>PIRLS 五大國際基準能力 全班分佈落點</span>
                </h2>
                <p className="text-xs text-slate-500">
                  對齊 IEA 國際素養水平劃分：高級(625+)、高基準(550+)、中等(475+)、低基準(400+)、未達低基準(&lt;400)
                </p>
              </div>
              <span className="text-xs font-bold text-slate-400">
                受測樣本：{benchmarkDistribution.totalCount} 位學生
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-900">高級基準 (625+)</span>
                  <span className="text-xs font-black text-purple-700">{benchmarkDistribution.advanced.percentage}%</span>
                </div>
                <div className="text-xl font-black text-purple-900">
                  {benchmarkDistribution.advanced.count} <span className="text-xs font-normal text-purple-600">人</span>
                </div>
                <div className="w-full h-1.5 bg-purple-200 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-600 rounded-full" style={{ width: `${benchmarkDistribution.advanced.percentage}%` }} />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-900">高基準 (550~624)</span>
                  <span className="text-xs font-black text-emerald-700">{benchmarkDistribution.high.percentage}%</span>
                </div>
                <div className="text-xl font-black text-emerald-900">
                  {benchmarkDistribution.high.count} <span className="text-xs font-normal text-emerald-600">人</span>
                </div>
                <div className="w-full h-1.5 bg-emerald-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${benchmarkDistribution.high.percentage}%` }} />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-sky-900">中等基準 (475~549)</span>
                  <span className="text-xs font-black text-sky-700">{benchmarkDistribution.intermediate.percentage}%</span>
                </div>
                <div className="text-xl font-black text-sky-900">
                  {benchmarkDistribution.intermediate.count} <span className="text-xs font-normal text-sky-600">人</span>
                </div>
                <div className="w-full h-1.5 bg-sky-200 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-600 rounded-full" style={{ width: `${benchmarkDistribution.intermediate.percentage}%` }} />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-900">低基準 (400~474)</span>
                  <span className="text-xs font-black text-amber-700">{benchmarkDistribution.low.percentage}%</span>
                </div>
                <div className="text-xl font-black text-amber-900">
                  {benchmarkDistribution.low.count} <span className="text-xs font-normal text-amber-600">人</span>
                </div>
                <div className="w-full h-1.5 bg-amber-200 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-600 rounded-full" style={{ width: `${benchmarkDistribution.low.percentage}%` }} />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-100/80 border border-slate-200 space-y-1.5 col-span-2 sm:col-span-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">未達低基準 (&lt;400)</span>
                  <span className="text-xs font-black text-slate-700">{benchmarkDistribution.below_low.percentage}%</span>
                </div>
                <div className="text-xl font-black text-slate-900">
                  {benchmarkDistribution.below_low.count} <span className="text-xs font-normal text-slate-500">人</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-500 rounded-full" style={{ width: `${benchmarkDistribution.below_low.percentage}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PIRLS 學科向度四維思考能力雷達 */}
        <div id="radar-analysis">
          <ThinkingSkillsRadarCard
            title="全班學科向度思維能力落點分析"
            subtitle="PIRLS 四大思考歷程 全班平均掌握率與能力落點診斷"
            radarTitle="學科向度雷達圖 (全班平均落點)"
            data={{
              level1: {
                percentage: l1Avg,
                description: '全班在時間、人物與具體事實之直接提取平均掌握率。',
              },
              level2: {
                percentage: l2Avg,
                description: '全班在線索串聯與因果推論之直接推論平均掌握率。',
              },
              level3: {
                percentage: l3Avg,
                description: '全班在跨段落主旨與心理歸納之詮釋整合平均掌握率。',
              },
              level4: {
                percentage: l4Avg,
                description: '全班在寫作手法反思與情境連結之檢驗評估平均掌握率。',
              },
            }}
            isClassAggregate={true}
          />
        </div>

        {/* 學生名冊與作答記錄表格 */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* 標題與操作按鈕區 */}
          <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900">學生繳卷與個別報告名冊</h2>
                <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                  共 {submissions.length} 位
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                支援依座號、成績、未複閱與作答時間多維排序；點擊「閱卷/改分」可進入大視野對照複閱。
              </p>
            </div>

            {/* 兩大一鍵全班 AI 核心動作按鈕 */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={startBatchRegrade}
                disabled={countUnreviewed === 0 || queueState.isOpen}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50 flex items-center space-x-1.5"
                title="依座號順序，自動將全班未複閱的簡答題進行 AI 深度審查與核定"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-200" />
                <span>一鍵全班 AI 深度複閱 ({countUnreviewed})</span>
              </button>

              <button
                type="button"
                onClick={startBatchAdvice}
                disabled={countWithoutAdvice === 0 || queueState.isOpen}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50 flex items-center space-x-1.5"
                title="依座號順序，為尚未有診斷建議的試卷自動生成 AI 個別精進策略"
              >
                <Bot className="w-3.5 h-3.5 text-purple-200" />
                <span>一鍵全班 AI 智能分析與建議 ({countWithoutAdvice})</span>
              </button>
            </div>
          </div>

          {/* 篩選 Tag 與 快捷排序列 */}
          <div className="px-6 py-3 bg-slate-50/70 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            {/* 複閱狀態篩選 */}
            <div className="flex items-center space-x-1">
              <span className="text-slate-500 font-bold mr-1">狀態篩選:</span>
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  filterStatus === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                全部 ({submissions.length})
              </button>
              <button
                onClick={() => setFilterStatus('unreviewed')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  filterStatus === 'unreviewed'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200'
                }`}
              >
                ⏳ 未複閱 ({countUnreviewed})
              </button>
              <button
                onClick={() => setFilterStatus('ai_reviewed')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  filterStatus === 'ai_reviewed'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-white text-sky-700 hover:bg-sky-50 border border-sky-200'
                }`}
              >
                🤖 AI 複閱 ({countAiReviewed})
              </button>
              <button
                onClick={() => setFilterStatus('teacher_reviewed')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  filterStatus === 'teacher_reviewed'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white text-purple-700 hover:bg-purple-50 border border-purple-200'
                }`}
              >
                👨‍🏫 老師複閱 ({countTeacherReviewed})
              </button>
            </div>

            {/* 快捷排序按鈕 */}
            <div className="flex items-center space-x-1">
              <span className="text-slate-500 font-bold mr-1">快捷排序:</span>
              <button
                onClick={() => {
                  setSortField('seatNumber');
                  setSortDirection('asc');
                }}
                className={`px-2 py-1 rounded-lg font-bold border transition ${
                  sortField === 'seatNumber'
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                🔢 按座號
              </button>
              <button
                onClick={() => {
                  setSortField('totalScore');
                  setSortDirection('desc');
                }}
                className={`px-2 py-1 rounded-lg font-bold border transition ${
                  sortField === 'totalScore' && sortDirection === 'desc'
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                🏆 成績最高
              </button>
              <button
                onClick={() => {
                  setSortField('reviewStatus');
                  setSortDirection('asc');
                }}
                className={`px-2 py-1 rounded-lg font-bold border transition ${
                  sortField === 'reviewStatus' && sortDirection === 'asc'
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                ⏳ 未複閱優先
              </button>
              <button
                onClick={() => {
                  setSortField('reviewStatus');
                  setSortDirection('desc');
                }}
                className={`px-2 py-1 rounded-lg font-bold border transition ${
                  sortField === 'reviewStatus' && sortDirection === 'desc'
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                👨‍🏫 已複閱優先
              </button>
              <button
                onClick={() => {
                  setSortField('durationSeconds');
                  setSortDirection('desc');
                }}
                className={`px-2 py-1 rounded-lg font-bold border transition ${
                  sortField === 'durationSeconds' && sortDirection === 'desc'
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                ⏱️ 作答時間最長
              </button>
            </div>
          </div>

          {submissions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <Clock className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-sm font-medium">目前尚無學生完成這份測驗繳卷</p>
              <p className="text-xs text-slate-400">請確認是否已指派班級，並提醒學生登入後作答。</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 select-none">
                  <tr>
                    <th className="py-3.5 px-4">班級</th>

                    {/* 可點擊排序表頭：座號 */}
                    <th
                      onClick={() => handleSortToggle('seatNumber')}
                      className="py-3.5 px-3 cursor-pointer hover:bg-slate-100 transition"
                    >
                      <div className="flex items-center space-x-1">
                        <span>座號</span>
                        {sortField === 'seatNumber' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-300" />
                        )}
                      </div>
                    </th>

                    {/* 可點擊排序表頭：姓名 */}
                    <th
                      onClick={() => handleSortToggle('studentName')}
                      className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition"
                    >
                      <div className="flex items-center space-x-1">
                        <span>姓名</span>
                        {sortField === 'studentName' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-300" />
                        )}
                      </div>
                    </th>

                    {/* 可點擊排序表頭：複閱狀態 */}
                    <th
                      onClick={() => handleSortToggle('reviewStatus')}
                      className="py-3.5 px-3 text-center cursor-pointer hover:bg-slate-100 transition"
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>複閱狀態</span>
                        {sortField === 'reviewStatus' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-300" />
                        )}
                      </div>
                    </th>

                    {/* 可點擊排序表頭：作答時間 */}
                    <th
                      onClick={() => handleSortToggle('durationSeconds')}
                      className="py-3.5 px-3 text-center cursor-pointer hover:bg-slate-100 transition"
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>作答時間</span>
                        {sortField === 'durationSeconds' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-300" />
                        )}
                      </div>
                    </th>

                    {/* 可點擊排序表頭：原始分 */}
                    <th
                      onClick={() => handleSortToggle('totalScore')}
                      className="py-3.5 px-4 text-center cursor-pointer hover:bg-slate-100 transition"
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>原始分 / 滿分</span>
                        {sortField === 'totalScore' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-300" />
                        )}
                      </div>
                    </th>

                    {/* 可點擊排序表頭：PIRLS 量尺分 */}
                    <th
                      onClick={() => handleSortToggle('scaleScore')}
                      className="py-3.5 px-4 text-center cursor-pointer hover:bg-slate-100 transition"
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <span>PIRLS 量尺分</span>
                        {sortField === 'scaleScore' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-300" />
                        )}
                      </div>
                    </th>

                    <th className="py-3.5 px-4 text-center">國際基準落點</th>
                    <th className="py-3.5 px-3 text-center">班級 PR</th>
                    <th className="py-3.5 px-3 text-center">常模 PR</th>
                    <th className="py-3.5 px-2.5 text-center">L1</th>
                    <th className="py-3.5 px-2.5 text-center">L2</th>
                    <th className="py-3.5 px-2.5 text-center">L3</th>
                    <th className="py-3.5 px-2.5 text-center">L4</th>
                    <th className="py-3.5 px-5 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedSubmissions.map((s) => {
                    const bench = getBenchmarkInfo(s.scaleScore);
                    const isTeacher =
                      s.reviewStatus === 'teacher_reviewed' ||
                      (s.isTeacherReviewed && s.reviewedBy !== 'AI 智慧複閱');

                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition">
                        <td className="py-4 px-4 text-slate-600 font-medium">
                          {s.className || '未分班'}
                        </td>

                        <td className="py-4 px-3 font-mono font-bold text-slate-700">
                          {s.seatNumber !== undefined ? (
                            <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-800 flex items-center justify-center text-xs">
                              {s.seatNumber}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="py-4 px-4 font-bold text-slate-900">
                          <div className="flex items-center space-x-1.5">
                            <span>{s.studentName}</span>
                            {s.hasAiPedagogicalAdvice && (
                              <span
                                className="w-2 h-2 rounded-full bg-purple-500"
                                title="已有 AI 智能精進策略"
                              />
                            )}
                          </div>
                        </td>

                        {/* 複閱狀態三態 Badge */}
                        <td className="py-4 px-3 text-center whitespace-nowrap">
                          {getReviewStatusBadge(s)}
                        </td>

                        {/* 作答時間 */}
                        <td className="py-4 px-3 text-center font-mono text-slate-600 whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{formatDuration(s.durationSeconds)}</span>
                          </div>
                        </td>

                        {/* 原始分 */}
                        <td className="py-4 px-4 text-center font-bold text-slate-800 whitespace-nowrap">
                          <span className="text-indigo-600 font-black">{s.totalScore}</span> / {s.maxScore}
                        </td>

                        {/* 量尺分 */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <span className="font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                            {s.scaleScore}
                          </span>
                        </td>

                        {/* 基準落點 */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${bench.badgeColor}`}>
                            {bench.name}
                          </span>
                        </td>

                        <td className="py-4 px-3 text-center font-bold text-sky-700 whitespace-nowrap">
                          PR {s.classPR ?? 50}
                        </td>

                        <td className="py-4 px-3 text-center font-bold text-purple-700 whitespace-nowrap">
                          PR {s.normPR ?? 50}
                        </td>

                        <td className="py-4 px-2.5 text-center font-mono text-slate-500">
                          {s.processScores?.level1?.percentage ?? 0}%
                        </td>
                        <td className="py-4 px-2.5 text-center font-mono text-slate-500">
                          {s.processScores?.level2?.percentage ?? 0}%
                        </td>
                        <td className="py-4 px-2.5 text-center font-mono text-slate-500">
                          {s.processScores?.level3?.percentage ?? 0}%
                        </td>
                        <td className="py-4 px-2.5 text-center font-mono text-slate-500">
                          {s.processScores?.level4?.percentage ?? 0}%
                        </td>

                        {/* 操作按鈕 */}
                        <td className="py-4 px-5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center space-x-1.5">
                            <Link
                              href={`/dashboard/teacher/submissions/${s.id}?testId=${testPaper.id}`}
                              className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition border ${
                                isTeacher
                                  ? 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
                                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 shadow-xs'
                              }`}
                              title="進入大視野審題、原文對照與人工/AI 改分"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>{isTeacher ? '複閱/改分' : '閱卷/改分'}</span>
                            </Link>
                            <Link
                              href={`/dashboard/student/result/${s.id}`}
                              target="_blank"
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold transition text-xs border border-sky-100"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>診斷書</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* 全班批次佇列進度 Modal (高響應、防轉圈逾時架構) */}
      {queueState.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* 標題與圖示 */}
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm ${
                  queueState.type === 'regrade'
                    ? 'bg-gradient-to-tr from-sky-600 to-indigo-600'
                    : 'bg-gradient-to-tr from-purple-600 to-pink-600'
                }`}
              >
                {queueState.isCompleted ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <RefreshCw className="w-6 h-6 animate-spin" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {queueState.isCompleted
                    ? '🎉 全班處理完成！'
                    : queueState.type === 'regrade'
                    ? '✨ 全班 AI 深度再閱卷中...'
                    : '💡 全班 AI 智能分析與建議中...'}
                </h3>
                <p className="text-xs text-slate-500">
                  {queueState.isCompleted
                    ? '所有排隊試卷皆已依序處理完畢並寫入資料庫'
                    : '依座號依序非同步批改，避免大量呼叫逾時卡頓'}
                </p>
              </div>
            </div>

            {/* 進度條 */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>
                  進度：{queueState.current} / {queueState.total} 人
                </span>
                <span className="text-indigo-600">
                  {queueState.total > 0
                    ? Math.round((queueState.current / queueState.total) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200/80">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    queueState.type === 'regrade'
                      ? 'bg-gradient-to-r from-sky-500 to-indigo-600'
                      : 'bg-gradient-to-r from-purple-500 to-pink-600'
                  }`}
                  style={{
                    width: `${
                      queueState.total > 0
                        ? (queueState.current / queueState.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* 當前學生狀態卡 */}
            {!queueState.isCompleted && (
              <div className="bg-slate-50 border border-slate-200/70 p-3.5 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                    {queueState.currentSeat ?? queueState.current}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      正在處理：{queueState.currentStudentName}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {queueState.type === 'regrade'
                        ? '正在審核開放簡答題作答與給分規準...'
                        : '正在提煉各層次能力分析與具體精進建議...'}
                    </div>
                  </div>
                </div>
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* 完成統計 */}
            <div className="flex items-center justify-around bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-xs text-center">
              <div>
                <span className="text-slate-400 block text-[10px]">成功完成</span>
                <span className="font-black text-emerald-600 text-sm">
                  {queueState.successCount} 位
                </span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <span className="text-slate-400 block text-[10px]">略過/失敗</span>
                <span className="font-black text-rose-500 text-sm">
                  {queueState.failCount} 位
                </span>
              </div>
            </div>

            {/* 底部按鈕 */}
            <div className="pt-2 flex justify-end space-x-2">
              {!queueState.isCompleted ? (
                <button
                  type="button"
                  onClick={handleStopQueue}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center space-x-1"
                >
                  <XCircle className="w-4 h-4 text-slate-500" />
                  <span>中止佇列</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setQueueState((prev) => ({ ...prev, isOpen: false }))}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm"
                >
                  完成並關閉
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast 提示通知 */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 text-xs font-bold flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
