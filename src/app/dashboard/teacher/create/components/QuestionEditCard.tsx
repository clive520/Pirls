'use client';

import React, { useState, useEffect } from 'react';
import {
  Trash2,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Edit3,
  Save,
  RefreshCw,
  Plus,
  X,
} from 'lucide-react';
import { TestQuestion, QuestionRubric, RubricCriteria } from '@/lib/types';

export interface QuestionEditCardProps {
  question: TestQuestion;
  index: number;
  onUpdatePoints: (index: number, points: number) => void;
  onUpdatePrompt: (index: number, prompt: string) => void;
  onUpdateOptionText: (questionIndex: number, optionIndex: number, text: string) => void;
  onDeleteQuestion: (index: number) => void;
  onSetCorrectOption?: (questionIndex: number, optionIndex: number) => void;
  onRegenerateRubric?: (questionIndex: number) => Promise<void>;
  onUpdateRubric?: (questionIndex: number, rubric: QuestionRubric) => void;
  isRegenerating?: boolean;
}

export const QuestionEditCard: React.FC<QuestionEditCardProps> = ({
  question: q,
  index: qIdx,
  onUpdatePoints,
  onUpdatePrompt,
  onUpdateOptionText,
  onDeleteQuestion,
  onSetCorrectOption,
  onRegenerateRubric,
  onUpdateRubric,
  isRegenerating = false,
}) => {
  const [isEditingRubric, setIsEditingRubric] = useState(false);
  const [localRubric, setLocalRubric] = useState<QuestionRubric | undefined>(q.rubric);

  useEffect(() => {
    setLocalRubric(q.rubric);
  }, [q.rubric]);

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

  const isRubricMismatch =
    q.type === 'constructed_response' &&
    q.rubric &&
    q.points !== q.rubric.maxScore;

  // 儲存手動編輯的規準
  const handleSaveLocalRubric = () => {
    if (!localRubric || !onUpdateRubric) return;
    onUpdateRubric(qIdx, localRubric);
    setIsEditingRubric(false);
  };

  // 更新單筆 criterion 描述
  const handleUpdateCriterionDesc = (cIdx: number, newDesc: string) => {
    if (!localRubric) return;
    const updatedCriteria = [...localRubric.criteria];
    updatedCriteria[cIdx] = { ...updatedCriteria[cIdx], description: newDesc };
    setLocalRubric({ ...localRubric, criteria: updatedCriteria });
  };

  // 更新單筆 criterion 線索
  const handleUpdateCriterionClues = (cIdx: number, cluesStr: string) => {
    if (!localRubric) return;
    const clues = cluesStr
      .split(/[、,，\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const updatedCriteria = [...localRubric.criteria];
    updatedCriteria[cIdx] = { ...updatedCriteria[cIdx], keyEvidenceNeeded: clues };
    setLocalRubric({ ...localRubric, criteria: updatedCriteria });
  };

  return (
    <div
      className={`bg-white p-5 rounded-2xl border shadow-sm space-y-4 transition ${
        isRubricMismatch
          ? 'border-amber-400 ring-2 ring-amber-200/50'
          : 'border-slate-200 hover:border-sky-300'
      }`}
    >
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
              onChange={(e) => onUpdatePoints(qIdx, parseInt(e.target.value, 10) || 1)}
              className={`w-12 text-center rounded border py-0.5 text-xs font-bold ${
                isRubricMismatch
                  ? 'border-amber-500 text-amber-700 bg-amber-50 font-black ring-1 ring-amber-300'
                  : 'border-slate-200 text-slate-800'
              }`}
            />
            <span className="text-xs text-slate-400">分</span>
          </div>

          <button
            type="button"
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
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-bold text-slate-500">四選一選項與正確答案</label>
            <span className="text-[10px] text-slate-400">💡 點擊選項字母可切換正確答案</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {q.options.map((opt, optIdx) => (
              <div key={opt.label} className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => onSetCorrectOption && onSetCorrectOption(qIdx, optIdx)}
                  title="點擊設為正確解答"
                  className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 transition ${
                    opt.isCorrect
                      ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => onUpdateOptionText(qIdx, optIdx, e.target.value)}
                  className="flex-1 text-xs rounded-lg border border-slate-200 px-2.5 py-1.5 bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                />
                {opt.isCorrect ? (
                  <span className="text-[11px] text-emerald-600 font-bold whitespace-nowrap bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    ✓ 正確解答
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSetCorrectOption && onSetCorrectOption(qIdx, optIdx)}
                    className="text-[10px] text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 px-1.5 py-0.5 rounded transition whitespace-nowrap"
                  >
                    設為正解
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 簡答題給分規準 (Rubrics) */}
      {q.type === 'constructed_response' && (
        <div className="space-y-3">
          {/* 當配分與規準最高分不一致時的醒目警示條 */}
          {isRubricMismatch && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start sm:items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-950 flex items-center space-x-1.5">
                    <span>題目配分已改為 {q.points} 分，但評分規準目前為 {q.rubric?.maxScore || 0} 分標準</span>
                  </div>
                  <p className="text-[11px] text-amber-800/90 mt-0.5">
                    規準與配分尚未同步。建議調用 AI 重新生成階梯規準，以確保自動閱卷與成績對齊。
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onRegenerateRubric && onRegenerateRubric(qIdx)}
                disabled={isRegenerating}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-700 hover:to-indigo-700 text-white text-xs font-bold shadow-sm flex items-center justify-center space-x-1.5 transition disabled:opacity-50 flex-shrink-0"
              >
                {isRegenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>AI 正在生成 {q.points} 分規準...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>✨ 調用 AI 重新生成 {q.points} 分評分規準 (Rubrics)</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* 規準本體容器 */}
          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/60 space-y-3">
            {/* 標題與操作按鈕 */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/50 pb-2.5">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-amber-900 flex items-center space-x-1">
                  <CheckCircle2 className="w-4 h-4 text-amber-600" />
                  <span>IEA 官方給分規準 (Rubrics 指引)</span>
                </span>
                {isRubricMismatch ? (
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-rose-100 text-rose-700 border border-rose-200">
                    目前規準最高：{q.rubric?.maxScore || 0} 分（待更新為 {q.points} 分）
                  </span>
                ) : (
                  <span className="text-[11px] text-amber-800 font-semibold bg-amber-100/70 px-2 py-0.5 rounded">
                    最高得分：{q.rubric?.maxScore || q.points} 分
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => onRegenerateRubric && onRegenerateRubric(qIdx)}
                  disabled={isRegenerating}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-amber-100/80 text-amber-900 text-xs font-bold border border-amber-300 transition flex items-center space-x-1 shadow-2xs disabled:opacity-50"
                  title="調用 AI 依據文章與題幹重新生成規準"
                >
                  {isRegenerating ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
                      <span>生成中...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      <span>AI 重新生成規準</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsEditingRubric(!isEditingRubric)}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition flex items-center space-x-1 shadow-2xs"
                >
                  <Edit3 className="w-3 h-3 text-slate-500" />
                  <span>{isEditingRubric ? '結束手動編輯' : '手動微調'}</span>
                </button>
              </div>
            </div>

            {/* 規準階梯內容：檢視模式 */}
            {!isEditingRubric && q.rubric && (
              <div className="space-y-2 text-xs">
                {q.rubric.criteria.map((c) => (
                  <div key={c.score} className="p-2.5 bg-white rounded-lg border border-amber-100 shadow-2xs">
                    <div className="font-bold text-slate-800">
                      【{c.score} 分】(代碼 {c.code})：{c.description}
                    </div>
                    {c.keyEvidenceNeeded && c.keyEvidenceNeeded.length > 0 && (
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1">
                        <span className="font-semibold text-slate-600">• 必要文本線索：</span>
                        <span>{c.keyEvidenceNeeded.join('、')}</span>
                      </div>
                    )}
                  </div>
                ))}

                {q.rubric.sampleFullCreditAnswer && (
                  <div className="text-[11px] text-slate-700 mt-2 bg-white/90 p-2.5 rounded-lg border border-amber-100 shadow-2xs">
                    <strong className="text-amber-900">滿分示範答案：</strong>
                    <span className="leading-relaxed">{q.rubric.sampleFullCreditAnswer}</span>
                  </div>
                )}
              </div>
            )}

            {/* 規準階梯內容：手動編輯模式 */}
            {isEditingRubric && localRubric && (
              <div className="space-y-3 pt-1">
                <div className="text-[11px] text-slate-500 bg-amber-100/50 p-2 rounded border border-amber-200">
                  ✍️ 手動微調模式：您可以直接編輯各級別的給分敘述、必要文本線索與滿分示範答案。
                </div>

                <div className="space-y-2">
                  {localRubric.criteria.map((c, cIdx) => (
                    <div key={c.score} className="p-2.5 bg-white rounded-lg border border-amber-200 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span>【{c.score} 分】(代碼 {c.code}) 給分說明：</span>
                      </div>
                      <textarea
                        rows={2}
                        value={c.description}
                        onChange={(e) => handleUpdateCriterionDesc(cIdx, e.target.value)}
                        className="w-full text-xs rounded border border-slate-200 p-2 text-slate-800 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                      />
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                          必要文本線索（以頓號「、」或逗號隔開）：
                        </label>
                        <input
                          type="text"
                          value={c.keyEvidenceNeeded?.join('、') || ''}
                          onChange={(e) => handleUpdateCriterionClues(cIdx, e.target.value)}
                          className="w-full text-xs rounded border border-slate-200 px-2 py-1 text-slate-700 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-amber-200 space-y-1">
                  <label className="text-xs font-bold text-amber-900 block">滿分示範答案：</label>
                  <textarea
                    rows={2}
                    value={localRubric.sampleFullCreditAnswer || ''}
                    onChange={(e) =>
                      setLocalRubric({
                        ...localRubric,
                        sampleFullCreditAnswer: e.target.value,
                      })
                    }
                    className="w-full text-xs rounded border border-slate-200 p-2 text-slate-800 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setLocalRubric(q.rubric);
                      setIsEditingRubric(false);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveLocalRubric}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1 transition"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>儲存手動微調規準</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
