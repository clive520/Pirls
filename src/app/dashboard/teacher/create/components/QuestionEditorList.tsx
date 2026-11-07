import React from 'react';
import { Save, RefreshCw, HelpCircle, Layers } from 'lucide-react';
import { TestPaper } from '@/lib/types';
import { QuestionEditCard } from './QuestionEditCard';

interface QuestionEditorListProps {
  testPaper: TestPaper;
  activeTab?: 'article' | 'questions';
  isEditing: boolean;
  saving: boolean;
  onSave: () => void;
  onUpdatePoints: (qIndex: number, points: number) => void;
  onUpdatePrompt: (qIndex: number, newPrompt: string) => void;
  onUpdateOptionText: (qIndex: number, optIndex: number, newText: string) => void;
  onSetCorrectOption: (qIndex: number, optIndex: number) => void;
  onDeleteQuestion: (qIndex: number) => void;
}

export const QuestionEditorList: React.FC<QuestionEditorListProps> = ({
  testPaper,
  activeTab,
  isEditing,
  saving,
  onSave,
  onUpdatePoints,
  onUpdatePrompt,
  onUpdateOptionText,
  onSetCorrectOption,
  onDeleteQuestion,
}) => {
  return (
    <div className="w-full space-y-5">
      {/* 題目區塊標題列 */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold shadow-xs">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center space-x-2">
              <span>PIRLS 四層次閱讀理解試題微調</span>
              <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-2.5 py-0.5 rounded-full">
                共 {testPaper.questions.length} 題
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-2">
              <span>涵蓋提取訊息、推論、詮釋整合與批判評斷四大閱讀素養維度</span>
              <span>•</span>
              <span className="font-semibold text-slate-700">總計 {testPaper.totalPoints} 分</span>
            </p>
          </div>
        </div>
        <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80 font-medium self-start sm:self-center">
          💡 可直接修改題幹、選項、正確答案與評分規準
        </div>
      </div>

      {/* 題目卡片清單（全欄展開） */}
      <div className="space-y-4">
        {(testPaper.questions || []).map((q, qIdx) => (
          <QuestionEditCard
            key={q.id}
            question={q}
            index={qIdx}
            onUpdatePoints={onUpdatePoints}
            onUpdatePrompt={onUpdatePrompt}
            onUpdateOptionText={onUpdateOptionText}
            onDeleteQuestion={onDeleteQuestion}
            onSetCorrectOption={onSetCorrectOption}
          />
        ))}
      </div>

      {/* 底部保存大按鈕 */}
      <div className="pt-4 flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition flex items-center space-x-2"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{isEditing ? '更新儲存中...' : '寫入題庫與雲端同調中...'}</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{isEditing ? '確認完成微調，儲存更新至題庫' : '確認完成微調，儲存至題庫'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
