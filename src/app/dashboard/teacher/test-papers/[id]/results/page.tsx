'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Users, Award, BookOpen, BarChart3,
  CheckCircle2, Clock, Eye, AlertCircle, Trophy,
  Globe2, TrendingUp, ShieldCheck, Printer, FileSpreadsheet,
  Edit3
} from 'lucide-react';
import { BenchmarkKey, ExamSubmission, TestPaper } from '@/lib/types';
import { getBenchmarkInfo } from '@/lib/pirls-norm';
import { ThinkingSkillsRadarCard } from '@/components/analytics';
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



  const fetchResults = async () => {
    try {
      setLoading(true);
      const json = await api.teacher.getTestSubmissions(testId);
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
  }, [testId, router]);

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

        {/* PIRLS 四維思考能力雷達與全班各層次思維能力落點分析 */}
        <div id="radar-analysis">
          <ThinkingSkillsRadarCard
            title="各層次思維能力落點分析"
            subtitle="PIRLS 四大思考歷程 全班平均掌握率與能力落點診斷"
            radarTitle="PIRLS 四個思考能力雷達"
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
                            <Link
                              href={`/dashboard/teacher/submissions/${s.id}?testId=${testPaper.id}`}
                              className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition border ${
                                s.isTeacherReviewed
                                  ? 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
                                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 shadow-xs'
                              }`}
                              title="進入專屬網頁模式進行複閱與改分（大視野、文章原文對照與 AI 協同評分）"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>{s.isTeacherReviewed ? '複閱/改分' : '閱卷/改分'}</span>
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