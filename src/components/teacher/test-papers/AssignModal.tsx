import React from 'react';
import { TestPaper, ClassRoom } from '@/lib/types';

interface AssignModalProps {
  testPaper: TestPaper | null;
  classes: ClassRoom[];
  selectedClassIds: string[];
  isPublic: boolean;
  examCode: string;
  allowRetake: boolean;
  assigning: boolean;
  onClose: () => void;
  onToggleClass: (classId: string) => void;
  onTogglePublic: (isPublic: boolean) => void;
  onChangeExamCode: (code: string) => void;
  onChangeAllowRetake: (allowRetake: boolean) => void;
  onSave: () => void;
}

export const AssignModal: React.FC<AssignModalProps> = ({
  testPaper,
  classes,
  selectedClassIds,
  isPublic,
  examCode,
  allowRetake,
  assigning,
  onClose,
  onToggleClass,
  onTogglePublic,
  onChangeExamCode,
  onChangeAllowRetake,
  onSave,
}) => {
  if (!testPaper) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        <h3 className="text-lg font-bold text-slate-900">
          指派試卷《{testPaper.title}》
        </h3>
        <p className="text-xs text-slate-500">
          勾選要指派受測的班級。學生登入後即可在專屬工作區看到這份測驗！
        </p>

        {classes.length === 0 ? (
          <div className="p-4 bg-amber-50 text-amber-800 text-xs rounded-xl">
            您尚未建立任何班級，請先至班級工作台建立班級！
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto border border-slate-200 p-3 rounded-xl bg-slate-50">
            {classes.map((c) => {
              const isChecked = selectedClassIds.includes(c.id);
              return (
                <label
                  key={c.id}
                  className="flex items-center space-x-3 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-sky-50 transition"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleClass(c.id)}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-4 h-4"
                  />
                  <div className="text-xs font-bold text-slate-800">
                    {c.name} (國小 {c.gradeLevel} 年級 • {c.studentCount} 位學生)
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {/* 作答次數限制模式 */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <label className="text-xs font-bold text-slate-700 block">學生作答次數限制（評量模式）：</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onChangeAllowRetake(false)}
              className={`p-2.5 rounded-xl border text-left transition ${
                !allowRetake
                  ? 'bg-rose-50 border-rose-300 text-rose-900 ring-1 ring-rose-400'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-bold text-xs">
                <span>🔒 僅限作答一次</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                正式評量 / 段考。繳卷後鎖定，禁止重複作答。
              </p>
            </button>

            <button
              type="button"
              onClick={() => onChangeAllowRetake(true)}
              className={`p-2.5 rounded-xl border text-left transition ${
                allowRetake
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-1 ring-emerald-400'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-bold text-xs">
                <span>🔄 允許多次作答</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                平時精熟練習。學生可重新挑戰，加強閱讀理解。
              </p>
            </button>
          </div>
        </div>

        {/* 雙場景營運設定 (開放自學與測驗代碼) */}
        <div className="pt-3 border-t border-slate-100 space-y-3">
          <label className="flex items-center space-x-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => onTogglePublic(e.target.checked)}
              className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-4 h-4"
            />
            <span className="text-xs font-bold text-slate-800">
              同時公開至「開放自學區」（全校與訪客免指派即可練習）
            </span>
          </label>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-600 font-bold flex-shrink-0">測驗安全碼：</span>
            <input
              type="text"
              value={examCode}
              onChange={(e) => onChangeExamCode(e.target.value)}
              placeholder="選填，例如 2026PIRLS"
              className="p-1.5 rounded-lg border border-slate-200 text-xs w-full focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            取消
          </button>
          <button
            type="button"
            disabled={assigning}
            onClick={onSave}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
          >
            {assigning ? '派卷中...' : '確認指派'}
          </button>
        </div>
      </div>
    </div>
  );
};
