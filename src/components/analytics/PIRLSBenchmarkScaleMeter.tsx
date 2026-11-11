'use client';

import React from 'react';
import { Target, Bookmark } from 'lucide-react';
import { getBenchmarkInfo } from '@/lib/pirls-norm';

export interface PIRLSBenchmarkScaleMeterProps {
  scaleScore: number;
  classAvgScaleScore?: number;
  title?: string;
  showTitle?: boolean;
  showTopCard?: boolean;
  showBottomDescription?: boolean;
  isEyeCareLargeFont?: boolean;
  className?: string;
}

/**
 * PIRLS 國際標準基準落點可視化儀表 (IEA PIRLS Benchmark Spectrum Meter)
 * 依照 PIRLS 國際標準五大基準等級（<400 未達低、400 低、475 中、550 高、625 優秀/高級）
 * 繪製連續彩色光譜量尺、標記 500 常模平均、本次學生落點及班級平均位置。
 */
export const PIRLSBenchmarkScaleMeter: React.FC<PIRLSBenchmarkScaleMeterProps> = ({
  scaleScore,
  classAvgScaleScore,
  title = '一、PIRLS 國際標準基準落點',
  showTitle = true,
  showTopCard = true,
  showBottomDescription = true,
  isEyeCareLargeFont = false,
  className = '',
}) => {
  const benchmark = getBenchmarkInfo(scaleScore);

  // PIRLS 基準簡短英文對照
  const enBenchmarkShortMap: Record<string, string> = {
    advanced: 'Advanced',
    high: 'High',
    intermediate: 'Intermediate',
    low: 'Low',
    below_low: 'Below Low',
  };
  const benchmarkEn = enBenchmarkShortMap[benchmark.key] || 'Standard';

  // 基準級別專屬 Badge 顏色配置
  const badgeColorMap: Record<string, string> = {
    advanced: 'bg-purple-600 text-white',
    high: 'bg-blue-600 text-white',
    intermediate: 'bg-emerald-600 text-white',
    low: 'bg-amber-500 text-white',
    below_low: 'bg-rose-500 text-white',
  };
  const badgeBg = badgeColorMap[benchmark.key] || 'bg-blue-600 text-white';

  // 量尺座標計算：量尺範圍 300 ~ 750 (總跨距 450 分)
  const MIN_SCORE = 300;
  const MAX_SCORE = 750;
  const RANGE = MAX_SCORE - MIN_SCORE; // 450

  const getPositionPct = (score: number) => {
    const clamped = Math.min(MAX_SCORE, Math.max(MIN_SCORE, score));
    return ((clamped - MIN_SCORE) / RANGE) * 100;
  };

  const studentPct = getPositionPct(scaleScore);
  const classAvgPct = classAvgScaleScore !== undefined ? getPositionPct(classAvgScaleScore) : null;
  const norm500Pct = getPositionPct(500); // 44.444%

  // 避免 Tooltip 超出螢幕邊緣的 Clamp 計算
  const tooltipLeft = Math.min(88, Math.max(12, studentPct));

  return (
    <div className={`space-y-5 ${className}`}>
      {/* 區塊標題 */}
      {showTitle && (
        <div className="flex items-center space-x-2 text-slate-800">
          <Bookmark className="w-5 h-5 text-indigo-600 flex-shrink-0" />
          <h3
            className={`font-bold tracking-tight text-slate-900 ${
              isEyeCareLargeFont ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'
            }`}
          >
            {title}
          </h3>
        </div>
      )}

      {/* 頂部數據摘要卡 (PIRLS 國際常模標準分數 & 達成基準級別) */}
      {showTopCard && (
        <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* 左側：分數與常模描述 */}
            <div>
              <div
                className={`font-medium text-slate-500 ${
                  isEyeCareLargeFont ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
                }`}
              >
                PIRLS 國際常模標準分數
              </div>
              <div className="flex flex-wrap items-baseline gap-2.5 mt-1.5">
                <span
                  className={`font-black text-slate-900 tracking-tight ${
                    isEyeCareLargeFont ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl'
                  }`}
                >
                  {scaleScore}
                </span>
                <span
                  className={`text-slate-500 font-medium ${
                    isEyeCareLargeFont ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
                  }`}
                >
                  （常模平均 500 分，標準差 100）
                </span>
                {classAvgScaleScore !== undefined && (
                  <span
                    className={`font-bold text-sky-800 bg-sky-100/90 px-3 py-1 rounded-xl border border-sky-200 shadow-2xs inline-flex items-center gap-1 ${
                      isEyeCareLargeFont ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
                    }`}
                  >
                    <span>班級平均：{classAvgScaleScore} 分</span>
                    {scaleScore >= classAvgScaleScore ? (
                      <span className="text-emerald-700 font-extrabold text-[11px] sm:text-xs">
                        (+{scaleScore - classAvgScaleScore})
                      </span>
                    ) : (
                      <span className="text-rose-600 font-extrabold text-[11px] sm:text-xs">
                        ({scaleScore - classAvgScaleScore})
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>

            {/* 右側：達成基準級別 Badge */}
            <div className="sm:text-right flex sm:flex-col items-center sm:items-end justify-between gap-1.5">
              <span
                className={`font-medium text-slate-400 ${
                  isEyeCareLargeFont ? 'text-sm' : 'text-xs'
                }`}
              >
                達成基準級別
              </span>
              <span
                className={`px-4 py-1.5 rounded-full font-bold shadow-xs whitespace-nowrap transition-transform duration-200 ${badgeBg} ${
                  isEyeCareLargeFont ? 'text-base sm:text-lg' : 'text-xs sm:text-sm'
                }`}
              >
                {benchmark.name} ({benchmarkEn})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 核心光譜儀表區塊 (The Spectrum Gauge) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-2xs space-y-3">
        {/* 落點指針 Tooltip 區域 */}
        <div className="relative h-11 w-full select-none">
          <div
            className="absolute -top-1 transition-all duration-500 ease-out z-20 flex flex-col items-center"
            style={{
              left: `${tooltipLeft}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <div
              className={`bg-slate-900 text-white font-bold px-3.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap flex items-center space-x-1.5 ${
                isEyeCareLargeFont ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>本次落點：{scaleScore} 分</span>
            </div>
            {/* 倒三角形指示箭頭 */}
            <div className="w-0 h-0 border-x-[6px] border-x-transparent border-t-[7px] border-t-slate-900 -mt-0.5" />
          </div>
        </div>

        {/* 彩色漸層五大基準分佈光譜條 (Proportional Benchmark Bar) */}
        <div className="relative pt-1 pb-1">
          <div className="h-5 sm:h-6 rounded-full overflow-hidden flex relative shadow-inner border border-slate-200/70 w-full">
            {/* 1. 低基準以下 (<400) 22.22% */}
            <div
              style={{ width: '22.222%' }}
              className="bg-[#f43f5e] h-full"
              title="未達低基準 (< 400 分)"
            />
            {/* 2. 低基準 (400~474) 16.67% */}
            <div
              style={{ width: '16.667%' }}
              className="bg-[#f59e0b] h-full"
              title="低基準 (400 ~ 474 分)"
            />
            {/* 3. 中等基準 (475~549) 16.67% */}
            <div
              style={{ width: '16.667%' }}
              className="bg-[#10b981] h-full relative"
              title="中等基準 (475 ~ 549 分)"
            />
            {/* 4. 高基準 (550~624) 16.67% */}
            <div
              style={{ width: '16.667%' }}
              className="bg-[#3b82f6] h-full"
              title="高基準 (550 ~ 624 分)"
            />
            {/* 5. 優秀/高級基準 (625+) 27.78% */}
            <div
              style={{ width: '27.778%' }}
              className="bg-[#8b5cf6] h-full"
              title="高級基準 (625 分以上)"
            />

            {/* 500 分常模平均基準線 */}
            <div
              className="absolute top-0 bottom-0 w-[2.5px] bg-slate-950 z-10"
              style={{ left: `${norm500Pct}%` }}
              title="國際常模平均基準點 (500 分)"
            />

            {/* 學生本人落點標記垂直指針 */}
            <div
              className="absolute top-0 bottom-0 w-1.5 bg-white shadow-md ring-2 ring-slate-900 rounded-full z-20 -ml-[3px] transition-all duration-500 ease-out"
              style={{ left: `${studentPct}%` }}
            />

            {/* 班級平均落點標記虛線 (若有) */}
            {classAvgPct !== null && (
              <div
                className="absolute top-0 bottom-0 w-[2.5px] bg-sky-950 z-10 -ml-[1px] border-l-2 border-dashed border-white"
                style={{ left: `${classAvgPct}%` }}
                title={`班級平均落點 (${classAvgScaleScore} 分)`}
              />
            )}
          </div>
        </div>

        {/* 刻度與常模標記區 */}
        <div className="relative pt-2 pb-6 min-h-[48px] select-none text-slate-600 font-medium text-xs">
          {/* 300 */}
          <span className="absolute left-0 text-slate-400 font-bold">300</span>

          {/* 400 (低) */}
          <span
            className="absolute text-slate-600 -translate-x-1/2 whitespace-nowrap"
            style={{ left: '22.222%' }}
          >
            400 (低)
          </span>

          {/* 475 */}
          <span
            className="absolute text-slate-500 -translate-x-1/2 hidden sm:inline"
            style={{ left: '38.889%' }}
          >
            475
          </span>

          {/* 500 (國際常模平均) 白色標籤 Badge */}
          <div
            className="absolute -translate-x-1/2 top-1 bg-white border border-slate-300 rounded-md px-2 py-0.5 text-[11px] font-bold text-slate-800 shadow-xs whitespace-nowrap z-10 flex items-center gap-1"
            style={{ left: `${norm500Pct}%` }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
            <span>500 (國際常模平均)</span>
          </div>

          {/* 550 (高) */}
          <span
            className="absolute text-slate-600 -translate-x-1/2 whitespace-nowrap"
            style={{ left: '55.556%' }}
          >
            550 (高)
          </span>

          {/* 625 (優秀) */}
          <span
            className="absolute text-slate-600 -translate-x-1/2 whitespace-nowrap"
            style={{ left: '72.222%' }}
          >
            625 (優秀)
          </span>

          {/* 750+ */}
          <span className="absolute right-0 text-slate-400 font-bold">750+</span>
        </div>

        {/* 班級平均落點備註 (若有提供班級平均) */}
        {classAvgScaleScore !== undefined && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              <span>
                本班平均量尺：<strong className="text-slate-800 font-bold">{classAvgScaleScore} 分</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span>
                國際常模平均：<strong className="text-slate-800 font-bold">500 分</strong>
              </span>
            </div>
            <div className="text-slate-400">
              {scaleScore >= classAvgScaleScore
                ? `領先全班平均 +${scaleScore - classAvgScaleScore} 分`
                : `距離全班平均 ${classAvgScaleScore - scaleScore} 分`}
            </div>
          </div>
        )}
      </div>

      {/* 底部基準能力說明卡 (Target Description Card) */}
      {showBottomDescription && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex items-start space-x-3.5 text-slate-800 shadow-2xs">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 flex-shrink-0 mt-0.5">
            <Target className="w-5 h-5 text-indigo-600" />
          </div>
          <div
            className={`leading-relaxed ${
              isEyeCareLargeFont ? 'text-base sm:text-lg' : 'text-xs sm:text-sm'
            }`}
          >
            <strong className="font-bold text-slate-900">
              {benchmark.name} ({benchmarkEn})：
            </strong>
            <span className="text-slate-700 font-medium">{benchmark.description}</span>
          </div>
        </div>
      )}
    </div>
  );
};
