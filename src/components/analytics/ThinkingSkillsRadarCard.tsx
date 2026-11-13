import React from 'react';
import Link from 'next/link';
import { HelpCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface ProcessLevelItem {
  earned?: number;
  total?: number;
  percentage: number;
  description?: string;
}

export interface ThinkingSkillsData {
  level1: ProcessLevelItem;
  level2: ProcessLevelItem;
  level3: ProcessLevelItem;
  level4: ProcessLevelItem;
}

export interface ThinkingSkillsRadarCardProps {
  title?: string;
  subtitle?: string;
  radarTitle?: string;
  data: ThinkingSkillsData;
  classData?: ThinkingSkillsData;
  isClassAggregate?: boolean;
  className?: string;
}

export const ThinkingSkillsRadarCard: React.FC<ThinkingSkillsRadarCardProps> = ({
  title,
  subtitle,
  radarTitle,
  data,
  classData,
  isClassAggregate = false,
  className = '',
}) => {
  const l1 = data.level1 || { percentage: 0 };
  const l2 = data.level2 || { percentage: 0 };
  const l3 = data.level3 || { percentage: 0 };
  const l4 = data.level4 || { percentage: 0 };

  const cl1 = classData?.level1;
  const cl2 = classData?.level2;
  const cl3 = classData?.level3;
  const cl4 = classData?.level4;

  const hasClassComparison = !!classData && !isClassAggregate;

  // 預設標題配置（對齊 PIRLS 學科向度規範）
  const resolvedRadarTitle =
    radarTitle ||
    (hasClassComparison
      ? '學科向度雷達圖 (個人 vs 班級)'
      : isClassAggregate
      ? '學科向度雷達圖 (全班平均落點)'
      : '學科向度雷達圖 (個人能力落點)');

  const resolvedTitle =
    title ||
    (hasClassComparison
      ? '學科向度思維能力落點分析 (個人 vs 班級)'
      : isClassAggregate
      ? '全班各向度思維能力落點分析'
      : '各層次思維能力落點分析');

  const resolvedSubtitle =
    subtitle ||
    (hasClassComparison
      ? 'PIRLS 四大思考歷程：個人各向度得分掌握率與全班平均對照'
      : isClassAggregate
      ? '全班在四大思維歷程之平均掌握率與整體能力分佈'
      : '鎖定四大思考歷程之個人得分與認知能力向度');

  // 雷達圖座標參數 (中心 (240, 165)，最大半徑 85，viewBox 0 0 480 330)
  const cx = 240;
  const cy = 165;
  const maxR = 85;

  // 個人/主要多邊形半徑計算
  const r1 = Math.max(5, (Math.min(100, Math.max(0, l1.percentage)) / 100) * maxR);
  const r2 = Math.max(5, (Math.min(100, Math.max(0, l2.percentage)) / 100) * maxR);
  const r3 = Math.max(5, (Math.min(100, Math.max(0, l3.percentage)) / 100) * maxR);
  const r4 = Math.max(5, (Math.min(100, Math.max(0, l4.percentage)) / 100) * maxR);
  const polygonPoints = `${cx},${cy - r1} ${cx + r2},${cy} ${cx},${cy + r3} ${cx - r4},${cy}`;

  // 班級平均多邊形半徑計算（若有班級對照）
  const cr1 = cl1 ? Math.max(5, (Math.min(100, Math.max(0, cl1.percentage)) / 100) * maxR) : 0;
  const cr2 = cl2 ? Math.max(5, (Math.min(100, Math.max(0, cl2.percentage)) / 100) * maxR) : 0;
  const cr3 = cl3 ? Math.max(5, (Math.min(100, Math.max(0, cl3.percentage)) / 100) * maxR) : 0;
  const cr4 = cl4 ? Math.max(5, (Math.min(100, Math.max(0, cl4.percentage)) / 100) * maxR) : 0;
  const classPolygonPoints = `${cx},${cy - cr1} ${cx + cr2},${cy} ${cx},${cy + cr3} ${cx - cr4},${cy}`;

  // 輔助格式化個人得分文字
  const renderScoreText = (item: ProcessLevelItem) => {
    if (item.earned !== undefined && item.total !== undefined) {
      return `${item.earned}/${item.total}分 (${item.percentage}%)`;
    }
    return `${item.percentage}%`;
  };

  return (
    <div className={`bg-white rounded-3xl border border-slate-200 shadow-sm p-6 grid grid-cols-1 md:grid-cols-12 gap-8 items-center ${className}`}>
      {/* 左側：原生 SVG 雙層/單層雷達圖 (佔 5 欄) */}
      <div className="md:col-span-5 flex flex-col items-center justify-center p-2 sm:p-4">
        <h3 className="text-base font-bold text-slate-900 mb-2 text-center">{resolvedRadarTitle}</h3>

        {/* 圖例說明列 */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-semibold mb-3 bg-slate-50 py-1.5 px-3.5 rounded-full border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-1.5 text-indigo-700">
            <span className="w-3.5 h-2 rounded-sm bg-indigo-500 border border-indigo-700 shadow-2xs" />
            <span>{isClassAggregate ? '全班平均掌握率' : '🔵 個人得分'}</span>
          </div>
          {hasClassComparison && (
            <div className="flex items-center gap-1.5 text-amber-700">
              <span className="w-3.5 h-1.5 rounded-sm bg-amber-400 border border-amber-600 border-dashed" />
              <span>🟠 全班平均</span>
            </div>
          )}
        </div>

        <svg viewBox="0 0 480 330" className="w-full max-w-[370px] h-auto drop-shadow-2xs">
          {/* 背景網格同心菱形 (25%, 50%, 75%, 100%) */}
          <polygon points="240,80 325,165 240,250 155,165" fill="none" stroke="#e2e8f0" strokeWidth="1.2" />
          <polygon points="240,101.25 303.75,165 240,228.75 176.25,165" fill="none" stroke="#e2e8f0" strokeWidth="1" />
          <polygon points="240,122.5 282.5,165 240,207.5 197.5,165" fill="none" stroke="#e2e8f0" strokeWidth="1" />
          <polygon points="240,143.75 261.25,165 240,186.25 218.75,165" fill="none" stroke="#f1f5f9" strokeWidth="0.8" />

          {/* 刻度數值標記 (25, 50, 75, 100) */}
          <text x="244" y="146" fontSize="9" fill="#94a3b8" fontWeight="600">25%</text>
          <text x="244" y="125" fontSize="9" fill="#94a3b8" fontWeight="600">50%</text>
          <text x="244" y="104" fontSize="9" fill="#94a3b8" fontWeight="600">75%</text>
          <text x="244" y="83" fontSize="9" fill="#94a3b8" fontWeight="600">100%</text>

          {/* 十字軸線 */}
          <line x1="240" y1="68" x2="240" y2="262" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3,3" />
          <line x1="142" y1="165" x2="338" y2="165" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3,3" />

          {/* 1. 班級平均多邊形 (琥珀色半透明 + 虛線邊框，底層) */}
          {hasClassComparison && (
            <>
              <polygon
                points={classPolygonPoints}
                fill="#f59e0b"
                fillOpacity="0.2"
                stroke="#d97706"
                strokeWidth="2"
                strokeDasharray="4,4"
              />
              <circle cx={cx} cy={cy - cr1} r="3.5" fill="#d97706" stroke="#ffffff" strokeWidth="1" />
              <circle cx={cx + cr2} cy={cy} r="3.5" fill="#d97706" stroke="#ffffff" strokeWidth="1" />
              <circle cx={cx} cy={cy + cr3} r="3.5" fill="#d97706" stroke="#ffffff" strokeWidth="1" />
              <circle cx={cx - cr4} cy={cy} r="3.5" fill="#d97706" stroke="#ffffff" strokeWidth="1" />
            </>
          )}

          {/* 2. 個人得分能力多邊形 (靛藍色 + 實線邊框，頂層) */}
          <polygon
            points={polygonPoints}
            fill="#6366f1"
            fillOpacity="0.32"
            stroke="#4f46e5"
            strokeWidth="2.5"
          />

          {/* 個人頂點圓點 */}
          <circle cx={cx} cy={cy - r1} r="5" fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx={cx + r2} cy={cy} r="5" fill="#059669" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx={cx} cy={cy + r3} r="5" fill="#d97706" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx={cx - r4} cy={cy} r="5" fill="#7c3aed" stroke="#ffffff" strokeWidth="1.5" />

          {/* 四軸向度標籤與個人得分詳細標註 */}
          {/* Top: L1 直接提取 */}
          <text x="240" y="24" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#1e40af">
            L1 直接提取
          </text>
          <text x="240" y="40" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#2563eb">
            {isClassAggregate ? `全班 ${l1.percentage}%` : `個人得分: ${renderScoreText(l1)}`}
          </text>
          {hasClassComparison && cl1 && (
            <text x="240" y="54" textAnchor="middle" fontSize="10" fontWeight="semibold" fill="#b45309">
              班級平均: {cl1.percentage}%
            </text>
          )}

          {/* Right: L2 直接推論 */}
          <text x="348" y="148" textAnchor="start" fontSize="12" fontWeight="bold" fill="#065f46">
            L2 直接推論
          </text>
          <text x="348" y="164" textAnchor="start" fontSize="11" fontWeight="bold" fill="#059669">
            {isClassAggregate ? `全班 ${l2.percentage}%` : `個人: ${renderScoreText(l2)}`}
          </text>
          {hasClassComparison && cl2 && (
            <text x="348" y="179" textAnchor="start" fontSize="10" fontWeight="semibold" fill="#b45309">
              班級: {cl2.percentage}%
            </text>
          )}

          {/* Bottom: L3 詮釋整合 */}
          <text x="240" y="278" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#92400e">
            L3 詮釋整合
          </text>
          <text x="240" y="294" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#d97706">
            {isClassAggregate ? `全班 ${l3.percentage}%` : `個人得分: ${renderScoreText(l3)}`}
          </text>
          {hasClassComparison && cl3 && (
            <text x="240" y="308" textAnchor="middle" fontSize="10" fontWeight="semibold" fill="#b45309">
              班級平均: {cl3.percentage}%
            </text>
          )}

          {/* Left: L4 檢驗評估 */}
          <text x="132" y="148" textAnchor="end" fontSize="12" fontWeight="bold" fill="#5b21b6">
            L4 檢驗評估
          </text>
          <text x="132" y="164" textAnchor="end" fontSize="11" fontWeight="bold" fill="#7c3aed">
            {isClassAggregate ? `全班 ${l4.percentage}%` : `個人: ${renderScoreText(l4)}`}
          </text>
          {hasClassComparison && cl4 && (
            <text x="132" y="179" textAnchor="end" fontSize="10" fontWeight="semibold" fill="#b45309">
              班級: {cl4.percentage}%
            </text>
          )}
        </svg>
      </div>

      {/* 右側：四大層次指標卡片與個人得分詳情 (佔 7 欄) */}
      <div className="md:col-span-7 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">{resolvedTitle}</h3>
            {resolvedSubtitle && <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{resolvedSubtitle}</p>}
          </div>
          <Link
            href="/guide/score-metrics#section-thinking-radar"
            target="_blank"
            className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 font-semibold flex-shrink-0"
            title="查看四層次思維能力如何計算"
          >
            <HelpCircle className="w-4 h-4" />
            <span>向度說明</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* L1 卡片 */}
          <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/50 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-xs sm:text-sm font-bold text-blue-950">第一層：直接提取訊息</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  L1 向度
                </span>
              </div>

              {/* 個人得分核心大字展示區 */}
              <div className="mt-2.5 flex items-baseline justify-between">
                <div>
                  <span className="text-[11px] font-bold text-blue-900/80 block">
                    {isClassAggregate ? '全班平均掌握率' : '個人得分'}
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl sm:text-2xl font-black text-blue-800">
                      {isClassAggregate
                        ? `${l1.percentage}%`
                        : l1.earned !== undefined && l1.total !== undefined
                        ? `${l1.earned} / ${l1.total} 分`
                        : `${l1.percentage}%`}
                    </span>
                    {!isClassAggregate && (
                      <span className="text-xs font-bold text-blue-700 bg-white/80 px-2 py-0.5 rounded-md border border-blue-200">
                        掌握率 {l1.percentage}%
                      </span>
                    )}
                  </div>
                </div>

                {hasClassComparison && cl1 && (
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-amber-900/80 block">班級平均</span>
                    <div className="text-sm sm:text-base font-bold text-amber-700 mt-0.5">
                      {cl1.percentage}%
                    </div>
                  </div>
                )}
              </div>

              {/* 進度條 (若有班級則為雙軌對照條) */}
              <div className="space-y-1.5 mt-3">
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[11px] text-blue-950 font-medium">
                    <span>{isClassAggregate ? '全班掌握率' : '個人掌握率'}</span>
                    <span className="font-bold text-blue-700">{l1.percentage}%</span>
                  </div>
                  <div className="w-full bg-blue-200/60 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full transition-all duration-500 rounded-full" style={{ width: `${l1.percentage}%` }} />
                  </div>
                </div>

                {hasClassComparison && cl1 && (
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[11px] text-amber-950 font-medium">
                      <span>全班平均</span>
                      <span className="font-bold text-amber-700">{cl1.percentage}%</span>
                    </div>
                    <div className="w-full bg-amber-200/60 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full transition-all duration-500 rounded-full" style={{ width: `${cl1.percentage}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 班級落差與教學指引 */}
            <div className="mt-3 pt-2 border-t border-blue-100/80 text-xs text-blue-950 leading-relaxed">
              {hasClassComparison && cl1 && (
                <div className="mb-1">
                  {l1.percentage >= cl1.percentage ? (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                      <TrendingUp className="w-3.5 h-3.5" />
                      高於全班平均 +{l1.percentage - cl1.percentage}%
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-bold text-rose-700">
                      <TrendingDown className="w-3.5 h-3.5" />
                      低於全班平均 {l1.percentage - cl1.percentage}%
                    </span>
                  )}
                </div>
              )}
              <p className="text-blue-900/90 font-medium">
                {l1.description || '能快速鎖定時間、人物與文句中明確呈現的事實細節。'}
              </p>
            </div>
          </div>

          {/* L2 卡片 */}
          <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/50 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-xs sm:text-sm font-bold text-emerald-950">第二層：直接推論</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  L2 向度
                </span>
              </div>

              {/* 個人得分核心大字展示區 */}
              <div className="mt-2.5 flex items-baseline justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-900/80 block">
                    {isClassAggregate ? '全班平均掌握率' : '個人得分'}
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl sm:text-2xl font-black text-emerald-800">
                      {isClassAggregate
                        ? `${l2.percentage}%`
                        : l2.earned !== undefined && l2.total !== undefined
                        ? `${l2.earned} / ${l2.total} 分`
                        : `${l2.percentage}%`}
                    </span>
                    {!isClassAggregate && (
                      <span className="text-xs font-bold text-emerald-700 bg-white/80 px-2 py-0.5 rounded-md border border-emerald-200">
                        掌握率 {l2.percentage}%
                      </span>
                    )}
                  </div>
                </div>

                {hasClassComparison && cl2 && (
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-amber-900/80 block">班級平均</span>
                    <div className="text-sm sm:text-base font-bold text-amber-700 mt-0.5">
                      {cl2.percentage}%
                    </div>
                  </div>
                )}
              </div>

              {/* 進度條 */}
              <div className="space-y-1.5 mt-3">
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[11px] text-emerald-950 font-medium">
                    <span>{isClassAggregate ? '全班掌握率' : '個人掌握率'}</span>
                    <span className="font-bold text-emerald-700">{l2.percentage}%</span>
                  </div>
                  <div className="w-full bg-emerald-200/60 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-full transition-all duration-500 rounded-full" style={{ width: `${l2.percentage}%` }} />
                  </div>
                </div>

                {hasClassComparison && cl2 && (
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[11px] text-amber-950 font-medium">
                      <span>全班平均</span>
                      <span className="font-bold text-amber-700">{cl2.percentage}%</span>
                    </div>
                    <div className="w-full bg-amber-200/60 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full transition-all duration-500 rounded-full" style={{ width: `${cl2.percentage}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 班級落差與教學指引 */}
            <div className="mt-3 pt-2 border-t border-emerald-100/80 text-xs text-emerald-950 leading-relaxed">
              {hasClassComparison && cl2 && (
                <div className="mb-1">
                  {l2.percentage >= cl2.percentage ? (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                      <TrendingUp className="w-3.5 h-3.5" />
                      高於全班平均 +{l2.percentage - cl2.percentage}%
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-bold text-rose-700">
                      <TrendingDown className="w-3.5 h-3.5" />
                      低於全班平均 {l2.percentage - cl2.percentage}%
                    </span>
                  )}
                </div>
              )}
              <p className="text-emerald-900/90 font-medium">
                {l2.description || '能順利串聯相鄰線索，理解隱含的前後因果關係與動機。'}
              </p>
            </div>
          </div>

          {/* L3 卡片 */}
          <div className="p-4 rounded-2xl border border-amber-100 bg-amber-50/50 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-xs sm:text-sm font-bold text-amber-950">第三層：詮釋整合觀點</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  L3 向度
                </span>
              </div>

              {/* 個人得分核心大字展示區 */}
              <div className="mt-2.5 flex items-baseline justify-between">
                <div>
                  <span className="text-[11px] font-bold text-amber-900/80 block">
                    {isClassAggregate ? '全班平均掌握率' : '個人得分'}
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl sm:text-2xl font-black text-amber-800">
                      {isClassAggregate
                        ? `${l3.percentage}%`
                        : l3.earned !== undefined && l3.total !== undefined
                        ? `${l3.earned} / ${l3.total} 分`
                        : `${l3.percentage}%`}
                    </span>
                    {!isClassAggregate && (
                      <span className="text-xs font-bold text-amber-700 bg-white/80 px-2 py-0.5 rounded-md border border-amber-200">
                        掌握率 {l3.percentage}%
                      </span>
                    )}
                  </div>
                </div>

                {hasClassComparison && cl3 && (
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-amber-900/80 block">班級平均</span>
                    <div className="text-sm sm:text-base font-bold text-amber-700 mt-0.5">
                      {cl3.percentage}%
                    </div>
                  </div>
                )}
              </div>

              {/* 進度條 */}
              <div className="space-y-1.5 mt-3">
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[11px] text-amber-950 font-medium">
                    <span>{isClassAggregate ? '全班掌握率' : '個人掌握率'}</span>
                    <span className="font-bold text-amber-700">{l3.percentage}%</span>
                  </div>
                  <div className="w-full bg-amber-200/60 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-600 h-full transition-all duration-500 rounded-full" style={{ width: `${l3.percentage}%` }} />
                  </div>
                </div>

                {hasClassComparison && cl3 && (
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[11px] text-amber-950 font-medium">
                      <span>全班平均</span>
                      <span className="font-bold text-amber-700">{cl3.percentage}%</span>
                    </div>
                    <div className="w-full bg-amber-200/60 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full transition-all duration-500 rounded-full" style={{ width: `${cl3.percentage}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 班級落差與教學指引 */}
            <div className="mt-3 pt-2 border-t border-amber-100/80 text-xs text-amber-950 leading-relaxed">
              {hasClassComparison && cl3 && (
                <div className="mb-1">
                  {l3.percentage >= cl3.percentage ? (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                      <TrendingUp className="w-3.5 h-3.5" />
                      高於全班平均 +{l3.percentage - cl3.percentage}%
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-bold text-rose-700">
                      <TrendingDown className="w-3.5 h-3.5" />
                      低於全班平均 {l3.percentage - cl3.percentage}%
                    </span>
                  )}
                </div>
              )}
              <p className="text-amber-900/90 font-medium">
                {l3.description || '能跨越段落歸納文章主旨、人物心態與全局觀點。'}
              </p>
            </div>
          </div>

          {/* L4 卡片 */}
          <div className="p-4 rounded-2xl border border-purple-100 bg-purple-50/50 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-xs sm:text-sm font-bold text-purple-950">第四層：檢驗與評估</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  L4 向度
                </span>
              </div>

              {/* 個人得分核心大字展示區 */}
              <div className="mt-2.5 flex items-baseline justify-between">
                <div>
                  <span className="text-[11px] font-bold text-purple-900/80 block">
                    {isClassAggregate ? '全班平均掌握率' : '個人得分'}
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl sm:text-2xl font-black text-purple-800">
                      {isClassAggregate
                        ? `${l4.percentage}%`
                        : l4.earned !== undefined && l4.total !== undefined
                        ? `${l4.earned} / ${l4.total} 分`
                        : `${l4.percentage}%`}
                    </span>
                    {!isClassAggregate && (
                      <span className="text-xs font-bold text-purple-700 bg-white/80 px-2 py-0.5 rounded-md border border-purple-200">
                        掌握率 {l4.percentage}%
                      </span>
                    )}
                  </div>
                </div>

                {hasClassComparison && cl4 && (
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-amber-900/80 block">班級平均</span>
                    <div className="text-sm sm:text-base font-bold text-amber-700 mt-0.5">
                      {cl4.percentage}%
                    </div>
                  </div>
                )}
              </div>

              {/* 進度條 */}
              <div className="space-y-1.5 mt-3">
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[11px] text-purple-950 font-medium">
                    <span>{isClassAggregate ? '全班掌握率' : '個人掌握率'}</span>
                    <span className="font-bold text-purple-700">{l4.percentage}%</span>
                  </div>
                  <div className="w-full bg-purple-200/60 h-2 rounded-full overflow-hidden">
                    <div className="bg-purple-600 h-full transition-all duration-500 rounded-full" style={{ width: `${l4.percentage}%` }} />
                  </div>
                </div>

                {hasClassComparison && cl4 && (
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[11px] text-amber-950 font-medium">
                      <span>全班平均</span>
                      <span className="font-bold text-amber-700">{cl4.percentage}%</span>
                    </div>
                    <div className="w-full bg-amber-200/60 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full transition-all duration-500 rounded-full" style={{ width: `${cl4.percentage}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 班級落差與教學指引 */}
            <div className="mt-3 pt-2 border-t border-purple-100/80 text-xs text-purple-950 leading-relaxed">
              {hasClassComparison && cl4 && (
                <div className="mb-1">
                  {l4.percentage >= cl4.percentage ? (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                      <TrendingUp className="w-3.5 h-3.5" />
                      高於全班平均 +{l4.percentage - cl4.percentage}%
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-bold text-rose-700">
                      <TrendingDown className="w-3.5 h-3.5" />
                      低於全班平均 {l4.percentage - cl4.percentage}%
                    </span>
                  )}
                </div>
              )}
              <p className="text-purple-900/90 font-medium">
                {l4.description || '能客觀審視反思寫作手法、評價論點並連結個人生活經驗。'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
