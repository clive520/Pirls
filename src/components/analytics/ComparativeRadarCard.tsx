import React from 'react';
import { LevelComparisonItem } from '@/lib/types';
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';

interface ComparativeRadarCardProps {
  levels: {
    level1: LevelComparisonItem;
    level2: LevelComparisonItem;
    level3: LevelComparisonItem;
    level4: LevelComparisonItem;
  };
  preTitle?: string;
  postTitle?: string;
  title?: string;
  subtitle?: string;
  radarTitle?: string;
  isClassAggregate?: boolean;
  className?: string;
}

export const ComparativeRadarCard: React.FC<ComparativeRadarCardProps> = ({
  levels,
  preTitle = '前測診斷',
  postTitle = '後測評量',
  title = '各層次思維能力成長對照分析',
  subtitle,
  radarTitle = 'PIRLS 四維思維能力雙層對照雷達',
  isClassAggregate = false,
  className = '',
}) => {
  const { level1: l1, level2: l2, level3: l3, level4: l4 } = levels;

  // 雷達圖座標參數 (中心 240, 160，最大半徑 85)
  const cx = 240;
  const cy = 160;
  const maxR = 85;

  // 前測半徑計算
  const preR1 = Math.max(5, (Math.min(100, Math.max(0, l1.prePercentage)) / 100) * maxR);
  const preR2 = Math.max(5, (Math.min(100, Math.max(0, l2.prePercentage)) / 100) * maxR);
  const preR3 = Math.max(5, (Math.min(100, Math.max(0, l3.prePercentage)) / 100) * maxR);
  const preR4 = Math.max(5, (Math.min(100, Math.max(0, l4.prePercentage)) / 100) * maxR);
  const prePolygon = `${cx},${cy - preR1} ${cx + preR2},${cy} ${cx},${cy + preR3} ${cx - preR4},${cy}`;

  // 後測半徑計算
  const postR1 = Math.max(5, (Math.min(100, Math.max(0, l1.postPercentage)) / 100) * maxR);
  const postR2 = Math.max(5, (Math.min(100, Math.max(0, l2.postPercentage)) / 100) * maxR);
  const postR3 = Math.max(5, (Math.min(100, Math.max(0, l3.postPercentage)) / 100) * maxR);
  const postR4 = Math.max(5, (Math.min(100, Math.max(0, l4.postPercentage)) / 100) * maxR);
  const postPolygon = `${cx},${cy - postR1} ${cx + postR2},${cy} ${cx},${cy + postR3} ${cx - postR4},${cy}`;

  // 成長徽章格式化
  const renderDeltaBadge = (delta: number) => {
    if (delta > 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full">
          <TrendingUp className="w-3 h-3 text-emerald-600" />
          +{delta}% 成長
        </span>
      );
    }
    if (delta < 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-xs font-bold text-rose-700 bg-rose-100/90 px-2 py-0.5 rounded-full">
          <TrendingDown className="w-3 h-3 text-rose-600" />
          {delta}% 需加強
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
        <Minus className="w-3 h-3 text-slate-500" />
        持平 0%
      </span>
    );
  };

  return (
    <div className={`bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center ${className}`}>
      {/* 左側：原生 SVG 雙層雷達圖 (佔 5 欄) */}
      <div className="lg:col-span-5 flex flex-col items-center justify-center p-2">
        <div className="text-center mb-1">
          <h3 className="text-sm font-bold text-slate-800">{radarTitle}</h3>
          <p className="text-xs text-slate-500">前測虛線 vs 後測實線能力擴張</p>
        </div>

        {/* 圖例說明 */}
        <div className="flex items-center justify-center gap-4 text-xs font-medium my-2 bg-slate-50 py-1.5 px-3 rounded-full border border-slate-200/60">
          <div className="flex items-center gap-1.5 text-sky-700">
            <span className="w-3.5 h-1.5 rounded-sm bg-sky-400 border border-sky-600 border-dashed" />
            <span className="truncate max-w-[110px]" title={preTitle}>
              前測：{preTitle}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-700">
            <span className="w-3.5 h-2 rounded-sm bg-emerald-500 border border-emerald-700" />
            <span className="truncate max-w-[110px]" title={postTitle}>
              後測：{postTitle}
            </span>
          </div>
        </div>

        <svg viewBox="0 0 480 320" className="w-full max-w-[370px] h-auto drop-shadow-sm">
          {/* 背景網格同心菱形 (25%, 50%, 75%, 100%) */}
          <polygon points="240,75 325,160 240,245 155,160" fill="none" stroke="#e2e8f0" strokeWidth="1.2" />
          <polygon points="240,96.25 303.75,160 240,223.75 176.25,160" fill="none" stroke="#e2e8f0" strokeWidth="1" />
          <polygon points="240,117.5 282.5,160 240,202.5 197.5,160" fill="none" stroke="#e2e8f0" strokeWidth="1" />
          <polygon points="240,138.75 261.25,160 240,181.25 218.75,160" fill="none" stroke="#f1f5f9" strokeWidth="0.8" />

          {/* 十字軸線 */}
          <line x1="240" y1="62" x2="240" y2="258" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3,3" />
          <line x1="142" y1="160" x2="338" y2="160" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3,3" />

          {/* 1. 前測能力多邊形 (天藍色半透明 + 虛線邊框) */}
          <polygon
            points={prePolygon}
            fill="#38bdf8"
            fillOpacity="0.25"
            stroke="#0284c7"
            strokeWidth="2"
            strokeDasharray="4,4"
          />

          {/* 2. 後測能力多邊形 (翡翠綠半透明 + 實線邊框) */}
          <polygon
            points={postPolygon}
            fill="#10b981"
            fillOpacity="0.32"
            stroke="#059669"
            strokeWidth="2.5"
          />

          {/* 前測頂點圓點 */}
          <circle cx={cx} cy={cy - preR1} r="3.5" fill="#0284c7" stroke="#ffffff" strokeWidth="1" />
          <circle cx={cx + preR2} cy={cy} r="3.5" fill="#0284c7" stroke="#ffffff" strokeWidth="1" />
          <circle cx={cx} cy={cy + preR3} r="3.5" fill="#0284c7" stroke="#ffffff" strokeWidth="1" />
          <circle cx={cx - preR4} cy={cy} r="3.5" fill="#0284c7" stroke="#ffffff" strokeWidth="1" />

          {/* 後測頂點圓點 */}
          <circle cx={cx} cy={cy - postR1} r="4.5" fill="#059669" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx={cx + postR2} cy={cy} r="4.5" fill="#059669" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx={cx} cy={cy + postR3} r="4.5" fill="#059669" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx={cx - postR4} cy={cy} r="4.5" fill="#059669" stroke="#ffffff" strokeWidth="1.5" />

          {/* 軸標籤與差值文字 */}
          <text x="240" y="38" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#1e40af">
            L1 直接提取 ({l1.prePercentage}% ➔ {l1.postPercentage}%)
          </text>
          <text x="348" y="164" textAnchor="start" fontSize="11" fontWeight="bold" fill="#065f46">
            L2 直接推論 ({l2.prePercentage}% ➔ {l2.postPercentage}%)
          </text>
          <text x="240" y="284" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#92400e">
            L3 詮釋整合 ({l3.prePercentage}% ➔ {l3.postPercentage}%)
          </text>
          <text x="132" y="164" textAnchor="end" fontSize="11" fontWeight="bold" fill="#5b21b6">
            L4 檢驗評估 ({l4.prePercentage}% ➔ {l4.postPercentage}%)
          </text>
        </svg>
      </div>

      {/* 右側：四大層次對照指標卡片 (佔 7 欄) */}
      <div className="lg:col-span-7 space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {isClassAggregate ? '班級整體平均' : '個別學生歷程'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* L1 卡片 */}
          <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/50 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start gap-1">
                <span className="text-xs font-bold text-blue-950">第一層：直接提取訊息</span>
                {renderDeltaBadge(l1.deltaPercentage)}
              </div>

              {/* 雙進度條對比 */}
              <div className="space-y-1.5 my-2.5">
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>前測</span>
                    <span className="font-semibold text-slate-600">{l1.prePercentage}%</span>
                  </div>
                  <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-sky-500/80 h-full transition-all duration-500" style={{ width: `${l1.prePercentage}%` }} />
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="flex justify-between text-[11px] text-blue-900 font-medium">
                    <span>後測</span>
                    <span className="font-bold text-blue-700">{l1.postPercentage}%</span>
                  </div>
                  <div className="w-full bg-blue-200/60 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${l1.postPercentage}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-blue-900/80 leading-relaxed pt-1 border-t border-blue-100/60">
              {l1.preEarned !== undefined && l1.postEarned !== undefined
                ? `前測得分 ${l1.preEarned} ➔ 後測 ${l1.postEarned} 分 • `
                : ''}
              {l1.description}
            </p>
          </div>

          {/* L2 卡片 */}
          <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/50 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start gap-1">
                <span className="text-xs font-bold text-emerald-950">第二層：直接推論</span>
                {renderDeltaBadge(l2.deltaPercentage)}
              </div>

              {/* 雙進度條對比 */}
              <div className="space-y-1.5 my-2.5">
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>前測</span>
                    <span className="font-semibold text-slate-600">{l2.prePercentage}%</span>
                  </div>
                  <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-sky-500/80 h-full transition-all duration-500" style={{ width: `${l2.prePercentage}%` }} />
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="flex justify-between text-[11px] text-emerald-900 font-medium">
                    <span>後測</span>
                    <span className="font-bold text-emerald-700">{l2.postPercentage}%</span>
                  </div>
                  <div className="w-full bg-emerald-200/60 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-full transition-all duration-500" style={{ width: `${l2.postPercentage}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-emerald-900/80 leading-relaxed pt-1 border-t border-emerald-100/60">
              {l2.preEarned !== undefined && l2.postEarned !== undefined
                ? `前測得分 ${l2.preEarned} ➔ 後測 ${l2.postEarned} 分 • `
                : ''}
              {l2.description}
            </p>
          </div>

          {/* L3 卡片 */}
          <div className="p-4 rounded-2xl border border-amber-100 bg-amber-50/50 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start gap-1">
                <span className="text-xs font-bold text-amber-950">第三層：詮釋整合觀點</span>
                {renderDeltaBadge(l3.deltaPercentage)}
              </div>

              {/* 雙進度條對比 */}
              <div className="space-y-1.5 my-2.5">
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>前測</span>
                    <span className="font-semibold text-slate-600">{l3.prePercentage}%</span>
                  </div>
                  <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-sky-500/80 h-full transition-all duration-500" style={{ width: `${l3.prePercentage}%` }} />
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="flex justify-between text-[11px] text-amber-900 font-medium">
                    <span>後測</span>
                    <span className="font-bold text-amber-700">{l3.postPercentage}%</span>
                  </div>
                  <div className="w-full bg-amber-200/60 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-600 h-full transition-all duration-500" style={{ width: `${l3.postPercentage}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-amber-900/80 leading-relaxed pt-1 border-t border-amber-100/60">
              {l3.preEarned !== undefined && l3.postEarned !== undefined
                ? `前測得分 ${l3.preEarned} ➔ 後測 ${l3.postEarned} 分 • `
                : ''}
              {l3.description}
            </p>
          </div>

          {/* L4 卡片 */}
          <div className="p-4 rounded-2xl border border-purple-100 bg-purple-50/50 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start gap-1">
                <span className="text-xs font-bold text-purple-950">第四層：檢驗與評估</span>
                {renderDeltaBadge(l4.deltaPercentage)}
              </div>

              {/* 雙進度條對比 */}
              <div className="space-y-1.5 my-2.5">
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>前測</span>
                    <span className="font-semibold text-slate-600">{l4.prePercentage}%</span>
                  </div>
                  <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-sky-500/80 h-full transition-all duration-500" style={{ width: `${l4.prePercentage}%` }} />
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="flex justify-between text-[11px] text-purple-900 font-medium">
                    <span>後測</span>
                    <span className="font-bold text-purple-700">{l4.postPercentage}%</span>
                  </div>
                  <div className="w-full bg-purple-200/60 h-2 rounded-full overflow-hidden">
                    <div className="bg-purple-600 h-full transition-all duration-500" style={{ width: `${l4.postPercentage}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-purple-900/80 leading-relaxed pt-1 border-t border-purple-100/60">
              {l4.preEarned !== undefined && l4.postEarned !== undefined
                ? `前測得分 ${l4.preEarned} ➔ 後測 ${l4.postEarned} 分 • `
                : ''}
              {l4.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
