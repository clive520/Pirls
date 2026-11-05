import React from 'react';
import { Save, RefreshCw } from 'lucide-react';
import { TestPaper } from '@/lib/types';
import { QuestionEditCard } from './QuestionEditCard';

interface QuestionEditorListProps {
  testPaper: TestPaper;
  activeTab: 'article' | 'questions';
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
    <div className={`lg:col-span-7 space-y-4 ${activeTab === 'article' ? 'hidden lg:block' : 'block'}`}>
      {testPaper.questions.map((q, qIdx) => (
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
