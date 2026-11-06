'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Award,
  BookOpen,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Users,
  Compass,
  ShieldCheck,
  Calculator,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Printer,
  ChevronLeft,
  Sliders,
  Target,
  FileCheck2,
} from 'lucide-react';
import { calculatePIRLSScaleScore, getBenchmarkInfo, estimateTheoreticalPR, PIRLS_BENCHMARKS } from '@/lib/pirls-norm';

export default function ScoreMetricsGuidePage() {
  // 互動試算工具狀態
  const [calcEarned, setCalcEarned] = useState<number>(18);
  const [calcTotal, setCalcTotal] = useState<number>(24);

  const rawPercentage = calcTotal > 0 ? Math.round((calcEarned / calcTotal) * 100) : 0;
  const estimatedScale = calculatePIRLSScaleScore(calcEarned, calcTotal);
  const benchmark = getBenchmarkInfo(estimatedScale);
  const estimatedPR = estimateTheoreticalPR(estimatedScale);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex flex-col justify-between">
      {/* 導覽列 */}
      <header className="bg-white border-b sticky top-0 z-40 backdrop-blur-md bg-white/90 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-sm hover:opacity-90 transition"
              title="回首頁"
            >
              <BookOpen className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                PIRLS 閱讀素養指標與常模計算說明指南
              </h1>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                完全對齊 IEA 國際閱讀素養進展研究（平均 500、標準差 100）標準
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-sm inline-flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">列印 / 存為 PDF</span>
            </button>
            <Link
              href="/dashboard/student"
              className="px-3.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold transition border border-sky-200/60"
            >
              學生後台
            </Link>
            <Link
              href="/dashboard/teacher"
              className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold transition border border-indigo-200/60"
            >
              教師工作台
            </Link>
          </div>
        </div>
      </header>

      {/* 主體內容區塊 */}
      <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
        {/* 標題與簡介橫幅 */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>IEA PIRLS 國際閱讀素養進展研究 • 成績計算透明化公開</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            學生的各項成績指標是 <span className="text-blue-600">如何產生的？</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
            本平臺依循 IEA 官方規範，不只計算原始對錯題數，更透過<strong>「四維思維進程落點」</strong>與<strong>「心理計量常模量尺」</strong>雙軌架構，深入解析每位學生的思維廣度與國際能力定位。
          </p>
        </div>

        {/* 快捷導覽卡片 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold">
          <a
            href="#section-thinking-radar"
            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-sm transition-all text-center block text-slate-700 hover:text-blue-600"
          >
            1. 四維思維雷達落點
          </a>
          <a
            href="#section-scale-score"
            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-sm transition-all text-center block text-slate-700 hover:text-blue-600"
          >
            2. 國際量尺分數算法
          </a>
          <a
            href="#section-benchmarks"
            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-sm transition-all text-center block text-slate-700 hover:text-blue-600"
          >
            3. 五大國際基準等級
          </a>
          <a
            href="#section-pr-ranks"
            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-sm transition-all text-center block text-slate-700 hover:text-blue-600"
          >
            4. 班級 PR vs 國際常模 PR
          </a>
        </div>

        {/* =========================================================================
            區塊一：四維思維能力落點與雷達圖
           ========================================================================= */}
        <section id="section-thinking-radar" className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-200">
              1
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                PIRLS 四個思考能力維度與雷達圖（如何產生？）
              </h3>
              <p className="text-xs text-slate-500">
                深入檢驗學生在不同閱讀認知歷程（Cognitive Processes）的精熟程度
              </p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            在 PIRLS 國際評量架構中，每一道題目在命題階段即嚴格錨定所屬的<strong>思考歷程層次（Level 1 至 Level 4）</strong>。系統在閱卷完成後，會分別加總該層次所有題目的實得分數與總分，並計算出<strong>「掌握百分比」</strong>：
          </p>

          {/* 公式卡 */}
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/70 text-xs sm:text-sm font-mono text-blue-950 text-center font-bold">
            層次掌握百分比 (%) = ( 該層次題目獲得總分 ÷ 該層次題目滿分總分 ) × 100%
          </div>

          {/* 四大層次卡片清單 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* L1 */}
            <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  第一層：直接提取訊息 (Focus & Retrieve)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-200/70 text-blue-800">基礎提取</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>評量重點：</strong>能快速鎖定文章中直接明確陳述的事實細節，例如時間、地點、人名、數字或情節開端。
              </p>
              <div className="text-[11px] text-blue-800 bg-white/70 p-2.5 rounded-xl border border-blue-100">
                <strong>計算範例：</strong>整份試卷中 L1 題目共 3 題（滿分 3 分），學生答對 2 題獲得 2 分，則第一層得分率為 <strong>2 ÷ 3 = 67%</strong>。
              </div>
            </div>

            {/* L2 */}
            <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  第二層：直接推論 (Make Straightforward Inferences)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200/70 text-emerald-800">文意串聯</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>評量重點：</strong>能順利串聯相鄰文句線索，理解未明言但顯而易見的因果關係、代名詞指涉與角色當下的行動意圖。
              </p>
              <div className="text-[11px] text-emerald-800 bg-white/70 p-2.5 rounded-xl border border-emerald-100">
                <strong>計算範例：</strong>L2 題目共 3 題（滿分 6 分），學生作答獲得 5 分，則第二層得分率為 <strong>5 ÷ 6 = 83%</strong>。
              </div>
            </div>

            {/* L3 */}
            <div className="p-4 rounded-2xl border border-amber-100 bg-amber-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-600" />
                  第三層：詮釋整合觀點 (Interpret & Integrate)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200/70 text-amber-800">全篇統整</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>評量重點：</strong>跨越全文多個段落歸納主旨、比較不同角色的立場、領會文章寓意與人物心態的轉變歷程。
              </p>
              <div className="text-[11px] text-amber-800 bg-white/70 p-2.5 rounded-xl border border-amber-100">
                <strong>計算範例：</strong>L3 題目共 4 題（滿分 8 分），學生獲得 6 分，則第三層得分率為 <strong>6 ÷ 8 = 75%</strong>。
              </div>
            </div>

            {/* L4 */}
            <div className="p-4 rounded-2xl border border-purple-100 bg-purple-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-600" />
                  第四層：檢驗與評估 (Examine & Evaluate)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-200/70 text-purple-800">批判反思</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>評量重點：</strong>能客觀審視作者的寫作手法、修辭技巧、插圖修辭功能，並結合個人生活經驗進行思辨與評價。
              </p>
              <div className="text-[11px] text-purple-800 bg-white/70 p-2.5 rounded-xl border border-purple-100">
                <strong>計算範例：</strong>L4 題目共 2 題（滿分 5 分），學生獲得 3 分，則第四層得分率為 <strong>3 ÷ 5 = 60%</strong>。
              </div>
            </div>
          </div>

          {/* 雷達圖繪製原理 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-blue-600" />
              <span>「四維思維能力雷達圖」的幾何生成原理：</span>
            </h4>
            <p className="leading-relaxed">
              雷達圖以原點 (0%) 為核心，四個頂點依序分別為 <strong>L1 直接提取 (上軸)</strong>、<strong>L2 直接推論 (右軸)</strong>、<strong>L3 詮釋整合 (下軸)</strong>、<strong>L4 檢驗評估 (左軸)</strong>。各軸最大半徑對應 100%，多邊形面積與形狀即時反映出學生是「高階推論拔尖」、「基礎提取扎實」或「四大能力均衡發展」，讓教師一目了然其認知擴張向度。
            </p>
          </div>
        </section>

        {/* =========================================================================
            區塊二：PIRLS 國際量尺分數 (Scale Score) 演算法
           ========================================================================= */}
        <section id="section-scale-score" className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-200">
              2
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                PIRLS 國際量尺分數（Scale Score）如何計算？
              </h3>
              <p className="text-xs text-slate-500">
                為什麼成績單上顯示「571 分」？國際常模量尺的轉換原理
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <p>
              在學校日常考試中，通常以 0～100 分計算；但在國際大型教育評量（如 <strong>PIRLS、PISA、TIMSS</strong>）中，由於每份題本的文章體裁、字數與難易度不同，<strong>原始得分無法直接跨題本比較</strong>。
            </p>
            <p>
              因此，PIRLS 採用統計心理計量學的<strong>標準化國際量尺（Scale Score）</strong>：
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-xs text-slate-500 font-semibold">IEA 全球國際平均值 (Mean)</div>
                <div className="text-2xl font-black text-slate-900 mt-1">500 分</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-xs text-slate-500 font-semibold">國際母體標準差 (Standard Deviation)</div>
                <div className="text-2xl font-black text-slate-900 mt-1">100 分</div>
              </div>
            </div>
          </div>

          {/* 分段線性內插錨定表 */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800">
              📐 IEA 官方素養基準與得分率錨定點對照（分段單調遞增內插演算法）：
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-bold">原始得分率</th>
                    <th className="py-2.5 px-3 font-bold">PIRLS 國際標準分</th>
                    <th className="py-2.5 px-3 font-bold">所屬國際基準</th>
                    <th className="py-2.5 px-3 font-bold">說明</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-slate-700">85% 以上</td>
                    <td className="py-2.5 px-3 font-bold text-purple-700">625 ～ 715 分</td>
                    <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">高級基準</span></td>
                    <td className="py-2.5 px-3 text-slate-500">能全篇深層統整與批判反思</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-slate-700">68% ～ 84%</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-700">550 ～ 624 分</td>
                    <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">高基準</span></td>
                    <td className="py-2.5 px-3 text-slate-500">具備良好推論與列舉證據能力</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-slate-700">50% ～ 67%</td>
                    <td className="py-2.5 px-3 font-bold text-sky-700">475 ～ 549 分</td>
                    <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-bold">中等基準</span></td>
                    <td className="py-2.5 px-3 text-slate-500">具備完整字面理解與淺層推論</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-slate-700">35% ～ 49%</td>
                    <td className="py-2.5 px-3 font-bold text-amber-700">400 ～ 474 分</td>
                    <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">低基準</span></td>
                    <td className="py-2.5 px-3 text-slate-500">具備基礎事實提取能力</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-slate-700">35% 以下</td>
                    <td className="py-2.5 px-3 font-bold text-slate-600">260 ～ 399 分</td>
                    <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-bold">未達低基準</span></td>
                    <td className="py-2.5 px-3 text-slate-500">需持續給予長文共讀與詞彙鷹架</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* =========================================================================
            區塊三：五大國際基準等級 (Benchmarks) 劃分
           ========================================================================= */}
        <section id="section-benchmarks" className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-200">
              3
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                PIRLS 五大國際基準等級（International Benchmarks）
              </h3>
              <p className="text-xs text-slate-500">
                IEA 官方定義之四年級學童素養能力描述指標與下階段教學鷹架
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* 高級基準 */}
            <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-purple-900 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white text-xs font-bold">625 分以上</span>
                  高級基準 (Advanced International Benchmark)
                </span>
                <span className="text-xs font-bold text-purple-700">前 10% 卓越水準</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                <strong>官方能力描述：</strong>{PIRLS_BENCHMARKS.advanced.description}
              </p>
              <div className="text-[11px] text-purple-800 pt-1 border-t border-purple-100 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-purple-600" />
                <span><strong>教學建議：</strong>{PIRLS_BENCHMARKS.advanced.instructionalFocus}</span>
              </div>
            </div>

            {/* 高基準 */}
            <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-emerald-900 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-xs font-bold">550 ～ 624 分</span>
                  高基準 (High International Benchmark)
                </span>
                <span className="text-xs font-bold text-emerald-700">具備深厚閱讀力</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                <strong>官方能力描述：</strong>{PIRLS_BENCHMARKS.high.description}
              </p>
              <div className="text-[11px] text-emerald-800 pt-1 border-t border-emerald-100 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-emerald-600" />
                <span><strong>教學建議：</strong>{PIRLS_BENCHMARKS.high.instructionalFocus}</span>
              </div>
            </div>

            {/* 中等基準 */}
            <div className="p-4 rounded-2xl border border-sky-200 bg-sky-50/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-sky-900 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-sky-600 text-white text-xs font-bold">475 ～ 549 分</span>
                  中等基準 (Intermediate International Benchmark)
                </span>
                <span className="text-xs font-bold text-sky-700">國際常模平均水準</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                <strong>官方能力描述：</strong>{PIRLS_BENCHMARKS.intermediate.description}
              </p>
              <div className="text-[11px] text-sky-800 pt-1 border-t border-sky-100 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-sky-600" />
                <span><strong>教學建議：</strong>{PIRLS_BENCHMARKS.intermediate.instructionalFocus}</span>
              </div>
            </div>

            {/* 低基準 */}
            <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-amber-900 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-xs font-bold">400 ～ 474 分</span>
                  低基準 (Low International Benchmark)
                </span>
                <span className="text-xs font-bold text-amber-700">具備基礎識讀能力</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                <strong>官方能力描述：</strong>{PIRLS_BENCHMARKS.low.description}
              </p>
              <div className="text-[11px] text-amber-800 pt-1 border-t border-amber-100 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-amber-600" />
                <span><strong>教學建議：</strong>{PIRLS_BENCHMARKS.low.instructionalFocus}</span>
              </div>
            </div>

            {/* 未達低基準 */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-slate-600 text-white text-xs font-bold">400 分以下</span>
                  未達低基準 (Below Low Benchmark)
                </span>
                <span className="text-xs font-bold text-slate-600">需個別化支持</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                <strong>官方能力描述：</strong>{PIRLS_BENCHMARKS.below_low.description}
              </p>
              <div className="text-[11px] text-slate-700 pt-1 border-t border-slate-200 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-slate-500" />
                <span><strong>教學建議：</strong>{PIRLS_BENCHMARKS.below_low.instructionalFocus}</span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            區塊四：班級同儕排名 (Class PR) vs 國際常模對照 (Norm PR)
           ========================================================================= */}
        <section id="section-pr-ranks" className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-bold shadow-md shadow-amber-200">
              4
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                班級同儕排名 (Class PR) vs 國際常模對照 (Norm PR) 算法差異
              </h3>
              <p className="text-xs text-slate-500">
                為什麼會有兩個 PR 值？一個看「班級同儕競爭」，一個看「全球常態分佈」
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 班級 PR */}
            <div className="p-5 rounded-2xl bg-sky-50/60 border border-sky-100 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-sky-950 flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-600" />
                  <span>班級同儕排名 (Class PR)</span>
                </h4>
                <span className="text-xs font-bold text-sky-700 px-2 py-0.5 bg-sky-100 rounded">實測同儕對照</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>意義：</strong>表示學生在<strong>該次班級測驗中，超越了班上百分之幾的受測同儕</strong>。
              </p>
              <div className="p-3 bg-white rounded-xl border border-sky-200/80 space-y-1.5 text-xs text-sky-900">
                <div className="font-bold">心理計量學「中點百分等級公式」：</div>
                <div className="font-mono bg-sky-50 p-2 rounded text-[11px]">
                  Class PR = [ ( 低於該生人數 + 0.5 × 同分人數 ) ÷ 全班總人數 ] × 100
                </div>
                <p className="text-[11px] text-slate-500 pt-1">
                  💡 說明：納入「同分中點折算 (0.5)」，能避免傳統排名因並列同分而產生極端偏差，給予學生最公正的同儕定位。
                </p>
              </div>
            </div>

            {/* 國際常模 PR */}
            <div className="p-5 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-purple-950 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  <span>國際常模對照 (Norm PR)</span>
                </h4>
                <span className="text-xs font-bold text-purple-700 px-2 py-0.5 bg-purple-100 rounded">全球母體對照</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>意義：</strong>表示學生的量尺分數在<strong>全球 PIRLS 國際標準常態分佈（平均 500、標準差 100）</strong>中相當於超越百分之幾的同齡學童。
              </p>
              <div className="p-3 bg-white rounded-xl border border-purple-200/80 space-y-1.5 text-xs text-purple-900">
                <div className="font-bold">標準常態累積分配函數 (Normal CDF)：</div>
                <div className="font-mono bg-purple-50 p-2 rounded text-[11px]">
                  Z = ( 量尺分 - 500 ) ÷ 100<br />
                  Norm PR = Φ(Z) × 100%
                </div>
                <p className="text-[11px] text-slate-500 pt-1">
                  💡 說明：即便全班只有 1 位學生作答，也能獨立換算其國際常模 PR。例如量尺 571 分換算為 Z = +0.71，累積機率為 76%，即 <strong>PR 76</strong>！
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            區塊五：作答計分與 AI / 教師雙軌閱卷機制
           ========================================================================= */}
        <section className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-md shadow-rose-200">
              5
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                題目作答評分與 AI / 教師雙軌閱卷機制
              </h3>
              <p className="text-xs text-slate-500">
                客觀選擇題自動核對 ＋ 開放簡答題真實規準深度批改
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                客觀選擇題 (MCQ)
              </span>
              <p className="text-xs text-slate-600 leading-relaxed">
                包含單選文字題、圖片情境題等，學生繳卷後由系統即時核對官方標準答案，完全客觀計分。
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 space-y-2">
              <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Gemini AI 智能初評
              </span>
              <p className="text-xs text-slate-600 leading-relaxed">
                開放簡答題依據 IEA 官方評分規準（0/1/2/3分標準），由 AI 深入比對文本關鍵事證進行評分並給予三明治回饋。
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-amber-100 bg-amber-50/40 space-y-2">
              <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-amber-600" />
                教師專業網頁模式複閱
              </span>
              <p className="text-xs text-slate-600 leading-relaxed">
                老師可在寬廣的網頁端批改介面進行複閱、改分與個別化指導，系統以老師複閱之最終分數為最高準則！
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================================
            區塊六：互動試算小工具（Live Score Calculator）
           ========================================================================= */}
        <section className="bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-800/60 pb-5">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                <Calculator className="w-3.5 h-3.5 text-amber-300" />
                PIRLS 國際量尺動態試算模擬器
              </div>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight">
                親自試算看看：原始得分如何轉換為國際量尺分？
              </h3>
            </div>
            <span className="text-xs text-indigo-300">
              即時連動常模公式與基準判斷
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* 左側輸入區 (佔 6 欄) */}
            <div className="lg:col-span-6 space-y-4 bg-white/10 p-5 rounded-2xl border border-white/10">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-indigo-200 mb-1">
                    題目滿分總分
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={calcTotal}
                    onChange={(e) => setCalcTotal(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full bg-slate-900/80 border border-indigo-400/40 rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-indigo-200 mb-1">
                    學生獲得分數
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={calcTotal}
                    value={calcEarned}
                    onChange={(e) => setCalcEarned(Math.max(0, Math.min(calcTotal, parseInt(e.target.value, 10) || 0)))}
                    className="w-full bg-slate-900/80 border border-indigo-400/40 rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>

              {/* 滑桿控制 */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs font-semibold text-indigo-200">
                  <span>得分掌握率：{rawPercentage}%</span>
                  <span>({calcEarned} / {calcTotal} 分)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={calcTotal}
                  value={calcEarned}
                  onChange={(e) => setCalcEarned(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-indigo-950 rounded-lg appearance-none cursor-pointer accent-sky-400"
                />
              </div>

              <p className="text-[11px] text-slate-300">
                可隨意調整上方得分或拖動滑桿，右側將即時依據公式試算其對應的國際標準量尺、常模 PR 與基準。
              </p>
            </div>

            {/* 右側結果展示 (佔 6 欄) */}
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* 量尺分數卡 */}
              <div className="bg-white/10 p-4 rounded-2xl border border-white/10 flex flex-col justify-between">
                <div className="text-xs text-indigo-200 font-semibold">PIRLS 國際量尺估計分</div>
                <div className="text-3xl font-black text-white mt-2">
                  {estimatedScale} <span className="text-xs font-normal text-slate-300">分</span>
                </div>
                <div className="text-[11px] text-indigo-300 mt-2 border-t border-white/10 pt-1.5">
                  全球平均 500 分 • 標準差 100
                </div>
              </div>

              {/* 國際常模 PR */}
              <div className="bg-white/10 p-4 rounded-2xl border border-white/10 flex flex-col justify-between">
                <div className="text-xs text-indigo-200 font-semibold">國際常模對照 (Norm PR)</div>
                <div className="text-3xl font-black text-white mt-2">
                  PR {estimatedPR}
                </div>
                <div className="text-[11px] text-indigo-300 mt-2 border-t border-white/10 pt-1.5">
                  相當於常態分佈前 {100 - estimatedPR}%
                </div>
              </div>

              {/* 基準等級徽章 (全寬) */}
              <div className="sm:col-span-2 bg-white/10 p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-xs text-indigo-200 font-semibold">落點國際基準等級</div>
                  <div className="text-base font-bold text-white mt-1">
                    {benchmark.name} ({benchmark.enName})
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    基準區間：{benchmark.minScore} ～ {benchmark.maxScore >= 1000 ? '以上' : benchmark.maxScore} 分
                  </div>
                </div>
                <span className={`px-3 py-1.5 rounded-xl font-bold text-xs shadow-sm ${benchmark.badgeColor}`}>
                  {benchmark.name}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 底部返回按鈕 */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 print:hidden">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            返回首頁
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/practice"
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
            >
              前往閱讀自主練習
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
            >
              進入評量平臺
            </Link>
          </div>
        </div>
      </main>

      {/* 頁尾 */}
      <footer className="border-t bg-white py-6 text-center text-xs text-slate-500 print:hidden">
        <p>PIRLS 智慧閱讀素養評量平臺 © 2026 • 國際標準計分與心理計量常模指南</p>
      </footer>
    </div>
  );
}
