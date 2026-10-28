'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Award, ArrowLeft, CheckCircle2, AlertCircle, Sparkles,
  BookOpen, Lightbulb, Compass, Share2, Printer, Trophy,
  TrendingUp, Users, Globe2, ShieldCheck, Check, X, HelpCircle, FileText
} from 'lucide-react';
import { ExamSubmission, TestPaper } from '@/lib/types';
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

  useEffect(() => {
    const fetchResult = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/student/submissions/${submissionId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '載入報告失敗');

        setSubmission(data.submission);
        setTestPaper(data.testPaper);
      } catch (err: any) {
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (submissionId) fetchResult();
  }, [submissionId]);

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

  const { processScores } = submission;

  // PIRLS 國際量尺與五大基準計算
  const scaleScore =
    submission.scaleScore ??
    calculatePIRLSScaleScore(submission.totalScore, submission.maxScore);
  const benchmark = getBenchmarkInfo(scaleScore);
  const classPR = submission.classPR ?? 50;
  const normPR = submission.normPR ?? estimateTheoreticalPR(scaleScore);

  // 計算四軸雷達圖多邊形點座標 (以中心 240, 160，半徑 85 為基準，SVG viewBox 0 0 480 320 保留兩側充足留白無裁切)
  // 順序: Top (L1 提取), Right (L2 推論), Bottom (L3 詮釋), Left (L4 評估)
  const cx = 240;
  const cy = 160;
  const maxR = 85;

  const r1 = (processScores.level1.percentage / 100) * maxR;
  const r2 = (processScores.level2.percentage / 100) * maxR;
  const r3 = (processScores.level3.percentage / 100) * maxR;
  const r4 = (processScores.level4.percentage / 100) * maxR;

  const p1 = `${cx},${cy - r1}`;
  const p2 = `${cx + r2},${cy}`;
  const p3 = `${cx},${cy + r3}`;
  const p4 = `${cx - r4},${cy}`;
  const polygonPoints = `${p1} ${p2} ${p3} ${p4}`;

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
              <p className="text-xs text-slate-500">
                {submission.studentName} 同學 • 《{submission.testPaperTitle}》
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center space-x-1"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>列印能力證書</span>
            </button>
            <Link
              href="/dashboard/student"
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
            >
              完成返回
            </Link>
          </div>
        </div>
      </header>

      {/* 主體報告內容 */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* 成績大總覽卡片 */}
        <div className="bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              PIRLS 閱讀素養認證完成
            </span>
            <h2 className="text-2xl sm:text-3xl font-black">
              {submission.percentage >= 80 ? '表現卓越！思辨之星！' : submission.percentage >= 60 ? '表現良好！持續進步！' : '奠定基礎！再接再厲！'}
            </h2>
            <p className="text-xs sm:text-sm text-sky-100 max-w-lg">
              完成《{submission.testPaperTitle}》測驗，已成功對齊 PIRLS 國際量尺與常模常態分佈。
            </p>
          </div>

          <div className="flex items-center space-x-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 flex-shrink-0">
            <div className="text-center px-3">
              <div className="text-3xl sm:text-4xl font-black text-amber-300">
                {submission.totalScore}
              </div>
              <div className="text-[11px] text-sky-100 mt-1">總得分 (滿分 {submission.maxScore})</div>
            </div>
            <div className="w-px h-12 bg-white/20" />
            <div className="text-center px-3">
              <div className="text-3xl sm:text-4xl font-black text-white">
                {submission.percentage}%
              </div>
              <div className="text-[11px] text-sky-100 mt-1">整體掌握率</div>
            </div>
          </div>
        </div>

        {/* Stage 5: PIRLS 國際標準量尺與常模落點認證卡片 */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">PIRLS 國際標準量尺與常模能力證書</h3>
                <p className="text-xs text-slate-500">對齊 IEA 國際標準：平均值 500 分、標準差 100 分</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1.5 rounded-xl font-bold text-xs shadow-sm ${benchmark.badgeColor}`}>
                {benchmark.name} ({benchmark.enName})
              </span>
            </div>
          </div>

          {/* 量尺分數與同儕常模 PR 數據展示 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 量尺分數 */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>PIRLS 國際量尺分數</span>
                  <Globe2 className="w-4 h-4 text-sky-500" />
                </div>
                <div className="text-3xl font-black text-slate-900 mt-2">
                  {scaleScore} <span className="text-xs font-bold text-slate-500">分</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/80 text-[11px] text-slate-500">
                基準等級區間：{benchmark.minScore} ～ {benchmark.maxScore >= 1000 ? '以上' : benchmark.maxScore} 分
              </div>
            </div>

            {/* 班級百分等級 PR */}
            <div className="p-5 rounded-2xl bg-sky-50/60 border border-sky-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-sky-700">
                  <span>班級同儕排名 (Class PR)</span>
                  <Users className="w-4 h-4 text-sky-600" />
                </div>
                <div className="text-3xl font-black text-sky-900 mt-2">
                  PR {classPR}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-sky-100 text-[11px] text-sky-700">
                超越班上約 <strong className="font-bold">{classPR}%</strong> 的受測同儕
              </div>
            </div>

            {/* 全國/國際常模 PR */}
            <div className="p-5 rounded-2xl bg-purple-50/60 border border-purple-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-purple-700">
                  <span>國際常模對照 (Norm PR)</span>
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-3xl font-black text-purple-900 mt-2">
                  PR {normPR}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-purple-100 text-[11px] text-purple-700">
                相當於國際常態分佈前 <strong className="font-bold">{100 - normPR}%</strong> 的水平
              </div>
            </div>
          </div>

          {/* 官方素養能力描述與教學鷹架建議 */}
          <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200/70 space-y-3">
            <div className="flex items-start space-x-2">
              <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-amber-900">
                  【{benchmark.name}】官方閱讀能力描述指標：
                </h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  {benchmark.description}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-amber-200/60 flex items-start space-x-2 text-xs text-amber-900">
              <Compass className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <strong>未來自主學習與閱讀策略建議：</strong>
                <span>{benchmark.instructionalFocus}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 四維素養雷達圖與層次解析 */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* 左側：原生 SVG 四維雷達圖 (佔 5 欄) */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-2">PIRLS 四個思考能力雷達</h3>
            <svg viewBox="0 0 480 320" className="w-full max-w-[340px] h-auto">
              {/* 背景網格同心菱形 (25%, 50%, 75%, 100%) */}
              <polygon points="240,75 325,160 240,245 155,160" fill="none" stroke="#e2e8f0" strokeWidth="1.2"/>
              <polygon points="240,96.25 303.75,160 240,223.75 176.25,160" fill="none" stroke="#e2e8f0" strokeWidth="1"/>
              <polygon points="240,117.5 282.5,160 240,202.5 197.5,160" fill="none" stroke="#e2e8f0" strokeWidth="1"/>
              <polygon points="240,138.75 261.25,160 240,181.25 218.75,160" fill="none" stroke="#f1f5f9" strokeWidth="0.8"/>
              
              {/* 十字軸線 */}
              <line x1="240" y1="62" x2="240" y2="258" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3,3"/>
              <line x1="142" y1="160" x2="338" y2="160" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3,3"/>

              {/* 學生能力多邊形 */}
              <polygon points={polygonPoints} fill="#6366f1" fillOpacity="0.35" stroke="#4f46e5" strokeWidth="2.5"/>

              {/* 四個頂點圓點 */}
              <circle cx={cx} cy={cy - r1} r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" />
              <circle cx={cx + r2} cy={cy} r="4.5" fill="#059669" stroke="#ffffff" strokeWidth="1.5" />
              <circle cx={cx} cy={cy + r3} r="4.5" fill="#d97706" stroke="#ffffff" strokeWidth="1.5" />
              <circle cx={cx - r4} cy={cy} r="4.5" fill="#7c3aed" stroke="#ffffff" strokeWidth="1.5" />

              {/* 軸標籤 (兩側保留 >30px 邊距，絕不裁切任何文字) */}
              <text x="240" y="42" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#1e40af">
                L1 直接提取 ({processScores.level1.percentage}%)
              </text>
              <text x="345" y="164" textAnchor="start" fontSize="11" fontWeight="bold" fill="#065f46">
                L2 直接推論 ({processScores.level2.percentage}%)
              </text>
              <text x="240" y="282" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#92400e">
                L3 詮釋整合 ({processScores.level3.percentage}%)
              </text>
              <text x="135" y="164" textAnchor="end" fontSize="11" fontWeight="bold" fill="#5b21b6">
                L4 檢驗評估 ({processScores.level4.percentage}%)
              </text>
            </svg>
          </div>

          {/* 右側：四大層次指標卡片與優勢分析 (佔 7 欄) */}
          <div className="md:col-span-7 space-y-3">
            <h3 className="text-sm font-bold text-slate-800">各層次思維能力落點分析</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* L1 */}
              <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/50">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-blue-900">第一層：直接提取訊息</span>
                  <span className="text-xs font-black text-blue-700">{processScores.level1.percentage}%</span>
                </div>
                <div className="w-full bg-blue-200/60 h-1.5 rounded-full overflow-hidden mt-2">
                  <div className="bg-blue-600 h-full" style={{ width: `${processScores.level1.percentage}%` }} />
                </div>
                <p className="text-[11px] text-blue-800/80 mt-2">
                  得分 {processScores.level1.earned} / {processScores.level1.total} 分 • 能快速鎖定時間、人物與具體事實。
                </p>
              </div>

              {/* L2 */}
              <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/50">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-900">第二層：直接推論</span>
                  <span className="text-xs font-black text-emerald-700">{processScores.level2.percentage}%</span>
                </div>
                <div className="w-full bg-emerald-200/60 h-1.5 rounded-full overflow-hidden mt-2">
                  <div className="bg-emerald-600 h-full" style={{ width: `${processScores.level2.percentage}%` }} />
                </div>
                <p className="text-[11px] text-emerald-800/80 mt-2">
                  得分 {processScores.level2.earned} / {processScores.level2.total} 分 • 能順利串聯線索，理解隱含的因果關係。
                </p>
              </div>

              {/* L3 */}
              <div className="p-3.5 rounded-xl border border-amber-100 bg-amber-50/50">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-900">第三層：詮釋整合觀點</span>
                  <span className="text-xs font-black text-amber-700">{processScores.level3.percentage}%</span>
                </div>
                <div className="w-full bg-amber-200/60 h-1.5 rounded-full overflow-hidden mt-2">
                  <div className="bg-amber-600 h-full" style={{ width: `${processScores.level3.percentage}%` }} />
                </div>
                <p className="text-[11px] text-amber-800/80 mt-2">
                  得分 {processScores.level3.earned} / {processScores.level3.total} 分 • 能跨越段落歸納文章主旨與人物心態。
                </p>
              </div>

              {/* L4 */}
              <div className="p-3.5 rounded-xl border border-purple-100 bg-purple-50/50">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-purple-900">第四層：檢驗與評估</span>
                  <span className="text-xs font-black text-purple-700">{processScores.level4.percentage}%</span>
                </div>
                <div className="w-full bg-purple-200/60 h-1.5 rounded-full overflow-hidden mt-2">
                  <div className="bg-purple-600 h-full" style={{ width: `${processScores.level4.percentage}%` }} />
                </div>
                <p className="text-[11px] text-purple-800/80 mt-2">
                  得分 {processScores.level4.earned} / {processScores.level4.total} 分 • 能客觀反思寫作手法並連結現實經驗。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 逐題深入批改與三明治正向回饋 */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-indigo-600" />
            <span>逐題檢視與 AI 正向三明治回饋 ({submission.answers.length} 題)</span>
          </h3>

          <div className="space-y-4">
            {submission.answers.map((ans) => {
              const originalQ = testPaper?.questions?.find((q) => q.id === ans.questionId);
              const isFullScore = ans.score === ans.maxScore;

              return (
                <div
                  key={ans.questionId}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                        {ans.questionNumber}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {ans.type === 'multiple_choice' ? '選擇題' : '開放簡答題'}
                      </span>
                      {ans.code && (
                        <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                          IEA Code: {ans.code}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                          isFullScore
                            ? 'bg-emerald-100 text-emerald-800'
                            : ans.score > 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        得分：{ans.score} / {ans.maxScore} 分
                      </span>
                    </div>
                  </div>

                  {/* 題幹 */}
                  <h4 className="text-sm font-bold text-slate-800 leading-snug">
                    {originalQ?.prompt || `第 ${ans.questionNumber} 題`}
                  </h4>

                  {/* 題型細節剖析與對比 */}
                  {ans.type === 'multiple_choice' ? (
                    <div className="space-y-3">
                      {/* 快速對答結果狀態條 */}
                      <div
                        className={`p-3 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2 ${
                          isFullScore
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                            : 'bg-rose-50/80 border-rose-200 text-rose-900'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          {isFullScore ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                          )}
                          <span className="font-bold">
                            {isFullScore
                              ? '回答正確！精準鎖定文本依據與合理因果推論'
                              : '回答錯誤，請參考下方各選項剖析以釐清盲點'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 text-xs font-semibold">
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
                      <div className="space-y-2 pt-1">
                        <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                          <span>選項內容與不合理干擾項辨析：</span>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5">
                          {originalQ?.options && originalQ.options.length > 0 ? (
                            originalQ.options.map((opt) => {
                              const isStudentChoice =
                                ans.studentAnswer?.trim().toUpperCase() === opt.label.toUpperCase();
                              const isCorrectOption = Boolean(
                                opt.isCorrect ||
                                (originalQ?.correctAnswerLabel &&
                                  originalQ.correctAnswerLabel.toUpperCase() === opt.label.toUpperCase())
                              );

                              let cardStyle = 'border-slate-200 bg-white hover:bg-slate-50/40 text-slate-700';
                              let badgeComponent = null;

                              if (isStudentChoice && isCorrectOption) {
                                cardStyle = 'border-2 border-emerald-500 bg-emerald-50/60 shadow-xs';
                                badgeComponent = (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-600 text-white shadow-xs">
                                    <Check className="w-3 h-3 stroke-[3]" /> 你的選擇（正確答案）
                                  </span>
                                );
                              } else if (isStudentChoice && !isCorrectOption) {
                                cardStyle = 'border-2 border-rose-400 bg-rose-50/60 shadow-xs';
                                badgeComponent = (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-600 text-white shadow-xs">
                                    <X className="w-3 h-3 stroke-[3]" /> 你的選擇（不合理干擾項）
                                  </span>
                                );
                              } else if (!isStudentChoice && isCorrectOption) {
                                cardStyle = 'border-2 border-emerald-400/80 bg-emerald-50/30';
                                badgeComponent = (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800">
                                    <Check className="w-3 h-3 stroke-[2.5]" /> 標準正解
                                  </span>
                                );
                              }

                              return (
                                <div
                                  key={opt.label}
                                  className={`p-3.5 rounded-xl border text-xs transition-all ${cardStyle}`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start space-x-2.5 flex-1">
                                      <span
                                        className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                          isCorrectOption
                                            ? 'bg-emerald-600 text-white'
                                            : isStudentChoice
                                            ? 'bg-rose-500 text-white'
                                            : 'bg-slate-100 text-slate-700'
                                        }`}
                                      >
                                        {opt.label}
                                      </span>
                                      <div className="space-y-1 flex-1">
                                        <div className="text-slate-800 font-medium leading-relaxed">
                                          {opt.text}
                                        </div>
                                        {opt.imageUrl && (
                                          <div className="mt-2">
                                            <img
                                              src={opt.imageUrl}
                                              alt={`選項 ${opt.label}`}
                                              className="max-h-28 rounded-lg border border-slate-200 object-contain"
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
                                      className={`mt-2.5 pt-2 border-t text-[11px] flex items-start gap-1.5 ${
                                        isCorrectOption
                                          ? 'border-emerald-200 text-emerald-900 bg-emerald-50/50 -mx-3.5 -mb-3.5 p-2.5 rounded-b-xl'
                                          : isStudentChoice
                                          ? 'border-rose-200 text-rose-900 bg-rose-50/50 -mx-3.5 -mb-3.5 p-2.5 rounded-b-xl'
                                          : 'border-slate-100 text-slate-500'
                                      }`}
                                    >
                                      <span className="font-bold flex-shrink-0">
                                        {isCorrectOption ? '🎯 文本證據依據：' : '💡 為何是不合理答案：'}
                                      </span>
                                      <span className="leading-relaxed">{opt.explanation}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
                              學生回答：<strong>{ans.studentAnswer}</strong> • 標準正解：<strong>{originalQ?.correctAnswerLabel}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* 開放簡答題 / 問答深層思考題 */
                    <div className="space-y-3.5">
                      {/* 學生作答原貌 */}
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-slate-600 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            你的作答回答：
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {ans.studentAnswer ? `${ans.studentAnswer.length} 字` : '未填寫'}
                          </span>
                        </div>
                        <div className="font-medium leading-relaxed bg-white p-3 rounded-lg border border-slate-100 text-slate-900 whitespace-pre-line shadow-2xs">
                          {ans.studentAnswer || '（此題未作答）'}
                        </div>
                      </div>

                      {/* 官方滿分參考答案（讓學生清楚理解滿分答題示範） */}
                      {originalQ?.rubric?.sampleFullCreditAnswer && (
                        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-indigo-50/70 border border-emerald-200 text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1.5 font-bold text-emerald-950">
                              <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                              <span>⭐ 滿分參考答案（PIRLS 官方滿分示範答法）：</span>
                            </div>
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                              滿分 {ans.maxScore} 分範例
                            </span>
                          </div>
                          <div className="bg-white/95 p-3 rounded-lg border border-emerald-200/60 text-slate-800 leading-relaxed font-medium whitespace-pre-line shadow-xs">
                            {originalQ.rubric.sampleFullCreditAnswer}
                          </div>
                          {originalQ.rubric.samplePartialCreditAnswer && (
                            <div className="pt-1.5 text-[11px] text-slate-600">
                              <strong className="text-amber-800">部分得分範例（得 1 分）：</strong>
                              <span>{originalQ.rubric.samplePartialCreditAnswer}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 評分規準說明（讓學生清楚知道採分點與扣分盲點） */}
                      {originalQ?.rubric?.criteria && originalQ.rubric.criteria.length > 0 && (
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
                          <div className="flex items-center space-x-1.5 font-bold text-slate-700">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                            <span>IEA PIRLS 評分規準與扣分常見盲點：</span>
                          </div>
                          <div className="space-y-2">
                            {originalQ.rubric.criteria.map((crit, idx) => {
                              const isThisScore = ans.score === crit.score;
                              return (
                                <div
                                  key={idx}
                                  className={`p-2.5 rounded-lg border text-[11px] transition-all ${
                                    isThisScore
                                      ? 'border-indigo-300 bg-indigo-50/60 shadow-2xs'
                                      : 'border-slate-200/70 bg-white text-slate-600'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <div className="flex items-center space-x-1.5">
                                      <span
                                        className={`px-1.5 py-0.5 rounded font-black text-[10px] ${
                                          crit.score === ans.maxScore
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : crit.score > 0
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-rose-100 text-rose-800'
                                        }`}
                                      >
                                        {crit.score} 分標準
                                      </span>
                                      <span className="font-mono text-[10px] text-slate-400">
                                        IEA Code {crit.code}
                                      </span>
                                    </div>
                                    {isThisScore && (
                                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                                        本題落點判定
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-slate-700 leading-relaxed">{crit.description}</div>
                                  {crit.keyEvidenceNeeded && crit.keyEvidenceNeeded.length > 0 && (
                                    <div className="mt-1 pt-1 border-t border-slate-100 text-[10px] text-indigo-900 flex items-start gap-1">
                                      <span className="font-bold flex-shrink-0">必備關鍵要素：</span>
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

                  {/* 正向三明治回饋框 */}
                  {ans.aiFeedback && (
                    <div className="bg-sky-50/60 rounded-xl p-4 border border-sky-100 space-y-2.5 text-xs">
                      {/* Top: 肯定 */}
                      <div className="flex items-start space-x-2 text-emerald-900">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-emerald-800">肯定亮點：</strong>
                          {ans.aiFeedback.strength}
                        </div>
                      </div>

                      {/* Middle: 盲點 */}
                      <div className="flex items-start space-x-2 text-amber-900">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-amber-800">思考指引：</strong>
                          {ans.aiFeedback.weakness}
                        </div>
                      </div>

                      {/* Bottom: 示範與引導 */}
                      <div className="flex items-start space-x-2 text-sky-900">
                        <Lightbulb className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-sky-800">提升小秘訣：</strong>
                          {ans.aiFeedback.scaffoldingTip}
                        </div>
                      </div>
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
