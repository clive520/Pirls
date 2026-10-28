'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Users, Award, BookOpen, BarChart3,
  CheckCircle2, Clock, Eye, AlertCircle, Trophy,
  Globe2, TrendingUp, ShieldCheck, Printer, FileSpreadsheet
} from 'lucide-react';
import { BenchmarkKey } from '@/lib/types';
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

  useEffect(() => {
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
                          {s.studentName}
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
                          <Link
                            href={`/dashboard/student/result/${s.id}`}
                            target="_blank"
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>診斷書</span>
                          </Link>
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
    </div>
  );
}
