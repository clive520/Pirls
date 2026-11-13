'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Award, ArrowLeft, CheckCircle2, AlertCircle, Sparkles,
  BookOpen, Lightbulb, Compass, Share2, Printer, Trophy,
  TrendingUp, Users, Globe2, ShieldCheck, Check, X, HelpCircle, FileText, MessageSquare, BarChart3,
  Target, Eye
} from 'lucide-react';
import { ExamSubmission, TestPaper } from '@/lib/types';
import { ThinkingSkillsRadarCard, PIRLSBenchmarkScaleMeter } from '@/components/analytics';
import { api, ApiClientError } from '@/lib/api-client';
import {
  calculatePIRLSScaleScore,
  getBenchmarkInfo,
  estimateTheoreticalPR,
} from '@/lib/pirls-norm';

export default function StudentResultPage() {
  const router = useRouter();
  const params = useParams();
  const submissionId = params.id as string;

  const [submission, setSubmission] = useState<ExamSubmission | null>(null);
  const [testPaper, setTestPaper] = useState<TestPaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLargeText, setIsLargeText] = useState(false);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        setLoading(true);
        const data = await api.student.getSubmission(submissionId);
        setSubmission(data.submission);
        setTestPaper(data.testPaper);
      } catch (err: any) {
        if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
          router.push('/login');
          return;
        }
        setErrorMsg(err.message || '載入報告失敗');
      } finally {
        setLoading(false);
      }
    };
    if (submissionId) fetchResult();
  }, [submissionId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">
        正在匯整您的 PIRLS 素養診斷報告與國際量尺常模...
      </div>
    );
  }

  if (errorMsg || !submission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl border border-red-200 text-center max-w-md space-y-3">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">無法載入報告</h3>
          <p className="text-xs text-slate-500">{errorMsg || '報告不存在'}</p>
          <Link
            href="/dashboard/student"
            className="inline-block mt-4 px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-700"
          >
            返回個人工作台
          </Link>
        </div>
      </div>
    );
  }

  // PIRLS 國際量尺與五大基準計算
  const scaleScore =
    submission.scaleScore ??
    calculatePIRLSScaleScore(submission.totalScore, submission.maxScore);
  const benchmark = getBenchmarkInfo(scaleScore);
  const classPR = submission.classPR ?? 50;
  const normPR = submission.normPR ?? estimateTheoreticalPR(scaleScore);

  // 保障各層次個人得分 (earned / total / percentage) 100% 完整計算，防止缺少 earned/total 導致無法顯示
  const calcFromAnswers = (lvlNum: number, lvlStr: string) => {
    if (!submission.answers || submission.answers.length === 0) return null;
    let earned = 0;
    let total = 0;
    submission.answers.forEach((ans) => {
      const q = testPaper?.questions?.find((item) => item.id === ans.questionId);
      const match =
        ans.processLevelNumber === lvlNum ||
        ans.processLevel === lvlStr ||
        q?.processLevelNumber === lvlNum ||
        q?.processLevel === lvlStr;
      if (match) {
        earned += ans.score ?? 0;
        total += ans.maxScore ?? (q?.points || 0);
      }
    });
    if (total === 0) return null;
    return {
      earned,
      total,
      percentage: total > 0 ? Math.round((earned / total) * 100) : 0,
    };
  };

  const ps = submission.processScores || ({} as any);
  const l1Fallback = calcFromAnswers(1, 'direct_extract');
  const l2Fallback = calcFromAnswers(2, 'inference');
  const l3Fallback = calcFromAnswers(3, 'interpret');
  const l4Fallback = calcFromAnswers(4, 'evaluate');

  const safeProcessScores = {
    level1: {
      earned: ps.level1?.earned ?? l1Fallback?.earned ?? 0,
      total: ps.level1?.total ?? l1Fallback?.total ?? (l1Fallback?.earned ?? 0),
      percentage: ps.level1?.percentage ?? l1Fallback?.percentage ?? 0,
      description: '鎖定時間、人物、關鍵名詞與文句中明確呈現的事實細節。',
    },
    level2: {
      earned: ps.level2?.earned ?? l2Fallback?.earned ?? 0,
      total: ps.level2?.total ?? l2Fallback?.total ?? (l2Fallback?.earned ?? 0),
      percentage: ps.level2?.percentage ?? l2Fallback?.percentage ?? 0,
      description: '串聯相鄰文句線索，歸納出隱含的前後因果關係與角色意圖。',
    },
    level3: {
      earned: ps.level3?.earned ?? l3Fallback?.earned ?? 0,
      total: ps.level3?.total ?? l3Fallback?.total ?? (l3Fallback?.earned ?? 0),
      percentage: ps.level3?.percentage ?? l3Fallback?.percentage ?? 0,
      description: '跨越全文多個段落歸納主旨、領會作者深意與角色心理成長轉折。',
    },
    level4: {
      earned: ps.level4?.earned ?? l4Fallback?.earned ?? 0,
      total: ps.level4?.total ?? l4Fallback?.total ?? (l4Fallback?.earned ?? 0),
      percentage: ps.level4?.percentage ?? l4Fallback?.percentage ?? 0,
      description: '客觀反思寫作手法、評價論點完整性並結合個人現實經驗提出獨到見解。',
    },
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between print:bg-white">
      {/* 頂部導航 */}
      <header className="bg-white border-b sticky top-0 z-20 print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard/student"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-slate-900">PIRLS 個人素養診斷報告</h1>
              <p className="text-xs text-slate-500 flex items-center space-x-1.5 mt-0.5">
                <span>{submission.studentName} 同學</span>
                <span>•</span>
                <span>《{submission.testPaperTitle}》</span>
                {submission.durationSeconds ? (
                  <>
                    <span>•</span>
                    <span className="font-mono text-slate-600 font-medium">
                      ⏱️ 作答時間：{Math.floor(submission.durationSeconds / 60)}分{submission.durationSeconds % 60}秒
                    </span>
                  </>
                ) : null}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsLargeText(!isLargeText)}
              className={`px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-bold inline-flex items-center space-x-1.5 transition shadow-xs ${
                isLargeText
                  ? 'bg-amber-100 text-amber-950 border-amber-300 ring-2 ring-amber-300/60'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
              title="切換字體放大模式，讓報告文字更舒適易讀"
            >
              <span>{isLargeText ? '🔍 特大字體 (已啟用)' : '🔍 護眼放大'}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold inline-flex items-center space-x-1"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>列印能力證書</span>
            </button>
            <Link
              href="/dashboard/student"
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs sm:text-sm font-bold hover:bg-indigo-700 transition shadow-xs"
            >
              完成返回
            </Link>
          </div>
        </div>
      </header>

      {/* 主體報告內容 */}
      <main className={`flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-7 transition-all ${isLargeText ? 'text-lg' : ''}`}>
        {/* 成績大總覽卡片 */}
        <div className="bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2.5 text-center md:text-left">
            <span className="inline-flex items-center px-3.5 py-1 rounded-full bg-white/20 text-xs sm:text-sm font-semibold">
              <Sparkles className="w-4 h-4 mr-1.5" />
              PIRLS 閱讀素養認證完成
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black">
              {submission.percentage >= 80 ? '表現卓越！思辨之星！' : submission.percentage >= 60 ? '表現良好！持續進步！' : '奠定基礎！再接再厲！'}
            </h2>
            <p className="text-sm sm:text-base text-sky-100 max-w-lg leading-relaxed">
              完成《{submission.testPaperTitle}》測驗，已成功對齊 PIRLS 國際量尺與常模常態分佈。
            </p>
          </div>

          <div className="flex items-center space-x-5 bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 flex-shrink-0">
            <div className="text-center px-3">
              <div className="text-3xl sm:text-4xl font-black text-amber-300">
                {submission.totalScore}
              </div>
              <div className="text-xs sm:text-sm text-sky-100 mt-1 font-medium">總得分 (滿分 {submission.maxScore})</div>
            </div>
            <div className="w-px h-12 bg-white/20" />
            <div className="text-center px-3">
              <div className="text-3xl sm:text-4xl font-black text-white">
                {submission.percentage}%
              </div>
              <div className="text-xs sm:text-sm text-sky-100 mt-1 font-medium">整體掌握率</div>
            </div>
          </div>
        </div>

        {/* 教師親自複閱核定與總評通知 */}
        {submission.isTeacherReviewed && (
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-purple-50 via-indigo-50 to-sky-50 border border-purple-200 text-purple-900 flex items-start space-x-4 shadow-xs">
            <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 text-lg shadow-sm">
              👨‍🏫
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="font-bold text-base sm:text-lg text-purple-950">
                  本份評量已由授課教師親自複閱核定 ({submission.reviewedBy || '授課教師'})
                </strong>
                <span className="text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-full bg-purple-200/90 text-purple-900">
                  人工複閱完成
                </span>
              </div>
              {submission.teacherGeneralNote ? (
                <div className="text-purple-950 leading-relaxed font-semibold bg-white/85 p-4 rounded-2xl border border-purple-200 text-sm sm:text-base mt-2 shadow-2xs">
                  <div className="text-xs font-bold text-purple-700 mb-1">導師總評語與學習叮嚀：</div>
                  「{submission.teacherGeneralNote}」
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-purple-700">
                  教師已針對個別開放簡答題完成細膩審查，下方可查看老師的個別批註與核定給分。
                </p>
              )}
            </div>
          </div>
        )}

        {/* AI 深度再閱卷核定通知 */}
        {!submission.isTeacherReviewed && submission.reviewStatus === 'ai_reviewed' && (
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-sky-50 via-indigo-50 to-blue-50 border border-sky-200 text-sky-950 flex items-start space-x-4 shadow-xs">
            <div className="w-11 h-11 rounded-2xl bg-sky-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 text-lg shadow-sm">
              🤖
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="font-bold text-base sm:text-lg text-sky-950">
                  本份評量已由 IEA PIRLS AI 閱卷專家完成深度再閱核定
                </strong>
                <span className="text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-full bg-sky-200/90 text-sky-900">
                  AI 複閱完成
                </span>
              </div>
              <p className="text-xs sm:text-sm text-sky-800 leading-relaxed">
                開放簡答題已逐題依據 IEA PIRLS 國際雙位數給分規準 (Rubrics) 完成深度語意審核與分數校準。
              </p>
            </div>
          </div>
        )}

        {/* Stage 5: PIRLS 國際標準量尺與常模落點認證卡片 */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">PIRLS 國際標準量尺與常模能力證書</h3>
                <p className="text-xs sm:text-sm text-slate-500">對齊 IEA 國際標準：平均值 500 分、標準差 100 分</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/guide/score-metrics"
                target="_blank"
                className="px-3 py-1.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-xs sm:text-sm font-bold text-slate-700 hover:text-blue-600 transition shadow-xs inline-flex items-center gap-1.5"
                title="查看 PIRLS 國際量尺、PR 值與常模各項指標是如何產生的"
              >
                <HelpCircle className="w-4 h-4 text-blue-600" />
                <span>各項指標如何產生？</span>
              </Link>
              <span className={`px-3.5 py-1.5 rounded-xl font-bold text-xs sm:text-sm shadow-xs ${benchmark.badgeColor}`}>
                {benchmark.name} ({benchmark.enName})
              </span>
            </div>
          </div>

          {/* PIRLS 國際標準基準落點儀表 (彩色光譜條、常模 500、學生落點與班級平均) */}
          <PIRLSBenchmarkScaleMeter
            scaleScore={scaleScore}
            classAvgScaleScore={submission.classAvgScaleScore}
            showTitle={false}
            showTopCard={true}
            showBottomDescription={false}
            isEyeCareLargeFont={isLargeText}
          />

          {/* 量尺分數與同儕常模 PR 數據展示 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 量尺分數 */}
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-slate-600">
                  <span>PIRLS 國際量尺分數</span>
                  <Globe2 className="w-4 h-4 text-sky-500" />
                </div>
                <div className="text-3xl sm:text-4xl font-black text-slate-900 mt-2">
                  {scaleScore} <span className="text-sm font-bold text-slate-500">分</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/80 text-xs sm:text-sm text-slate-600">
                基準等級區間：{benchmark.minScore} ～ {benchmark.maxScore >= 1000 ? '以上' : benchmark.maxScore} 分
              </div>
            </div>

            {/* 班級百分等級 PR */}
            <div className="p-5 sm:p-6 rounded-2xl bg-sky-50/60 border border-sky-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-sky-800">
                  <span>班級同儕排名 (Class PR)</span>
                  <Users className="w-4 h-4 text-sky-600" />
                </div>
                <div className="text-3xl sm:text-4xl font-black text-sky-900 mt-2">
                  PR {classPR}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-sky-100 text-xs sm:text-sm text-sky-800">
                超越班上約 <strong className="font-bold">{classPR}%</strong> 的受測同儕
              </div>
            </div>

            {/* 全國/國際常模 PR */}
            <div className="p-5 sm:p-6 rounded-2xl bg-purple-50/60 border border-purple-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-purple-800">
                  <span>國際常模對照 (Norm PR)</span>
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-3xl sm:text-4xl font-black text-purple-900 mt-2">
                  PR {normPR}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-purple-100 text-xs sm:text-sm text-purple-800">
                相當於國際常態分佈前 <strong className="font-bold">{100 - normPR}%</strong> 的水平
              </div>
            </div>
          </div>

          {/* 官方素養能力描述與教學鷹架建議 */}
          <div className="p-5 sm:p-6 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-3.5">
            <div className="flex items-start space-x-2.5">
              <ShieldCheck className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-bold text-amber-950">
                  【{benchmark.name}】官方閱讀能力描述指標：
                </h4>
                <p className="text-sm sm:text-base text-amber-950 leading-relaxed font-medium">
                  {benchmark.description}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-amber-200/70 flex items-start space-x-2.5 text-sm sm:text-base text-amber-950">
              <Compass className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="text-amber-950">未來自主學習與閱讀策略建議：</strong>
                <span className="font-medium">{benchmark.instructionalFocus}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 學科向度雷達圖 (個人 vs 班級) 與層次落點解析 */}
        <ThinkingSkillsRadarCard
          data={safeProcessScores}
          classData={submission.classProcessScores}
        />

        {/* 🎓 老師複閱指導：四層次思維能力落點分析與閱讀具體改進建議 */}
        {submission.aiPedagogicalAdvice && (
          <div className="bg-white rounded-3xl border border-purple-200 shadow-sm p-6 sm:p-8 space-y-6 bg-gradient-to-br from-white via-purple-50/20 to-indigo-50/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-100 pb-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md flex-shrink-0">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span>我的閱讀成長教練指南：思維落點與破關祕技</span>
                    <span className="text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900">
                      AI 深度診斷
                    </span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    針對你在《{submission.testPaperTitle}》中的作答與課文線索為你量身打造
                  </p>
                </div>
              </div>
            </div>

            {/* 1. 思維風格超能力與解鎖技能標籤 */}
            {submission.aiPedagogicalAdvice.thinkingProfile && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 超能力 */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-200/90 flex items-start space-x-3.5 shadow-2xs">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md">
                        本次思維超能力
                      </span>
                      <span className="text-base font-black text-amber-950">
                        【{submission.aiPedagogicalAdvice.thinkingProfile.superpower?.title}】
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-amber-900 leading-relaxed font-medium">
                      {submission.aiPedagogicalAdvice.thinkingProfile.superpower?.description}
                    </p>
                  </div>
                </div>

                {/* 待解鎖高階技能 */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50/60 border border-indigo-200/90 flex items-start space-x-3.5 shadow-2xs">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                    <Target className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-indigo-800 bg-indigo-100/90 px-2 py-0.5 rounded-md">
                        正在解鎖技能
                      </span>
                      <span className="text-base font-black text-indigo-950">
                        【{submission.aiPedagogicalAdvice.thinkingProfile.unlockingSkill?.title}】
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-indigo-900 leading-relaxed font-medium">
                      {submission.aiPedagogicalAdvice.thinkingProfile.unlockingSkill?.description}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 2. 神探辦案：錯題原答鏡像對照 (核心亮點) */}
            {submission.aiPedagogicalAdvice.questionMirrors &&
              submission.aiPedagogicalAdvice.questionMirrors.length > 0 && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                      <Eye className="w-5 h-5 text-purple-700" />
                      <span>神探辦案：我的錯題對照鏡 ({submission.aiPedagogicalAdvice.questionMirrors.length} 題)</span>
                    </h4>
                    <span className="text-xs text-slate-400">
                      看懂自己寫了什麼，找出課文線索
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    {submission.aiPedagogicalAdvice.questionMirrors.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200/90 space-y-3 text-sm sm:text-base"
                      >
                        <div className="font-bold text-slate-900 flex items-baseline gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-purple-100 text-purple-900 font-extrabold text-xs flex-shrink-0">
                            第 {m.questionNumber} 題
                          </span>
                          <span className="text-slate-800">{m.prompt}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          {/* 學生作答 */}
                          <div className="p-3.5 rounded-xl bg-white border border-rose-100/90 space-y-1">
                            <span className="text-xs font-bold text-rose-700 block">
                              ✏️ 你當時寫的：
                            </span>
                            <p className="text-slate-800 font-mono italic leading-relaxed text-xs sm:text-sm">
                              {m.studentAnswer}
                            </p>
                          </div>

                          {/* 課文線索 */}
                          <div className="p-3.5 rounded-xl bg-white border border-sky-100/90 space-y-1">
                            <span className="text-xs font-bold text-sky-700 block">
                              🔍 課文藏的秘密線索：
                            </span>
                            <p className="text-slate-800 leading-relaxed font-medium text-xs sm:text-sm">
                              {m.clueFromArticle}
                            </p>
                          </div>
                        </div>

                        {/* 下次升級指引 */}
                        <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 flex items-start space-x-2.5">
                          <Sparkles className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <div className="leading-relaxed text-xs sm:text-sm">
                            <strong className="font-bold text-emerald-900">🚀 下次這樣寫拿滿分：</strong>
                            <span className="font-medium ml-1">{m.howToImprove}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* 3. 答題通關小祕技 (Tactics Tips) */}
            {submission.aiPedagogicalAdvice.tacticsTips &&
              submission.aiPedagogicalAdvice.tacticsTips.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm sm:text-base font-bold text-indigo-950 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-indigo-700" />
                    <span>答題通關小祕技：</span>
                  </h4>
                  <div className="space-y-2.5">
                    {submission.aiPedagogicalAdvice.tacticsTips.map((tip, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 sm:p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs sm:text-sm text-slate-800 leading-relaxed flex items-start space-x-3"
                      >
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                          {idx + 1}
                        </span>
                        <span className="flex-1 font-medium">{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* 4. 四層次落點綜合解析 */}
            {submission.aiPedagogicalAdvice.levelAnalysis && (
              <div className="p-5 rounded-2xl bg-purple-50/70 border border-purple-200/80 text-sm sm:text-base text-slate-900 leading-relaxed space-y-2">
                <div className="font-bold text-purple-950 flex items-center gap-2 text-sm sm:text-base">
                  <BarChart3 className="w-5 h-5 text-purple-700" />
                  <span>各層次思維能力落點綜合解析：</span>
                </div>
                <p className="indent-4 font-medium text-slate-900 text-sm sm:text-base leading-relaxed">
                  {submission.aiPedagogicalAdvice.levelAnalysis}
                </p>
              </div>
            )}

            {/* 5. 舊版相容改進建議清單 */}
            {(!submission.aiPedagogicalAdvice.questionMirrors || submission.aiPedagogicalAdvice.questionMirrors.length === 0) &&
              (!submission.aiPedagogicalAdvice.tacticsTips || submission.aiPedagogicalAdvice.tacticsTips.length === 0) &&
              submission.aiPedagogicalAdvice.improvementSuggestions &&
              submission.aiPedagogicalAdvice.improvementSuggestions.length > 0 && (
                <div className="space-y-3.5">
                  <h4 className="text-sm sm:text-base font-bold text-indigo-950 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-indigo-700" />
                    <span>給你的具體閱讀策略與改進建議事項：</span>
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    {submission.aiPedagogicalAdvice.improvementSuggestions.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 sm:p-5 rounded-2xl bg-white border border-indigo-100/90 shadow-2xs flex items-start space-x-3.5 text-sm sm:text-base leading-relaxed"
                      >
                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                          {idx + 1}
                        </span>
                        <span className="text-slate-900 font-medium">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* 6. 本週專屬閱讀微任務 / 行動計畫 */}
            {(submission.aiPedagogicalAdvice.microAction || submission.aiPedagogicalAdvice.actionPlan) && (
              <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-sm sm:text-base text-amber-950 flex items-start space-x-3">
                <Compass className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="block font-bold text-amber-950 text-sm sm:text-base">📝 本週我的 1 個閱讀微任務：</strong>
                  <span className="leading-relaxed font-medium">
                    {submission.aiPedagogicalAdvice.microAction || submission.aiPedagogicalAdvice.actionPlan}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 逐題深入批改與三明治正向回饋 */}
        <section className="space-y-5">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2.5">
            <CheckCircle2 className="w-6 h-6 text-indigo-600" />
            <span>逐題檢視與 AI 正向三明治回饋 ({submission.answers.length} 題)</span>
          </h3>

          <div className="space-y-6">
            {submission.answers.map((ans) => {
              const originalQ = testPaper?.questions?.find((q) => q.id === ans.questionId);
              const isFullScore = ans.score === ans.maxScore;

              return (
                <div
                  key={ans.questionId}
                  className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-center space-x-2.5">
                      <span className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold text-xs sm:text-sm flex items-center justify-center">
                        {ans.questionNumber}
                      </span>
                      <span className="text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                        {ans.type === 'multiple_choice' ? '選擇題' : '開放簡答題'}
                      </span>
                      {ans.code && (
                        <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">
                          IEA Code: {ans.code}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2.5">
                      <span
                        className={`text-xs sm:text-sm font-black px-3 py-1 rounded-xl shadow-2xs ${
                          isFullScore
                            ? 'bg-emerald-100 text-emerald-800'
                            : ans.score > 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        得分：{ans.score} / {ans.maxScore} 分
                      </span>
                      {ans.isTeacherReviewed && (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 flex items-center gap-1 border border-purple-200" title="經授課教師親自複核">
                          👨‍🏫 老師複閱核定
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 題幹 (字級放大至 16px~18px 閱讀最舒適) */}
                  <h4 className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
                    {originalQ?.prompt || `第 ${ans.questionNumber} 題`}
                  </h4>

                  {/* 題型細節剖析與對比 */}
                  {ans.type === 'multiple_choice' ? (
                    <div className="space-y-4">
                      {/* 快速對答結果狀態條 */}
                      <div
                        className={`p-4 rounded-2xl border text-sm sm:text-base flex flex-wrap items-center justify-between gap-3 ${
                          isFullScore
                            ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950 font-medium'
                            : 'bg-rose-50/90 border-rose-200 text-rose-950 font-medium'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          {isFullScore ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                          )}
                          <span className="font-bold">
                            {isFullScore
                              ? '回答正確！精準鎖定文本依據與合理因果推論'
                              : '回答錯誤，請參考下方各選項剖析以釐清盲點'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 text-sm font-semibold">
                          <span>
                            你的選擇：
                            <strong className={`font-black ml-1 ${isFullScore ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {ans.studentAnswer ? `選項 ${ans.studentAnswer}` : '未填答'}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            正確答案：
                            <strong className="font-black text-emerald-700 ml-1">
                              選項 {originalQ?.correctAnswerLabel || (originalQ?.options?.find(o => o.isCorrect)?.label) || '—'}
                            </strong>
                          </span>
                        </div>
                      </div>

                      {/* 選項清單、學生選擇標記與干擾項辨析 */}
                      <div className="space-y-2.5 pt-1">
                        <div className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1.5">
                          <HelpCircle className="w-4 h-4 text-indigo-500" />
                          <span>選項內容與不合理干擾項辨析：</span>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {originalQ?.options && originalQ.options.length > 0 ? (
                            originalQ.options.map((opt) => {
                              const isStudentChoice =
                                ans.studentAnswer?.trim().toUpperCase() === opt.label.toUpperCase();
                              const isCorrectOption = Boolean(
                                opt.isCorrect ||
                                (originalQ?.correctAnswerLabel &&
                                  originalQ.correctAnswerLabel.toUpperCase() === opt.label.toUpperCase())
                              );

                              let cardStyle = 'border-slate-200 bg-white hover:bg-slate-50/60 text-slate-800';
                              let badgeComponent = null;

                              if (isStudentChoice && isCorrectOption) {
                                cardStyle = 'border-2 border-emerald-500 bg-emerald-50/70 shadow-xs';
                                badgeComponent = (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-600 text-white shadow-xs">
                                    <Check className="w-3.5 h-3.5 stroke-[3]" /> 你的選擇（正確答案）
                                  </span>
                                );
                              } else if (isStudentChoice && !isCorrectOption) {
                                cardStyle = 'border-2 border-rose-400 bg-rose-50/70 shadow-xs';
                                badgeComponent = (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-rose-600 text-white shadow-xs">
                                    <X className="w-3.5 h-3.5 stroke-[3]" /> 你的選擇（不合理干擾項）
                                  </span>
                                );
                              } else if (!isStudentChoice && isCorrectOption) {
                                cardStyle = 'border-2 border-emerald-400/90 bg-emerald-50/40';
                                badgeComponent = (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <Check className="w-3.5 h-3.5 stroke-[2.5]" /> 標準正解
                                  </span>
                                );
                              }

                              return (
                                <div
                                  key={opt.label}
                                  className={`p-4 rounded-2xl border text-sm sm:text-base transition-all ${cardStyle}`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start space-x-3 flex-1">
                                      <span
                                        className={`w-7 h-7 rounded-full font-bold text-sm flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs ${
                                          isCorrectOption
                                            ? 'bg-emerald-600 text-white'
                                            : isStudentChoice
                                            ? 'bg-rose-500 text-white'
                                            : 'bg-slate-100 text-slate-700'
                                        }`}
                                      >
                                        {opt.label}
                                      </span>
                                      <div className="space-y-1.5 flex-1">
                                        <div className="text-slate-900 font-medium leading-relaxed">
                                          {opt.text}
                                        </div>
                                        {opt.imageUrl && (
                                          <div className="mt-2.5">
                                            <img
                                              src={opt.imageUrl}
                                              alt={`選項 ${opt.label}`}
                                              className="max-h-32 rounded-xl border border-slate-200 object-contain"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {badgeComponent && (
                                      <div className="flex-shrink-0">
                                        {badgeComponent}
                                      </div>
                                    )}
                                  </div>

                                  {/* 選項干擾盲點或正解理由解析 */}
                                  {opt.explanation && (
                                    <div
                                      className={`mt-3 pt-2.5 border-t text-xs sm:text-sm flex items-start gap-2 ${
                                        isCorrectOption
                                          ? 'border-emerald-200 text-emerald-950 bg-emerald-50/60 -mx-4 -mb-4 p-3 rounded-b-2xl'
                                          : isStudentChoice
                                          ? 'border-rose-200 text-rose-950 bg-rose-50/60 -mx-4 -mb-4 p-3 rounded-b-2xl'
                                          : 'border-slate-100 text-slate-600'
                                      }`}
                                    >
                                      <span className="font-bold flex-shrink-0">
                                        {isCorrectOption ? '🎯 文本證據依據：' : '💡 為何是不合理答案：'}
                                      </span>
                                      <span className="leading-relaxed font-medium">{opt.explanation}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm sm:text-base text-slate-800">
                              學生回答：<strong>{ans.studentAnswer}</strong> • 標準正解：<strong>{originalQ?.correctAnswerLabel}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* 開放簡答題 / 問答深層思考題 */
                    <div className="space-y-4">
                      {/* 學生作答原貌 (大字好讀) */}
                      <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 text-sm sm:text-base text-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-500" />
                            你的回答內容：
                          </span>
                          <span className="text-xs sm:text-sm text-slate-400 font-medium">
                            {ans.studentAnswer ? `${ans.studentAnswer.length} 字` : '未填寫'}
                          </span>
                        </div>
                        <div className="font-medium text-base sm:text-lg leading-relaxed bg-white p-4 rounded-xl border border-slate-200 text-slate-900 whitespace-pre-line shadow-2xs">
                          {ans.studentAnswer || '（此題未作答）'}
                        </div>
                      </div>

                      {/* 官方滿分參考答案（讓學生清楚理解滿分答題示範） */}
                      {originalQ?.rubric?.sampleFullCreditAnswer && (
                        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-indigo-50/70 border border-emerald-200 text-sm sm:text-base space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 font-bold text-emerald-950">
                              <Sparkles className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                              <span>⭐ 滿分參考答案（PIRLS 官方滿分示範答法）：</span>
                            </div>
                            <span className="text-xs sm:text-sm font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-1 rounded-full border border-emerald-200">
                              滿分 {ans.maxScore} 分範例
                            </span>
                          </div>
                          <div className="bg-white/95 p-4 rounded-xl border border-emerald-200/70 text-slate-900 leading-relaxed font-medium whitespace-pre-line shadow-xs">
                            {originalQ.rubric.sampleFullCreditAnswer}
                          </div>
                          {originalQ.rubric.samplePartialCreditAnswer && (
                            <div className="pt-2 text-xs sm:text-sm text-slate-700 leading-relaxed">
                              <strong className="text-amber-800 font-bold">部分得分範例（得 1 分）：</strong>
                              <span>{originalQ.rubric.samplePartialCreditAnswer}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 評分規準說明（讓學生清楚知道採分點與扣分盲點） */}
                      {originalQ?.rubric?.criteria && originalQ.rubric.criteria.length > 0 && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm space-y-3">
                          <div className="flex items-center space-x-2 font-bold text-slate-800 text-sm sm:text-base">
                            <BookOpen className="w-4 h-4 text-indigo-600" />
                            <span>IEA PIRLS 評分規準與給分階梯：</span>
                          </div>
                          <div className="space-y-2.5">
                            {originalQ.rubric.criteria.map((crit, idx) => {
                              const isThisScore = ans.score === crit.score;
                              return (
                                <div
                                  key={idx}
                                  className={`p-3.5 rounded-xl border transition-all ${
                                    isThisScore
                                      ? 'border-indigo-400 bg-indigo-50/80 shadow-2xs'
                                      : 'border-slate-200/80 bg-white text-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <div className="flex items-center space-x-2">
                                      <span
                                        className={`px-2 py-0.5 rounded font-black text-xs ${
                                          crit.score === ans.maxScore
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : crit.score > 0
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-rose-100 text-rose-800'
                                        }`}
                                      >
                                        {crit.score} 分標準
                                      </span>
                                      <span className="font-mono text-xs text-slate-500 font-semibold">
                                        IEA Code {crit.code}
                                      </span>
                                    </div>
                                    {isThisScore && (
                                      <span className="text-xs font-black text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-200">
                                        ✓ 本題落點判定
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-slate-800 leading-relaxed font-medium">{crit.description}</div>
                                  {crit.keyEvidenceNeeded && crit.keyEvidenceNeeded.length > 0 && (
                                    <div className="mt-2 pt-1.5 border-t border-slate-100 text-xs text-indigo-950 flex items-start gap-1 font-medium">
                                      <span className="font-bold flex-shrink-0 text-indigo-800">必備關鍵要素：</span>
                                      <span>{crit.keyEvidenceNeeded.join('、')}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 正向三明治回饋框 (大字號) */}
                  {ans.aiFeedback && (
                    <div
                      className={`rounded-2xl p-5 sm:p-6 border space-y-3.5 text-sm sm:text-base ${
                        ans.aiRegraded
                          ? 'bg-gradient-to-br from-purple-50/70 via-indigo-50/40 to-sky-50/50 border-purple-200'
                          : 'bg-sky-50/70 border-sky-200'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                        <span className="text-xs sm:text-sm font-bold flex items-center gap-1.5 text-purple-950">
                          {ans.aiRegraded ? (
                            <>
                              <Sparkles className="w-4 h-4 text-purple-600" />
                              <span>✨ AI 深度再閱審核診斷 (結合課文脈絡)</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 text-sky-600" />
                              <span className="text-slate-700">🤖 系統初評診斷指引</span>
                            </>
                          )}
                        </span>
                        {ans.aiRegraded && (
                          <span className="text-xs bg-purple-100 text-purple-900 font-bold px-2.5 py-0.5 rounded-full">
                            已完成深度複閱
                          </span>
                        )}
                      </div>

                      {/* Top: 肯定 */}
                      <div className="flex items-start space-x-2.5 text-emerald-950">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                          <strong className="text-emerald-800 font-bold">肯定亮點：</strong>
                          <span className="font-medium">{ans.aiFeedback.strength}</span>
                        </div>
                      </div>

                      {/* Middle: 盲點 */}
                      <div className="flex items-start space-x-2.5 text-amber-950">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                          <strong className="text-amber-800 font-bold">思考指引：</strong>
                          <span className="font-medium">{ans.aiFeedback.weakness}</span>
                        </div>
                      </div>

                      {/* Bottom: 示範與引導 */}
                      <div className="flex items-start space-x-2.5 text-sky-950">
                        <Lightbulb className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                          <strong className="text-sky-800 font-bold">提升小秘訣：</strong>
                          <span className="font-medium">{ans.aiFeedback.scaffoldingTip}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 教師親筆叮嚀與個別批註 */}
                  {ans.teacherComment && (
                    <div className="bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white rounded-2xl p-5 border border-purple-200 space-y-1.5 text-sm sm:text-base">
                      <div className="flex items-center space-x-2 font-bold text-purple-950">
                        <MessageSquare className="w-5 h-5 text-purple-600 flex-shrink-0" />
                        <span>👨‍🏫 授課老師親筆叮嚀與批註：</span>
                      </div>
                      <p className="text-purple-900 font-medium leading-relaxed pl-6 whitespace-pre-line">
                        {ans.teacherComment}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* 頁尾 */}
      <footer className="py-6 text-center text-xs text-slate-400 border-t bg-white print:hidden">
        PIRLS 智慧閱讀素養評量平臺 • 個人多維能力診斷書
      </footer>
    </div>
  );
}
