import React, { useState } from 'react';
import { Calendar, Clock, Lock, RotateCcw, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { TestAssignment } from '@/lib/types';

interface EditAssignmentModalProps {
  assignment: TestAssignment | null;
  updating?: boolean;
  onClose: () => void;
  onSave: (updates: {
    deadlineType: 'unlimited' | 'scheduled';
    dueDate: string | null;
    allowRetake: boolean;
    examCode: string;
    status: 'active' | 'closed';
    allowRetakeOnExtend: boolean;
  }) => void;
}

function toLocalDatetimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${y}-${m}-${d}T${h}:${min}`;
}

export const EditAssignmentModal: React.FC<EditAssignmentModalProps> = ({
  assignment,
  updating = false,
  onClose,
  onSave,
}) => {
  if (!assignment) return null;

  const [deadlineType, setDeadlineType] = useState<'unlimited' | 'scheduled'>(
    assignment.deadlineType || 'unlimited'
  );
  const [dueDate, setDueDate] = useState<string>(
    assignment.dueDate ? toLocalDatetimeString(new Date(assignment.dueDate)) : ''
  );
  const [allowRetake, setAllowRetake] = useState<boolean>(assignment.allowRetake !== false);
  const [examCode, setExamCode] = useState<string>(assignment.examCode || '');
  const [status, setStatus] = useState<'active' | 'closed'>(assignment.status || 'active');
  const [allowRetakeOnExtend, setAllowRetakeOnExtend] = useState<boolean>(false);

  const setQuickDeadline = (daysFromNow: number, fixedHour: number = 17) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    d.setHours(fixedHour);
    d.setMinutes(0);
    d.setSeconds(0);
    d.setMilliseconds(0);
    setDeadlineType('scheduled');
    setDueDate(toLocalDatetimeString(d));
  };

  const handleSave = () => {
    onSave({
      deadlineType,
      dueDate: deadlineType === 'scheduled' && dueDate ? new Date(dueDate).toISOString() : null,
      allowRetake,
      examCode: examCode.trim(),
      status,
      allowRetakeOnExtend,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
              調整測驗指派設定
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-1 line-clamp-1">
              {assignment.assignmentTitle}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              班級：<strong className="text-slate-800">{assignment.className}</strong> • 發起人：{assignment.teacherName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. 測驗開放狀態 (進行中 / 手動提早截止) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">測驗任務狀態：</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setStatus('active')}
              className={`p-2.5 rounded-xl border text-center font-bold text-xs transition ${
                status === 'active'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 ring-1 ring-emerald-400'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              🟢 正常開放中
            </button>
            <button
              type="button"
              onClick={() => setStatus('closed')}
              className={`p-2.5 rounded-xl border text-center font-bold text-xs transition ${
                status === 'closed'
                  ? 'bg-slate-100 border-slate-300 text-slate-800 ring-1 ring-slate-400'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              🛑 已提前結束/關閉
            </button>
          </div>
        </div>

        {/* 2. 測驗有效期限控制 */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <label className="text-xs font-bold text-slate-800 flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            <span>⏰ 測驗有效期限（截止時間）：</span>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDeadlineType('unlimited')}
              className={`p-2.5 rounded-xl border text-left transition ${
                deadlineType === 'unlimited'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-1 ring-emerald-400'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="font-bold text-xs">🟢 無截止期限</div>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">永久開放練習</p>
            </button>

            <button
              type="button"
              onClick={() => {
                setDeadlineType('scheduled');
                if (!dueDate) setQuickDeadline(3);
              }}
              className={`p-2.5 rounded-xl border text-left transition ${
                deadlineType === 'scheduled'
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-900 ring-1 ring-indigo-400'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="font-bold text-xs">⏰ 指定截止時間</div>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">限期測驗或補考</p>
            </button>
          </div>

          {deadlineType === 'scheduled' && (
            <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-indigo-900 flex-shrink-0">新截止時間：</span>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="flex-1 p-1.5 rounded-lg border border-indigo-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* 快捷延長按鈕 */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-500">快速延長：</span>
                <button
                  type="button"
                  onClick={() => setQuickDeadline(1, 17)}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                >
                  延長 1 天 (明天 17:00)
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDeadline(3, 17)}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                >
                  延長 3 天
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDeadline(7, 23)}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                >
                  延長一週
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 3. 補考與重測勾選 (訪談決策 5) */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <label className="flex items-start space-x-2.5 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 cursor-pointer">
            <input
              type="checkbox"
              checked={allowRetakeOnExtend}
              onChange={(e) => setAllowRetakeOnExtend(e.target.checked)}
              className="mt-0.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
            />
            <div>
              <span className="text-xs font-bold text-amber-900 block">
                🔄 同步開放「先前已繳卷學生」重新挑戰
              </span>
              <span className="text-[10px] text-amber-700 block leading-snug">
                未勾選時：僅供尚未作答或缺考學生補考；勾選時：全班所有學生皆可再次進入測驗挑戰新成績。
              </span>
            </div>
          </label>
        </div>

        {/* 4. 作答次數限制模式 */}
        <div className="pt-2 border-t border-slate-100 space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">評量作答次數模式：</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAllowRetake(false)}
              className={`p-2 rounded-xl border text-center font-bold text-xs transition ${
                !allowRetake
                  ? 'bg-rose-50 border-rose-300 text-rose-900 ring-1 ring-rose-400'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              🔒 僅限作答一次
            </button>
            <button
              type="button"
              onClick={() => setAllowRetake(true)}
              className={`p-2 rounded-xl border text-center font-bold text-xs transition ${
                allowRetake
                  ? 'bg-teal-50 border-teal-300 text-teal-900 ring-1 ring-teal-400'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              🔄 允許多次練習
            </button>
          </div>
        </div>

        {/* 5. 測驗安全碼 */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-700 font-bold flex-shrink-0">測驗安全碼：</span>
            <input
              type="text"
              value={examCode}
              onChange={(e) => setExamCode(e.target.value)}
              placeholder="選填，防學生提早開考"
              className="p-1.5 rounded-xl border border-slate-200 text-xs w-full focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
            />
          </div>
        </div>

        {/* 底部按鈕 */}
        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            取消
          </button>
          <button
            type="button"
            disabled={updating}
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
          >
            {updating ? '儲存更新中...' : '儲存指派設定'}
          </button>
        </div>
      </div>
    </div>
  );
};
