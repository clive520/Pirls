import React from 'react';

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

interface ThinkingSkillsRadarCardProps {
  title?: string;
  subtitle?: string;
  radarTitle?: string;
  data: ThinkingSkillsData;
  isClassAggregate?: boolean;
  className?: string;
}

export const ThinkingSkillsRadarCard: React.FC<ThinkingSkillsRadarCardProps> = ({
  title = '各層次思維能力落點分析',
  subtitle,
  radarTitle = 'PIRLS 四個思考能力雷達',
  data,
  isClassAggregate = false,
  className = '',
}) => {
  const l1 = data.level1 || { percentage: 0 };
  const l2 = data.level2 || { percentage: 0 };
  const l3 = data.level3 || { percentage: 0 };
  const l4 = data.level4 || { percentage: 0 };

  // 四維素養雷達圖多邊形計算 (中心 (240, 160)，最大半徑 85)
  const cx = 240;
  const cy = 160;
  const maxR = 85;
  const r1 = Math.max(5, (Math.min(100, Math.max(0, l1.percentage)) / 100) * maxR);
  const r2 = Math.max(5, (Math.min(100, Math.max(0, l2.percentage)) / 100) * maxR);
  const r3 = Math.max(5, (Math.min(100, Math.max(0, l3.percentage)) / 100) * maxR);
  const r4 = Math.max(5, (Math.min(100, Math.max(0, l4.percentage)) / 100) * maxR);

  // 上 (0, -r1), 右 (r2, 0), 下 (0, r3), 左 (-r4, 0)
  const polygonPoints = `${cx},${cy - r1} ${cx + r2},${cy} ${cx},${cy + r3} ${cx - r4},${cy}`;

  return (
    <div className={`bg-white rounded-3xl border border-slate-200 shadow-sm p-6 grid grid-cols-1 md:grid-cols-12 gap-8 items-center ${className}`}>
      {/* 左側：原生 SVG 四維雷達圖 (佔 5 欄) */}
      <div className="md:col-span-5 flex flex-col items-center justify-center p-2 sm:p-4">
        <h3 className="text-sm font-bold text-slate-800 mb-2">{radarTitle}</h3>
        <svg viewBox="0 0 480 320" className="w-full max-w-[340px] h-auto">
          {/* 背景網格同心菱形 (25%, 50%, 75%, 100%) */}
          <polygon points="240,75 325,160 240,245 155,160" fill="none" stroke="#e2e8f0" strokeWidth="1.2" />
          <polygon points="240,96.25 303.75,160 240,223.75 176.25,160" fill="none" stroke="#e2e8f0" strokeWidth="1" />
          <polygon points="240,117.5 282.5,160 240,202.5 197.5,160" fill="none" stroke="#e2e8f0" strokeWidth="1" />
          <polygon points="240,138.75 261.25,160 240,181.25 218.75,160" fill="none" stroke="#f1f5f9" strokeWidth="0.8" />

          {/* 十字軸線 */}
          <line x1="240" y1="62" x2="240" y2="258" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3,3" />
          <line x1="142" y1="160" x2="338" y2="160" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3,3" />

          {/* 學生/班級能力多邊形 */}
          <polygon points={polygonPoints} fill="#6366f1" fillOpacity="0.35" stroke="#4f46e5" strokeWidth="2.5" />

          {/* 四個頂點圓點 */}
          <circle cx={cx} cy={cy - r1} r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx={cx + r2} cy={cy} r="4.5" fill="#059669" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx={cx} cy={cy + r3} r="4.5" fill="#d97706" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx={cx - r4} cy={cy} r="4.5" fill="#7c3aed" stroke="#ffffff" strokeWidth="1.5" />

          {/* 軸標籤 */}
          <text x="240" y="42" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#1e40af">
            L1 直接提取 ({l1.percentage}%)
          </text>
          <text x="345" y="164" textAnchor="start" fontSize="11" fontWeight="bold" fill="#065f46">
            L2 直接推論 ({l2.percentage}%)
          </text>
          <text x="240" y="282" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#92400e">
            L3 詮釋整合 ({l3.percentage}%)
          </text>
          <text x="135" y="164" textAnchor="end" fontSize="11" fontWeight="bold" fill="#5b21b6">
            L4 檢驗評估 ({l4.percentage}%)
          </text>
        </svg>
      </div>

      {/* 右側：四大層次指標卡片與優勢分析 (佔 7 欄) */}
      <div className="md:col-span-7 space-y-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* L1 */}
          <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/50">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-blue-900">第一層：直接提取訊息</span>
              <span className="text-xs font-black text-blue-700">{l1.percentage}%</span>
            </div>
            <div className="w-full bg-blue-200/60 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${l1.percentage}%` }} />
            </div>
            <p className="text-[11px] text-blue-800/80 mt-2">
              {l1.earned !== undefined && l1.total !== undefined
                ? `得分 ${l1.earned}/${l1.total} 分 • `
                : isClassAggregate
                ? '全班掌握率 • '
                : ''}
              {l1.description || '能快速鎖定時間、人物與具體事實。'}
            </p>
          </div>

          {/* L2 */}
          <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/50">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-emerald-900">第二層：直接推論</span>
              <span className="text-xs font-black text-emerald-700">{l2.percentage}%</span>
            </div>
            <div className="w-full bg-emerald-200/60 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="bg-emerald-600 h-full transition-all duration-500" style={{ width: `${l2.percentage}%` }} />
            </div>
            <p className="text-[11px] text-emerald-800/80 mt-2">
              {l2.earned !== undefined && l2.total !== undefined
                ? `得分 ${l2.earned}/${l2.total} 分 • `
                : isClassAggregate
                ? '全班掌握率 • '
                : ''}
              {l2.description || '能順利串聯線索，理解隱含的因果關係。'}
            </p>
          </div>

          {/* L3 */}
          <div className="p-3.5 rounded-xl border border-amber-100 bg-amber-50/50">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-amber-900">第三層：詮釋整合觀點</span>
              <span className="text-xs font-black text-amber-700">{l3.percentage}%</span>
            </div>
            <div className="w-full bg-amber-200/60 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="bg-amber-600 h-full transition-all duration-500" style={{ width: `${l3.percentage}%` }} />
            </div>
            <p className="text-[11px] text-amber-800/80 mt-2">
              {l3.earned !== undefined && l3.total !== undefined
                ? `得分 ${l3.earned}/${l3.total} 分 • `
                : isClassAggregate
                ? '全班掌握率 • '
                : ''}
              {l3.description || '能跨越段落歸納文章主旨與人物心態。'}
            </p>
          </div>

          {/* L4 */}
          <div className="p-3.5 rounded-xl border border-purple-100 bg-purple-50/50">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-purple-900">第四層：檢驗與評估</span>
              <span className="text-xs font-black text-purple-700">{l4.percentage}%</span>
            </div>
            <div className="w-full bg-purple-200/60 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="bg-purple-600 h-full transition-all duration-500" style={{ width: `${l4.percentage}%` }} />
            </div>
            <p className="text-[11px] text-purple-800/80 mt-2">
              {l4.earned !== undefined && l4.total !== undefined
                ? `得分 ${l4.earned}/${l4.total} 分 • `
                : isClassAggregate
                ? '全班掌握率 • '
                : ''}
              {l4.description || '能客觀反思寫作手法並連結現實經驗。'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
