import React from 'react';
import { Calendar, Clock, AlertCircle, CheckCircle2, Lock, RotateCcw } from 'lucide-react';
import { TestPaper, ClassRoom } from '@/lib/types';

interface AssignModalProps {
  testPaper: TestPaper | null;
  classes: ClassRoom[];
  selectedClassIds: string[];
  examCode: string;
  allowRetake: boolean;
  deadlineType: 'unlimited' | 'scheduled';
  dueDate: string;
  assigning: boolean;
  onClose: () => void;
  onToggleClass: (classId: string) => void;
  onChangeExamCode: (code: string) => void;
  onChangeAllowRetake: (allowRetake: boolean) => void;
  onChangeDeadlineType: (type: 'unlimited' | 'scheduled') => void;
  onChangeDueDate: (date: string) => void;
  onSave: () => void;
}

/**
 * 輔助產生本地 datetime-local 格式字串 (YYYY-MM-DDTHH:mm)
 */
function toLocalDatetimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${y}-${m}-${d}T${h}:${min}`;
}

export const AssignModal: React.FC<AssignModalProps> = ({
  testPaper,
  classes,
  selectedClassIds,
  examCode,
  allowRetake,
  deadlineType,
  dueDate,
  assigning,
  onClose,
  onToggleClass,
  onChangeExamCode,
  onChangeAllowRetake,
  onChangeDeadlineType,
  onChangeDueDate,
  onSave,
}) => {
  if (!testPaper) return null;

  // 快捷時間設定器
  const setQuickDeadline = (hoursFromNow?: number, daysFromNow?: number, fixedHour?: number, fixedMinute?: number) => {
    const d = new Date();
    if (daysFromNow !== undefined) {
      d.setDate(d.getDate() + daysFromNow);
    }
    if (hoursFromNow !== undefined) {
      d.setHours(d.getHours() + hoursFromNow);
    }
    if (fixedHour !== undefined) {
      d.setHours(fixedHour);
    }
    if (fixedMinute !== undefined) {
      d.setMinutes(fixedMinute);
    } else {
      d.setMinutes(0);
    }
    d.setSeconds(0);
    d.setMilliseconds(0);

    onChangeDeadlineType('scheduled');
    onChangeDueDate(toLocalDatetimeString(d));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
              獨立指派任務事件
            </span>
            <span className="text-xs text-slate-400 font-semibold">
              國小 {testPaper.targetGrade} 年級 • {testPaper.questions.length} 題
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mt-1 line-clamp-1">
            指派試卷《{testPaper.title}》
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            文章歸文章、指派歸指派。每次指派均為各自獨立事件，各班設定互不干擾！
          </p>
        </div>

        {/* 1. 選擇受測班級 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center space-x-1">
              <span>🎯 選擇指派班級</span>
              <span className="text-rose-500">*</span>
            </label>
            {selectedClassIds.length > 1 && (
              <span className="text-[11px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                將為 {selectedClassIds.length} 個班級分別建立獨立任務
              </span>
            )}
          </div>

          {classes.length === 0 ? (
            <div className="p-4 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200">
              您尚未建立任何班級，請先至班級工作台建立班級！
            </div>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 p-2.5 rounded-xl bg-slate-50/70">
              {classes.map((c) => {
                const isChecked = selectedClassIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={`flex items-center space-x-3 p-2.5 rounded-xl border transition cursor-pointer ${
                      isChecked
                        ? 'bg-sky-50/80 border-sky-300 ring-1 ring-sky-400'
                        : 'bg-white border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleClass(c.id)}
                      className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-4 h-4"
                    />
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        {c.name}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        國小 {c.gradeLevel} 年級 • {c.studentCount} 位學生
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. 測驗有效期限控制 (核心新增) */}
        <div className="pt-3 border-t border-slate-100 space-y-2.5">
          <label className="text-xs font-bold text-slate-800 flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            <span>⏰ 測驗有效期限（截止時間）：</span>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onChangeDeadlineType('unlimited')}
              className={`p-3 rounded-xl border text-left transition ${
                deadlineType === 'unlimited'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-1 ring-emerald-400'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-bold text-xs">
                <span>🟢 無截止期限</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                常態自主評量。無時間壓力，學生隨時可進入測驗。
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                onChangeDeadlineType('scheduled');
                if (!dueDate) {
                  setQuickDeadline(undefined, 3, 17, 0); // 預設 3 天後 17:00
                }
              }}
              className={`p-3 rounded-xl border text-left transition ${
                deadlineType === 'scheduled'
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-900 ring-1 ring-indigo-400'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-bold text-xs">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>指定截止時間</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                限時評量/段考。到期前進入可完卷，逾期完全鎖定。
              </p>
            </button>
          </div>

          {/* 指定截止時間輸入與快捷按鈕 */}
          {deadlineType === 'scheduled' && (
            <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-indigo-900 flex-shrink-0">截止日期時間：</span>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => onChangeDueDate(e.target.value)}
                  className="flex-1 p-1.5 rounded-lg border border-indigo-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs"
                />
              </div>

              {/* 快捷一鍵設定標籤 */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-500">一鍵設定：</span>
                <button
                  type="button"
                  onClick={() => setQuickDeadline(undefined, 0, 16, 30)}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition"
                >
                  今天放學前 (16:30)
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDeadline(undefined, 3, 17, 0)}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition"
                >
                  3 天後 (17:00)
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDeadline(undefined, 7, 23, 59)}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition"
                >
                  一週後 (23:59)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 3. 作答次數限制模式 */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <label className="text-xs font-bold text-slate-800 block">學生作答次數（評量模式）：</label>
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
                <Lock className="w-3.5 h-3.5 text-rose-600" />
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
                  ? 'bg-teal-50 border-teal-300 text-teal-900 ring-1 ring-teal-400'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-bold text-xs">
                <RotateCcw className="w-3.5 h-3.5 text-teal-600" />
                <span>🔄 允許多次練習</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                平時精熟練習。學生可重新挑戰，加強閱讀理解。
              </p>
            </button>
          </div>
        </div>

        {/* 4. 測驗安全碼 */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-700 font-bold flex-shrink-0">測驗安全碼：</span>
            <input
              type="text"
              value={examCode}
              onChange={(e) => onChangeExamCode(e.target.value)}
              placeholder="選填，防學生提早開考 (如 2026PIRLS)"
              className="p-2 rounded-xl border border-slate-200 text-xs w-full focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
            />
          </div>
        </div>

        {/* 底部動作列 */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="text-[11px] text-slate-400">
            已選 {selectedClassIds.length} 個班級
          </span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              取消
            </button>
            <button
              type="button"
              disabled={assigning || selectedClassIds.length === 0}
              onClick={onSave}
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {assigning ? '建立指派中...' : '確認指派'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
