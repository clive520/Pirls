'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Sparkles,
  RefreshCw,
  Users,
  Target,
  Award,
  BookOpen,
  HelpCircle,
  FileText,
  UserCheck,
} from 'lucide-react';
import api from '@/lib/api-client';
import { ComparativeAnalysisData } from '@/lib/types';
import { ComparativeRadarCard } from '@/components/analytics';

function ComparativeAnalyticsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialClassId = searchParams.get('classId') || '';
  const initialPreId = searchParams.get('preTestId') || '';
  const initialPostId = searchParams.get('postTestId') || '';
  const initialStudentId = searchParams.get('studentId') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudentId);

  const [availableTestPapers, setAvailableTestPapers] = useState<any[]>([]);
  const [selectedPreTestId, setSelectedPreTestId] = useState<string>(initialPreId);
  const [selectedPostTestId, setSelectedPostTestId] = useState<string>(initialPostId);

  const [comparativeData, setComparativeData] = useState<ComparativeAnalysisData | null>(null);

  // AI 診斷狀態
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<{
    growthHighlight: string;
    bottleneckAnalysis: string;
    actionPlans: Array<{ title: string; strategy: string }>;
    benchmarkTarget: string;
  } | null>(null);

  // 載入資料
  const loadData = async (options?: {
    classId?: string;
    preId?: string;
    postId?: string;
    studentId?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const cId = options?.classId !== undefined ? options.classId : selectedClassId;
      const pPre = options?.preId !== undefined ? options.preId : selectedPreTestId;
      const pPost = options?.postId !== undefined ? options.postId : selectedPostTestId;
      const sId = options?.studentId !== undefined ? options.studentId : selectedStudentId;

      const res = await api.teacher.getComparativeAnalytics({
        classId: cId || undefined,
        preTestId: pPre || undefined,
        postTestId: pPost || undefined,
        studentId: sId || undefined,
      });

      setClasses(res.classes || []);
      setSelectedClassId(res.selectedClassId);
      setStudents(res.students || []);
      setAvailableTestPapers(res.availableTestPapers || []);
      setSelectedPreTestId(res.selectedPreTestId || '');
      setSelectedPostTestId(res.selectedPostTestId || '');
      setComparativeData(res.comparativeData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '載入前後測對照數據失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 當切換班級
  const handleClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    setSelectedStudentId('');
    setSelectedPreTestId('');
    setSelectedPostTestId('');
    setAiInsight(null);
    loadData({ classId: newClassId, preId: '', postId: '', studentId: '' });
  };

  // 當切換前測試卷
  const handlePreTestChange = (newPreId: string) => {
    setSelectedPreTestId(newPreId);
    setAiInsight(null);
    loadData({ preId: newPreId });
  };

  // 當切換後測試卷
  const handlePostTestChange = (newPostId: string) => {
    setSelectedPostTestId(newPostId);
    setAiInsight(null);
    loadData({ postId: newPostId });
  };

  // 當切換分析對象（全班 vs 個別學生）
  const handleStudentChange = (newStudentId: string) => {
    setSelectedStudentId(newStudentId);
    setAiInsight(null);
    loadData({ studentId: newStudentId });
  };

  // 請求 AI 歷程成長診斷
  const handleGenerateAiInsight = async () => {
    if (!comparativeData) return;
    try {
      setAiLoading(true);
      const res = await api.teacher.getComparativeAiInsight(comparativeData);
      if (res.success && res.insight) {
        setAiInsight(res.insight);
      }
    } catch (err: any) {
      alert(err.message || '生成 AI 診斷失敗');
    } finally {
      setAiLoading(false);
    }
  };

  const levelLabels = {
    level1: '第一層：直接提取訊息',
    level2: '第二層：直接推論',
    level3: '第三層：詮釋整合觀點',
    level4: '第四層：檢驗與評估',
  };

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 頂部導航與標題 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
              <Link href="/dashboard/teacher" className="hover:text-blue-600 transition-colors">
                教師儀表板
              </Link>
              <span>/</span>
              <span className="text-slate-700 font-semibold">歷程前後測對照</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>📊 學生/班級歷程前測 vs 後測</span>
              <span className="text-blue-600 font-bold">四維思維能力雷達</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              以雙層雷達圖透視學生在 PIRLS 四個思考能力維度上的歷程擴張，診斷成長突破與阻滯瓶頸。
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => loadData()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
              重新整理
            </button>
            <Link
              href="/dashboard/teacher"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              回儀表板
            </Link>
          </div>
        </div>

        {/* 篩選與試卷選擇工具列 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 班級選擇 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                🏫 選擇任教班級
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => handleClassChange(e.target.value)}
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.gradeLevel} 年級)
                  </option>
                ))}
              </select>
            </div>

            {/* 前測試卷選擇 */}
            <div>
              <label className="block text-xs font-bold text-sky-800 mb-1.5 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
                🟦 前測診斷試卷
              </label>
              <select
                value={selectedPreTestId}
                onChange={(e) => handlePreTestChange(e.target.value)}
                className="w-full text-xs sm:text-sm bg-sky-50/60 border border-sky-200 rounded-xl px-3 py-2 text-sky-950 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              >
                {availableTestPapers.length === 0 ? (
                  <option value="">(本班尚無作答試卷)</option>
                ) : (
                  availableTestPapers.map((p) => (
                    <option key={`pre-${p.id}`} value={p.id} disabled={p.id === selectedPostTestId}>
                      {p.title} ({p.submittedCount} 人完成)
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* 後測試卷選擇 */}
            <div>
              <label className="block text-xs font-bold text-emerald-800 mb-1.5 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                🟩 後測評量試卷
              </label>
              <select
                value={selectedPostTestId}
                onChange={(e) => handlePostTestChange(e.target.value)}
                className="w-full text-xs sm:text-sm bg-emerald-50/60 border border-emerald-200 rounded-xl px-3 py-2 text-emerald-950 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                {availableTestPapers.length === 0 ? (
                  <option value="">(本班尚無作答試卷)</option>
                ) : (
                  availableTestPapers.map((p) => (
                    <option key={`post-${p.id}`} value={p.id} disabled={p.id === selectedPreTestId}>
                      {p.title} ({p.submittedCount} 人完成)
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* 分析對象切換（全班 vs 個人） */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                👤 分析對象切換
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => handleStudentChange(e.target.value)}
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="">👥 全班整體平均對照</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.seatNumber ? `${s.seatNumber} 號 ` : ''}
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 狀態提示 */}
        {loading && (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">正在計算前後測四維思考能力落點與量尺差值...</p>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-800 text-sm">
            {error}
          </div>
        )}

        {!loading && availableTestPapers.length < 2 && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 text-center space-y-3">
            <HelpCircle className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="text-base font-bold text-amber-900">尚不足兩份已作答試卷</h3>
            <p className="text-xs sm:text-sm text-amber-800/90 max-w-lg mx-auto">
              目前該班僅有 {availableTestPapers.length} 份有作答紀錄的試卷。前後測雙層雷達需要至少兩份不同時間點的測驗（如期初前測 vs 期末後測），以繪製能力擴張軌跡。
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard/teacher/test-papers"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-amber-700 transition-colors"
              >
                前往指派更多測驗
              </Link>
            </div>
          </div>
        )}

        {!loading && comparativeData && (
          <>
            {/* 核心 KPI 4 欄概覽卡片 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. 量尺分成長卡 */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
                    <span className="flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-blue-600" />
                      PIRLS 量尺分成長
                    </span>
                    {comparativeData.scaleScoreDelta >= 0 ? (
                      <span className="text-emerald-600 font-black">+{comparativeData.scaleScoreDelta} 分 ▲</span>
                    ) : (
                      <span className="text-rose-600 font-black">{comparativeData.scaleScoreDelta} 分 ▼</span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-black text-slate-800">
                      {comparativeData.postTest.scaleScore}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      (前測 {comparativeData.preTest.scaleScore} 分)
                    </span>
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-600 border-t border-slate-100 pt-2 flex items-center justify-between">
                  <span className="text-slate-500">基準躍遷：</span>
                  <span className="font-bold text-blue-700">
                    {comparativeData.preTest.benchmarkName} ➔ {comparativeData.postTest.benchmarkName}
                  </span>
                </div>
              </div>

              {/* 2. 突破最大層次 */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      進步最多維度
                    </span>
                    <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      +{comparativeData.levels[comparativeData.mostImprovedLevel].deltaPercentage}%
                    </span>
                  </div>
                  <div className="text-base font-black text-slate-800 mt-2">
                    {levelLabels[comparativeData.mostImprovedLevel]}
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-500 border-t border-slate-100 pt-2">
                  掌握率從 {comparativeData.levels[comparativeData.mostImprovedLevel].prePercentage}% 提升至{' '}
                  <strong className="text-emerald-700">
                    {comparativeData.levels[comparativeData.mostImprovedLevel].postPercentage}%
                  </strong>
                </div>
              </div>

              {/* 3. 需加強深化層次 */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
                    <span className="flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-amber-600" />
                      最需深化維度
                    </span>
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      目前 {comparativeData.levels[comparativeData.needsFocusLevel].postPercentage}%
                    </span>
                  </div>
                  <div className="text-base font-black text-slate-800 mt-2">
                    {levelLabels[comparativeData.needsFocusLevel]}
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-500 border-t border-slate-100 pt-2">
                  變動幅度：
                  <strong className={comparativeData.levels[comparativeData.needsFocusLevel].deltaPercentage >= 0 ? 'text-slate-700' : 'text-rose-600'}>
                    {comparativeData.levels[comparativeData.needsFocusLevel].deltaPercentage >= 0 ? '+' : ''}
                    {comparativeData.levels[comparativeData.needsFocusLevel].deltaPercentage}%
                  </strong>
                  （作為下階段引導重心）
                </div>
              </div>

              {/* 4. 樣本配對狀態 */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      對照母體樣本
                    </span>
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                      {comparativeData.scope === 'class' ? '全班配對' : '個別學生'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-black text-slate-800">
                      {comparativeData.scope === 'class'
                        ? `${comparativeData.pairedStudentsCount} 位`
                        : comparativeData.studentName}
                    </span>
                    {comparativeData.scope === 'class' && (
                      <span className="text-xs text-slate-400 font-semibold">
                        (共 {students.length} 名學生)
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-500 border-t border-slate-100 pt-2 truncate">
                  前測：{comparativeData.preTest.submittedCount} 份 • 後測：{comparativeData.postTest.submittedCount} 份
                </div>
              </div>
            </div>

            {/* 核心圖表：雙層雷達圖與四大層次對照卡 */}
            <ComparativeRadarCard
              levels={comparativeData.levels}
              preTitle={comparativeData.preTest.title}
              postTitle={comparativeData.postTest.title}
              title={
                comparativeData.scope === 'class'
                  ? `【${comparativeData.className}】四維思維能力落點對照`
                  : `學生【${comparativeData.studentName}】四維思維能力落點對照`
              }
              subtitle="對照前測試卷與後測試卷之掌握百分比與成長差值"
              isClassAggregate={comparativeData.scope === 'class'}
            />

            {/* AI 歷程成長診斷與教學處方區塊 */}
            <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-800/60 pb-5">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    Gemini AI 歷程成長診斷與鷹架處方
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight">
                    {comparativeData.scope === 'class' ? '全班教學成效' : `${comparativeData.studentName} 個別成長`} AI 智慧教學引導
                  </h3>
                </div>

                <button
                  onClick={handleGenerateAiInsight}
                  disabled={aiLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-white text-indigo-950 hover:bg-indigo-50 transition-colors shadow-md disabled:opacity-60"
                >
                  {aiLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                      AI 深度分析中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      {aiInsight ? '重新生成 AI 診斷' : '立即生成 AI 成長診斷與處方'}
                    </>
                  )}
                </button>
              </div>

              {aiInsight ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  {/* 成長亮點 */}
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-300 font-bold">
                      <TrendingUp className="w-4 h-4" />
                      歷程成長亮點診斷
                    </div>
                    <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">
                      {aiInsight.growthHighlight}
                    </p>
                  </div>

                  {/* 瓶頸診斷 */}
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 space-y-2">
                    <div className="flex items-center gap-2 text-amber-300 font-bold">
                      <Target className="w-4 h-4" />
                      思維瓶頸與落點障礙剖析
                    </div>
                    <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">
                      {aiInsight.bottleneckAnalysis}
                    </p>
                  </div>

                  {/* 教學處方 */}
                  <div className="md:col-span-2 bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 space-y-3">
                    <div className="flex items-center gap-2 text-sky-300 font-bold">
                      <BookOpen className="w-4 h-4" />
                      下階段鷹架教學與介入處方（Actionable Strategies）
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {aiInsight.actionPlans.map((plan, idx) => (
                        <div key={idx} className="bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-1">
                          <div className="text-xs font-bold text-sky-200 flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-sky-500/30 text-sky-300 inline-flex items-center justify-center text-[10px]">
                              {idx + 1}
                            </span>
                            {plan.title}
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed pl-5">
                            {plan.strategy}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 國際基準衝刺目標 */}
                  <div className="md:col-span-2 bg-indigo-950/60 rounded-xl p-4 border border-indigo-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-indigo-300 font-semibold">
                      <Award className="w-4 h-4 text-amber-400" />
                      <span>PIRLS 國際基準躍遷指引：</span>
                      <span className="text-white font-normal">{aiInsight.benchmarkTarget}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-slate-300 text-xs sm:text-sm space-y-1">
                  <p>點擊上方按鈕，由 AI 根據前後測各層次變化數據，為您提煉班級與學生專屬的鷹架教學處方。</p>
                </div>
              )}
            </div>

            {/* 全班個別學生對照名冊表格（僅在班級模式時顯示） */}
            {comparativeData.scope === 'class' && (
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-blue-600" />
                      全班學生歷程對照名冊
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      點擊「查看個人專屬雷達」可立即展開該學生的四維能力成長對照分析
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">
                    共 {comparativeData.studentComparisons.length} 位學生
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 font-bold">座號</th>
                        <th className="py-3 px-4 font-bold">學生姓名</th>
                        <th className="py-3 px-4 font-bold">前測得分率 / 量尺分</th>
                        <th className="py-3 px-4 font-bold">後測得分率 / 量尺分</th>
                        <th className="py-3 px-4 font-bold">總分進步</th>
                        <th className="py-3 px-4 font-bold text-center">L1 提取</th>
                        <th className="py-3 px-4 font-bold text-center">L2 推論</th>
                        <th className="py-3 px-4 font-bold text-center">L3 詮釋</th>
                        <th className="py-3 px-4 font-bold text-center">L4 檢驗</th>
                        <th className="py-3 px-4 font-bold text-right">個人雷達</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {comparativeData.studentComparisons.map((sc) => {
                        const hasDelta = sc.hasBoth && sc.scoreDelta !== undefined;
                        const deltaColor =
                          hasDelta && sc.scoreDelta! > 0
                            ? 'text-emerald-700 bg-emerald-50'
                            : hasDelta && sc.scoreDelta! < 0
                            ? 'text-rose-700 bg-rose-50'
                            : 'text-slate-600 bg-slate-100';

                        const renderLevelDelta = (d?: number) => {
                          if (d === undefined) return <span className="text-slate-300">-</span>;
                          if (d > 0) return <span className="font-semibold text-emerald-600">+{d}%</span>;
                          if (d < 0) return <span className="font-semibold text-rose-600">{d}%</span>;
                          return <span className="text-slate-400">0%</span>;
                        };

                        return (
                          <tr key={sc.studentId} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4 font-medium text-slate-500">
                              {sc.seatNumber ?? '-'}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {sc.studentName}
                            </td>
                            <td className="py-3 px-4">
                              {sc.preScore !== undefined ? (
                                <span>
                                  {sc.preScore} 分 ({sc.preScaleScore} 量尺)
                                </span>
                              ) : (
                                <span className="text-slate-400">未作答</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {sc.postScore !== undefined ? (
                                <span className="font-semibold text-slate-800">
                                  {sc.postScore} 分 ({sc.postScaleScore} 量尺)
                                </span>
                              ) : (
                                <span className="text-slate-400">未作答</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {sc.hasBoth && sc.scoreDelta !== undefined ? (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[11px] ${deltaColor}`}>
                                  {sc.scoreDelta > 0 ? `+${sc.scoreDelta}` : sc.scoreDelta} 分
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">欠缺對照</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">{renderLevelDelta(sc.l1Delta)}</td>
                            <td className="py-3 px-4 text-center">{renderLevelDelta(sc.l2Delta)}</td>
                            <td className="py-3 px-4 text-center">{renderLevelDelta(sc.l3Delta)}</td>
                            <td className="py-3 px-4 text-center">{renderLevelDelta(sc.l4Delta)}</td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleStudentChange(sc.studentId)}
                                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                              >
                                查看個人
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ComparativeAnalyticsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-600">載入前後測雷達對照中...</p>
          </div>
        </div>
      }
    >
      <ComparativeAnalyticsContent />
    </React.Suspense>
  );
}
