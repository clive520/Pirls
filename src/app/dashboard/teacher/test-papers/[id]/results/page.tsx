'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Users, Award, BookOpen, BarChart3,
  CheckCircle2, Clock, Eye, AlertCircle, Trophy,
  Globe2, TrendingUp, ShieldCheck, Printer, FileSpreadsheet,
  Edit3, Sparkles, Check, X, RotateCcw, ChevronDown, ChevronUp,
  FileText, MessageSquare, Loader2, Save
} from 'lucide-react';
import { BenchmarkKey, ExamSubmission, TestPaper } from '@/lib/types';
import { getBenchmarkInfo } from '@/lib/pirls-norm';

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

export default function TeacherTestResultsPage() {
  const router = useRouter();
  const params = useParams();
  const testId = params.id as string;

  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // 教師閱卷與 AI 深度再閱 Modal 狀態
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<SubmissionItem | null>(null);
  const [fullSubmission, setFullSubmission] = useState<ExamSubmission | null>(null);
  const [fullTestPaper, setFullTestPaper] = useState<TestPaper | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modifiedScores, setModifiedScores] = useState<Record<string, number>>({});
  const [modifiedComments, setModifiedComments] = useState<Record<string, string>>({});
  const [teacherGeneralNote, setTeacherGeneralNote] = useState('');
  const [aiRegradeLoading, setAiRegradeLoading] = useState<Record<string, boolean>>({});
  const [aiRegradeResults, setAiRegradeResults] = useState<Record<string, any>>({});
  const [savingReview, setSavingReview] = useState(false);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/teacher/test-papers/${testId}/submissions`);
      if (res.status === 401 || res.status === 403) {
        router.push('/login');
        return;
      }
      if (!res.ok) {
        const errData = await res.json();
        setError(errData.error || '載入受測成績失敗');
        return;
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || '連線異常');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (testId) {
      fetchResults();
    }
  }, [testId, router]);

  // 開啟教師閱卷 Modal 並拉取完整作答與題本
  const openGradingModal = async (subItem: SubmissionItem) => {
    setSelectedSub(subItem);
    setShowGradingModal(true);
    setModalLoading(true);
    setAiRegradeResults({});
    setAiRegradeLoading({});

    try {
      const res = await fetch(`/api/student/submissions/${subItem.id}`);
      if (!res.ok) {
        alert('載入學生作答原卷失敗');
        setShowGradingModal(false);
        return;
      }
      const json = await res.json();
      setFullSubmission(json.submission);
      setFullTestPaper(json.testPaper);

      // 初始化分數與評語
      const scoreMap: Record<string, number> = {};
      const commentMap: Record<string, string> = {};
      for (const ans of json.submission.answers || []) {
        scoreMap[ans.questionId] = ans.score;
        commentMap[ans.questionId] = ans.teacherComment || '';
      }
      setModifiedScores(scoreMap);
      setModifiedComments(commentMap);
      setTeacherGeneralNote(json.submission.teacherGeneralNote || '');
    } catch (err: any) {
      alert('連線失敗: ' + err.message);
      setShowGradingModal(false);
    } finally {
      setModalLoading(false);
    }
  };

  // 修改分數
  const handleScoreChange = (qId: string, val: number) => {
    setModifiedScores((prev) => ({ ...prev, [qId]: val }));
  };

  // 修改評語
  const handleCommentChange = (qId: string, text: string) => {
    setModifiedComments((prev) => ({ ...prev, [qId]: text }));
  };

  // 啟動 AI 深度再閱
  const handleAiRegrade = async (questionId?: string) => {
    if (!selectedSub) return;
    if (questionId) {
      setAiRegradeLoading((prev) => ({ ...prev, [questionId]: true }));
    }
    try {
      const res = await fetch(`/api/teacher/submissions/${selectedSub.id}/ai-regrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId }),
      });
      const resData = await res.json();
      if (!res.ok) {
        alert(resData.error || 'AI 再閱卷失敗');
        return;
      }
      if (resData.results) {
        const newMap = { ...aiRegradeResults };
        for (const item of resData.results) {
          newMap[item.questionId] = item;
        }
        setAiRegradeResults(newMap);
      }
    } catch (err: any) {
      alert(err.message || '呼叫 AI 異常');
    } finally {
      if (questionId) {
        setAiRegradeLoading((prev) => ({ ...prev, [questionId]: false }));
      }
    }
  };

  // 採納 AI 建議
  const handleAdoptAi = (qId: string) => {
    const aiItem = aiRegradeResults[qId];
    if (!aiItem) return;
    setModifiedScores((prev) => ({ ...prev, [qId]: aiItem.suggestedScore }));
    if (aiItem.reason) {
      setModifiedComments((prev) => ({
        ...prev,
        [qId]: (prev[qId] ? prev[qId] + '\n' : '') + `【AI 建議採納】${aiItem.reason}`,
      }));
    }
  };

  // 儲存教師閱卷並連動重算
  const handleSaveReview = async () => {
    if (!selectedSub || !fullSubmission) return;
    setSavingReview(true);
    try {
      const answersUpdates = fullSubmission.answers.map((ans) => ({
        questionId: ans.questionId,
        newScore: modifiedScores[ans.questionId] !== undefined ? modifiedScores[ans.questionId] : ans.score,
        teacherComment: modifiedComments[ans.questionId] || '',
      }));

      const res = await fetch(`/api/teacher/submissions/${selectedSub.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answersUpdates, teacherGeneralNote }),
      });

      const resData = await res.json();
      if (!res.ok) {
        alert(resData.error || '儲存閱卷失敗');
        return;
      }

      setToastMsg('已完成教師閱卷核定！PIRLS 國際量尺與班級 PR 已重新計算更新！');
      setTimeout(() => setToastMsg(''), 4000);
      setShowGradingModal(false);
      fetchResults();
    } catch (e: any) {
      alert(e.message || '連線錯誤');
    } finally {
      setSavingReview(false);
    }
  };

  const currentEstimatedTotal = fullSubmission
    ? fullSubmission.answers.reduce((acc, ans) => {
        const score = modifiedScores[ans.questionId] !== undefined ? modifiedScores[ans.questionId] : ans.score;
        return acc + score;
      }, 0)
    : 0;

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

  const { testPaper, stats, submissions, benchmarkDistribution } = data;

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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* 頂部導航列 */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard/teacher/test-papers"
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              title="返回試卷列表"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  testPaper.textType === 'literary' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {testPaper.textType === 'literary' ? '文學性文本' : '訊息性文本'}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  國小 {testPaper.targetGrade} 年級
                </span>
              </div>
              <h1 className="text-base font-bold text-slate-900 line-clamp-1">
                《{testPaper.title}》PIRLS 國際量尺與班級常模報告
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="hidden sm:inline-block bg-slate-100 px-3 py-1.5 rounded-lg font-medium text-slate-700">
              滿分：<strong className="text-slate-900 font-bold">{testPaper.totalPoints}</strong> 分
            </span>

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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* 指標卡片區 (加入 PIRLS 國際量尺指標) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <div className="text-xs font-medium text-slate-500">班級平均原始得分</div>
              <div className="text-2xl font-black text-indigo-600 mt-1">
                {stats.avgScore} <span className="text-sm font-normal text-slate-500">/ {stats.maxScore} 分</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Globe2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">班級平均國際量尺</div>
              <div className="text-2xl font-black text-purple-600 mt-1">
                {stats.avgScaleScore || 500} <span className="text-xs font-normal text-slate-500">分 (常模 500)</span>
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

        {/* Stage 5: PIRLS 五大國際基準全班分佈 (International Benchmarks Distribution) */}
        {benchmarkDistribution && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
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
              {/* 高級基準 */}
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

              {/* 高基準 */}
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

              {/* 中等基準 */}
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

              {/* 低基準 */}
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

              {/* 未達低基準 */}
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

        {/* 四層次能力全班得分率診斷長條 */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">PIRLS 四大認知歷程 全班平均掌握率</h2>
              <p className="text-xs text-slate-500">檢視班級在直接提取、直接推論、詮釋整合、評估檢驗的素養分佈</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div className="p-4 bg-sky-50/50 rounded-2xl border border-sky-100 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-sky-800">L1 提取特定資訊</span>
                <span className="font-black text-sky-700">{l1Avg}%</span>
              </div>
              <div className="w-full h-2.5 bg-sky-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full transition-all duration-500"
                  style={{ width: `${l1Avg}%` }}
                />
              </div>
            </div>

            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-indigo-800">L2 推論主要觀點</span>
                <span className="font-black text-indigo-700">{l2Avg}%</span>
              </div>
              <div className="w-full h-2.5 bg-indigo-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${l2Avg}%` }}
                />
              </div>
            </div>

            <div className="p-4 bg-violet-50/50 rounded-2xl border border-violet-100 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-violet-800">L3 詮釋整合訊息</span>
                <span className="font-black text-violet-700">{l3Avg}%</span>
              </div>
              <div className="w-full h-2.5 bg-violet-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all duration-500"
                  style={{ width: `${l3Avg}%` }}
                />
              </div>
            </div>

            <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-rose-800">L4 檢驗評估內容形式</span>
                <span className="font-black text-rose-700">{l4Avg}%</span>
              </div>
              <div className="w-full h-2.5 bg-rose-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all duration-500"
                  style={{ width: `${l4Avg}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 學生名冊與作答記錄表格 (擴充量尺分、基準與常模 PR) */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">學生繳卷與個別報告名冊</h2>
              <p className="text-xs text-slate-500">點擊「個別診斷報告」可查看 AI 評分三明治回饋、國際能力指標與原卷細節</p>
            </div>
            <div className="text-xs text-slate-400">
              共計 {submissions.length} 筆受測記錄
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
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-5">班級</th>
                    <th className="py-3.5 px-3">座號</th>
                    <th className="py-3.5 px-5">姓名</th>
                    <th className="py-3.5 px-4 text-center">原始分 / 滿分</th>
                    <th className="py-3.5 px-4 text-center">PIRLS 量尺分</th>
                    <th className="py-3.5 px-4 text-center">國際基準落點</th>
                    <th className="py-3.5 px-3 text-center">班級 PR</th>
                    <th className="py-3.5 px-3 text-center">常模 PR</th>
                    <th className="py-3.5 px-3 text-center">L1</th>
                    <th className="py-3.5 px-3 text-center">L2</th>
                    <th className="py-3.5 px-3 text-center">L3</th>
                    <th className="py-3.5 px-3 text-center">L4</th>
                    <th className="py-3.5 px-5 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {submissions.map((s) => {
                    const bench = getBenchmarkInfo(s.scaleScore);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition">
                        <td className="py-4 px-5 text-slate-600 font-medium">
                          {s.className || '未分班'}
                        </td>
                        <td className="py-4 px-3 font-mono text-slate-500">
                          {s.seatNumber ?? '-'}
                        </td>
                        <td className="py-4 px-5 font-bold text-slate-900">
                          <div className="flex items-center space-x-1.5">
                            <span>{s.studentName}</span>
                            {s.isTeacherReviewed && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800" title="經教師親自複核">
                                👨‍🏫 已複閱
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center font-bold text-slate-800">
                          <span className="text-indigo-600 font-black">{s.totalScore}</span> / {s.maxScore}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                            {s.scaleScore}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${bench.badgeColor}`}>
                            {bench.name}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-center font-bold text-sky-700">
                          PR {s.classPR ?? 50}
                        </td>
                        <td className="py-4 px-3 text-center font-bold text-purple-700">
                          PR {s.normPR ?? 50}
                        </td>
                        <td className="py-4 px-3 text-center font-mono text-slate-500">
                          {s.processScores?.level1?.percentage ?? 0}%
                        </td>
                        <td className="py-4 px-3 text-center font-mono text-slate-500">
                          {s.processScores?.level2?.percentage ?? 0}%
                        </td>
                        <td className="py-4 px-3 text-center font-mono text-slate-500">
                          {s.processScores?.level3?.percentage ?? 0}%
                        </td>
                        <td className="py-4 px-3 text-center font-mono text-slate-500">
                          {s.processScores?.level4?.percentage ?? 0}%
                        </td>
                        <td className="py-4 px-5 text-right">
                          <div className="inline-flex items-center space-x-1.5">
                            <button
                              onClick={() => openGradingModal(s)}
                              className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition border ${
                                s.isTeacherReviewed
                                  ? 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
                                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 shadow-xs'
                              }`}
                              title="開啟教師閱卷工作台，手動改分或呼叫 AI 深度再閱"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>{s.isTeacherReviewed ? '複閱/改分' : '閱卷/改分'}</span>
                            </button>
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

      {/* Toast 提示通知 */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 text-xs font-bold flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ========================================================
          教師手動閱卷改分與 AI 深度再閱工作台 Modal
         ======================================================== */}
      {showGradingModal && selectedSub && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-inner">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-white">
                      教師線上閱卷與 AI 深度再閱工作台
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                      人機協同複閱
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    學生：<strong>{selectedSub.studentName}</strong> • {selectedSub.className || '未分班'} (座號: {selectedSub.seatNumber ?? '-'})
                  </p>
                </div>
              </div>

              {/* 實時動態分數預覽 */}
              <div className="flex items-center space-x-4">
                <div className="hidden sm:block text-right">
                  <span className="text-[10px] text-slate-400 block">複閱核定預估總分</span>
                  <div className="flex items-baseline space-x-1.5 justify-end">
                    <span className="text-xl font-black text-amber-300">{currentEstimatedTotal}</span>
                    <span className="text-xs text-slate-400">/ {selectedSub.maxScore} 分</span>
                    {currentEstimatedTotal !== selectedSub.totalScore && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        currentEstimatedTotal > selectedSub.totalScore ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {currentEstimatedTotal > selectedSub.totalScore ? `+${currentEstimatedTotal - selectedSub.totalScore}` : `${currentEstimatedTotal - selectedSub.totalScore}`} 分
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setShowGradingModal(false)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-slate-50">
              {modalLoading ? (
                <div className="py-24 text-center space-y-3">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">正在載入學生作答原卷與官方評分規準...</p>
                </div>
              ) : !fullSubmission ? (
                <div className="p-8 text-center text-slate-400 text-xs">找不到詳細作答紀錄</div>
              ) : (
                <>
                  {/* 指引橫幅 */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-sky-50 border border-indigo-100 text-xs text-slate-700 flex items-start space-x-3">
                    <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <strong className="text-indigo-950 font-bold block">
                        👨‍🏫 教師自主閱卷模式說明：
                      </strong>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        您可以在開放簡答題中點擊「<strong>✨ 呼叫 AI 深度再閱</strong>」獲取 Gemini 大模型的深度評審意見；或直接點選給分按鈕進行微調，並寫下對該學生的個別叮嚀。儲存後，系統將<strong>即時重新計算該生 PIRLS 國際量尺標準分、能力基準與全班同儕 PR 值</strong>！
                      </p>
                    </div>
                  </div>

                  {/* 題目與作答逐題列表 */}
                  <div className="space-y-5">
                    {fullSubmission.answers.map((ans) => {
                      const q = fullTestPaper?.questions?.find((item) => item.id === ans.questionId);
                      const isCR = ans.type === 'constructed_response';
                      const currentScore = modifiedScores[ans.questionId] !== undefined ? modifiedScores[ans.questionId] : ans.score;
                      const aiRes = aiRegradeResults[ans.questionId];
                      const isAiLoading = aiRegradeLoading[ans.questionId];

                      return (
                        <div
                          key={ans.questionId}
                          className={`bg-white rounded-2xl border p-5 shadow-xs transition space-y-4 ${
                            isCR ? 'border-indigo-200 ring-1 ring-indigo-500/10' : 'border-slate-200'
                          }`}
                        >
                          {/* 題幹頂部欄 */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                            <div className="flex items-center space-x-2">
                              <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                                {ans.questionNumber}
                              </span>
                              <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                {isCR ? '開放簡答題' : '選擇題'}
                              </span>
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-sky-50 text-sky-700">
                                L{ans.processLevelNumber} {ans.processLevel}
                              </span>
                              {ans.code && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                                  IEA Code: {ans.code}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-slate-500">配分：{ans.maxScore} 分</span>
                              <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                                目前得分：<strong className="text-indigo-600 font-black">{currentScore}</strong> / {ans.maxScore}
                              </span>
                            </div>
                          </div>

                          {/* 題目題幹 */}
                          <p className="text-xs font-bold text-slate-900 leading-relaxed">
                            {q?.prompt || `第 ${ans.questionNumber} 題`}
                          </p>

                          {/* 選擇題簡單檢視 */}
                          {!isCR ? (
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex items-center justify-between">
                              <div className="space-x-3">
                                <span>學生選擇：<strong className={ans.score > 0 ? 'text-emerald-700' : 'text-rose-700'}>{ans.studentAnswer || '未作答'}</strong></span>
                                <span>標準正解：<strong>{q?.correctAnswerLabel}</strong></span>
                              </div>
                              <span className={`text-[11px] font-bold ${ans.score > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                {ans.score > 0 ? '✓ 答對 (得滿分)' : '✗ 答錯 (0分)'}
                              </span>
                            </div>
                          ) : (
                            /* 開放簡答題專屬閱卷區 */
                            <div className="space-y-4 pt-1">
                              {/* 學生作答文字區塊 */}
                              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/70 text-xs space-y-1">
                                <div className="flex items-center justify-between text-amber-900 font-bold">
                                  <span className="flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5 text-amber-700" />
                                    學生原始回答：
                                  </span>
                                  <span className="text-[11px] text-amber-700 font-normal">
                                    {ans.studentAnswer ? `${ans.studentAnswer.length} 字` : '未作答'}
                                  </span>
                                </div>
                                <div className="p-3 rounded-lg bg-white border border-amber-100 text-slate-900 font-medium leading-relaxed whitespace-pre-line shadow-2xs">
                                  {ans.studentAnswer || '（此題未作答）'}
                                </div>
                              </div>

                              {/* 官方滿分示範與給分規準參考 */}
                              {q?.rubric && (
                                <details className="group text-xs bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                                  <summary className="p-3 font-bold text-slate-700 cursor-pointer flex items-center justify-between hover:bg-slate-100/60 transition">
                                    <span className="flex items-center space-x-1.5">
                                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                                      <span>查看 PIRLS 官方給分規準 (Rubrics) 與滿分參考答案</span>
                                    </span>
                                    <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
                                  </summary>
                                  <div className="p-3.5 border-t border-slate-200 bg-white space-y-2 text-slate-700">
                                    {q.rubric.sampleFullCreditAnswer && (
                                      <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-950 text-[11px] leading-relaxed">
                                        <strong className="block font-bold text-emerald-900 mb-1">⭐ 滿分參考答法：</strong>
                                        {q.rubric.sampleFullCreditAnswer}
                                      </div>
                                    )}
                                    {q.rubric.criteria && (
                                      <div className="space-y-1 pt-1">
                                        <div className="font-bold text-[11px] text-slate-600">給分階梯定義：</div>
                                        {q.rubric.criteria.map((c) => (
                                          <div key={c.score} className="text-[11px] flex items-start space-x-1.5">
                                            <span className="font-bold text-indigo-700 flex-shrink-0">【{c.score} 分】：</span>
                                            <span className="text-slate-600">{c.description}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </details>
                              )}

                              {/* AI 初評回饋摘要 */}
                              {ans.aiFeedback && (
                                <div className="p-3 rounded-xl bg-slate-100/80 text-[11px] text-slate-600 space-y-1">
                                  <div className="flex items-center justify-between text-slate-700 font-bold">
                                    <span>🤖 系統初評診斷：</span>
                                    <span>初評給分：{ans.originalScore !== undefined ? ans.originalScore : ans.score} 分</span>
                                  </div>
                                  <p><strong className="text-emerald-700">亮點：</strong>{ans.aiFeedback.strength}</p>
                                  <p><strong className="text-amber-700">待加強：</strong>{ans.aiFeedback.weakness}</p>
                                </div>
                              )}

                              {/* ✨ AI 深度再閱 (Gemini) 區塊 */}
                              <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/40 text-xs space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-1.5 font-bold text-purple-900">
                                    <Sparkles className="w-4 h-4 text-purple-600" />
                                    <span>AI 深度再閱建議 (Google Gemini 2.0)</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleAiRegrade(ans.questionId)}
                                    disabled={isAiLoading}
                                    className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] transition shadow-xs disabled:opacity-50 inline-flex items-center space-x-1"
                                  >
                                    {isAiLoading ? (
                                      <>
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        <span>分析中...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="w-3 h-3" />
                                        <span>{aiRes ? '重新深度分析' : '呼叫 AI 深度再閱'}</span>
                                      </>
                                    )}
                                  </button>
                                </div>

                                {aiRes && (
                                  <div className="p-3 rounded-lg bg-white border border-purple-200 space-y-2 animate-fadeIn">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2">
                                        <span className="font-bold text-slate-800">AI 建議核定：</span>
                                        <span className="text-base font-black text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                                          {aiRes.suggestedScore} 分
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                          (Code {aiRes.scoreCode})
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleAdoptAi(ans.questionId)}
                                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition inline-flex items-center space-x-1"
                                      >
                                        <Check className="w-3 h-3" />
                                        <span>採用 AI 建議分數 ({aiRes.suggestedScore}分)</span>
                                      </button>
                                    </div>
                                    <p className="text-[11px] text-slate-700 leading-relaxed">
                                      <strong className="text-purple-900">評審理由：</strong>
                                      {aiRes.reason}
                                    </p>
                                    {aiRes.keyEvidenceFound && aiRes.keyEvidenceFound.length > 0 && (
                                      <div className="text-[10px] text-slate-500">
                                        <strong>辨識出文本證據：</strong>
                                        <span className="text-emerald-700 font-medium ml-1">
                                          {aiRes.keyEvidenceFound.join('、')}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* 👨‍🏫 教師手動給分選擇器 */}
                              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-3">
                                <div>
                                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                                    👨‍🏫 教師最終核定給分：
                                  </label>
                                  <div className="flex flex-wrap gap-2">
                                    {Array.from({ length: ans.maxScore + 1 }, (_, idx) => idx).map((pts) => {
                                      const isSelected = currentScore === pts;
                                      return (
                                        <button
                                          key={pts}
                                          type="button"
                                          onClick={() => handleScoreChange(ans.questionId, pts)}
                                          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                                            isSelected
                                              ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400/30'
                                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                          }`}
                                        >
                                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                          <span>{pts} 分</span>
                                          {pts === ans.maxScore && <span className="text-[10px] opacity-80">(滿分)</span>}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* 教師個別評語 / 批註 */}
                                <div>
                                  <label className="block text-xs font-bold text-slate-700 mb-1">
                                    給學生的親筆評語／勉勵叮嚀（選填，將顯示於診斷書中）：
                                  </label>
                                  <input
                                    type="text"
                                    value={modifiedComments[ans.questionId] || ''}
                                    onChange={(e) => handleCommentChange(ans.questionId, e.target.value)}
                                    placeholder="例：因果轉變寫得很深刻，老師多加 1 分鼓勵你！"
                                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* 全卷導師總評語 */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2 shadow-xs">
                    <label className="block text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <MessageSquare className="w-4 h-4 text-indigo-600" />
                      <span>全卷導師綜合講評（選填，將呈現在學生報告首頁頂部）：</span>
                    </label>
                    <textarea
                      rows={2}
                      value={teacherGeneralNote}
                      onChange={(e) => setTeacherGeneralNote(e.target.value)}
                      placeholder="例：本次測驗在深層推論表現突出，值得肯定！建議持續加強第四層寫作視角的批判性反思。"
                      className="w-full text-xs rounded-xl border border-slate-300 p-3 focus:ring-2 focus:ring-indigo-500 text-slate-800"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500 hidden sm:block">
                核定後系統將自動重新加總、更新 PIRLS 國際量尺與全班同儕 PR 值。
              </div>

              <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowGradingModal(false)}
                  disabled={savingReview}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSaveReview}
                  disabled={savingReview || modalLoading}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50 inline-flex items-center space-x-1.5"
                >
                  {savingReview ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>重新計算量尺與常模中...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>確認核定並同步更新全班成績</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
