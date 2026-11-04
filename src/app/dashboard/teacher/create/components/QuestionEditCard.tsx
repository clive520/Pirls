'use client';

import React from 'react';
import { Trash2, CheckCircle2 } from 'lucide-react';
import { TestQuestion } from '@/lib/types';

export interface QuestionEditCardProps {
  question: TestQuestion;
  index: number;
  onUpdatePoints: (index: number, points: number) => void;
  onUpdatePrompt: (index: number, prompt: string) => void;
  onUpdateOptionText: (questionIndex: number, optionIndex: number, text: string) => void;
  onDeleteQuestion: (index: number) => void;
}

export const QuestionEditCard: React.FC<QuestionEditCardProps> = ({
  question: q,
  index: qIdx,
  onUpdatePoints,
  onUpdatePrompt,
  onUpdateOptionText,
  onDeleteQuestion,
}) => {
  const getLevelBadge = (level: number) => {
    switch (level) {
      case 1:
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">L1 直接提取</span>;
      case 2:
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">L2 直接推論</span>;
      case 3:
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">L3 詮釋整合</span>;
      case 4:
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800">L4 檢驗評估</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:border-sky-300 transition">
      {/* 題目標頭列 */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
            {q.questionNumber}
          </span>
          {getLevelBadge(q.processLevelNumber)}
          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
            {q.type === 'multiple_choice' ? '選擇題' : '開放簡答題'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <label className="text-xs text-slate-500 font-bold">配分:</label>
            <input
              type="number"
              min={1}
              max={5}
              value={q.points}
              onChange={(e) => onUpdatePoints(qIdx, parseInt(e.target.value, 10))}
              className="w-12 text-center rounded border border-slate-200 py-0.5 text-xs font-bold"
            />
            <span className="text-xs text-slate-400">分</span>
          </div>

          <button
            onClick={() => onDeleteQuestion(qIdx)}
            className="p-1 rounded text-slate-400 hover:text-rose-600 transition"
            title="刪除此題"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 題幹編輯 */}
      <div>
        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          題目題幹 (Prompt)
        </label>
        <textarea
          rows={2}
          value={q.prompt}
          onChange={(e) => onUpdatePrompt(qIdx, e.target.value)}
          className="w-full text-sm font-semibold text-slate-800 rounded-lg border border-slate-200 p-2.5 focus:ring-1 focus:ring-sky-500 focus:outline-none"
        />
      </div>

      {/* 選擇題選項 */}
      {q.type === 'multiple_choice' && q.options && (
        <div className="space-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
          <label className="block text-[11px] font-bold text-slate-500 mb-1">四選一選項與正確答案</label>
          <div className="grid grid-cols-1 gap-2">
            {q.options.map((opt, optIdx) => (
              <div key={opt.label} className="flex items-center space-x-2">
                <span
                  className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                    opt.isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {opt.label}
                </span>
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => onUpdateOptionText(qIdx, optIdx, e.target.value)}
                  className="flex-1 text-xs rounded-lg border border-slate-200 px-2.5 py-1.5 bg-white"
                />
                {opt.isCorrect && (
                  <span className="text-[11px] text-emerald-600 font-bold whitespace-nowrap">✓ 正確解答</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 簡答題給分規準 (Rubrics) */}
      {q.type === 'constructed_response' && q.rubric && (
        <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>IEA 官方給分規準 (Rubrics 指引)</span>
            </span>
            <span className="text-[11px] text-amber-700 font-semibold">最高得分：{q.rubric.maxScore} 分</span>
          </div>

          <div className="space-y-1.5 text-xs">
            {q.rubric.criteria.map((c) => (
              <div key={c.score} className="p-2 bg-white rounded-lg border border-amber-100">
                <div className="font-bold text-slate-800">
                  【{c.score} 分】(代碼 {c.code})：{c.description}
                </div>
                {c.keyEvidenceNeeded && c.keyEvidenceNeeded.length > 0 && (
                  <div className="text-[11px] text-slate-500 mt-1">
                    • 必要文本線索：{c.keyEvidenceNeeded.join('、')}
                  </div>
                )}
              </div>
            ))}
          </div>

          {q.rubric.sampleFullCreditAnswer && (
            <div className="text-[11px] text-slate-600 mt-2 bg-white/80 p-2 rounded border border-amber-100">
              <strong className="text-amber-900">滿分示範答案：</strong>
              {q.rubric.sampleFullCreditAnswer}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
