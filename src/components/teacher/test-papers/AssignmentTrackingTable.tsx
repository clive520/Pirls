import React from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet, BookOpen, Clock, Calendar, BarChart3,
  Settings2, Trash2, Printer, Lock, RefreshCw,
  AlertCircle, CheckCircle2, UserCheck
} from 'lucide-react';
import { TestAssignment, TestPaper } from '@/lib/types';
import { AssignmentProgressStats } from '@/lib/db/assignments';

interface AssignmentTrackingTableProps {
  assignments: TestAssignment[];
  assignmentStats: Record<string, AssignmentProgressStats>;
  testPapersMap: Record<string, TestPaper>;
  currentUserId: string;
  isAdmin: boolean;
  onEditAssignment: (asgn: TestAssignment) => void;
  onDeleteAssignment: (id: string, title: string) => void;
  onSwitchToLibrary: () => void;
}

export const AssignmentTrackingTable: React.FC<AssignmentTrackingTableProps> = ({
  assignments,
  assignmentStats,
  testPapersMap,
  currentUserId,
  isAdmin,
  onEditAssignment,
  onDeleteAssignment,
  onSwitchToLibrary,
}) => {
  if (assignments.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-lg mx-auto space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 mx-auto flex items-center justify-center">
          <FileSpreadsheet className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">目前尚無指派給班級的獨立測驗任務</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          每次指派都是獨立的教學事件（不同教師指派或前後測互不影響）。請切換至「📚 題庫試卷總覽」挑選試卷並點選「指派」，即可為任教班級建立獨立測驗！
        </p>
        <button
          type="button"
          onClick={onSwitchToLibrary}
          className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm inline-flex items-center space-x-1.5 shadow-sm transition"
        >
          <BookOpen className="w-4 h-4" />
          <span>前往題庫挑選試卷指派</span>
        </button>
      </div>
    );
  }

  const now = new Date();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
            <tr>
              <th scope="col" className="px-4 py-3.5">指派任務名稱與文章</th>
              <th scope="col" className="px-4 py-3.5">受測班級與發起教師</th>
              <th scope="col" className="px-4 py-3.5">測驗期限與狀態</th>
              <th scope="col" className="px-4 py-3.5">作答設定與安全碼</th>
              <th scope="col" className="px-4 py-3.5">班級繳卷進度</th>
              <th scope="col" className="px-4 py-3.5">測驗表現</th>
              <th scope="col" className="px-4 py-3.5 text-right">管理操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {assignments.map((asgn) => {
              const paper = testPapersMap[asgn.testPaperId];
              const stats = assignmentStats[asgn.id];
              const isMine = asgn.teacherId === currentUserId;
              const canManage = isMine || isAdmin; // 協同教師在頁面中亦已具備操作權限

              // 截止時間計算
              const isClosed = asgn.status === 'closed';
              let isExpired = false;
              let deadlineText = '常態開放（無限期）';
              let deadlineBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';

              if (asgn.deadlineType === 'scheduled' && asgn.dueDate) {
                const dueTime = new Date(asgn.dueDate);
                const diffMs = dueTime.getTime() - now.getTime();
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffDays = Math.floor(diffHours / 24);

                const dateStr = `${dueTime.getMonth() + 1}/${dueTime.getDate()} ${String(dueTime.getHours()).padStart(2, '0')}:${String(dueTime.getMinutes()).padStart(2, '0')}`;

                if (diffMs <= 0 || isClosed) {
                  isExpired = true;
                  deadlineText = `已截止 (${dateStr})`;
                  deadlineBadgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
                } else if (diffDays > 0) {
                  deadlineText = `剩餘 ${diffDays} 天 (${dateStr})`;
                  deadlineBadgeClass = 'bg-sky-50 text-sky-700 border-sky-200';
                } else {
                  deadlineText = `剩餘 ${Math.max(1, diffHours)} 小時 (${dateStr})`;
                  deadlineBadgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
                }
              } else if (isClosed) {
                deadlineText = '已關閉 (手動結束)';
                deadlineBadgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
              }

              const submittedCount = stats?.submittedCount || 0;
              const totalStudents = stats?.totalStudents || 0;
              const pct = totalStudents > 0 ? Math.min(100, Math.round((submittedCount / totalStudents) * 100)) : 0;

              return (
                <tr key={asgn.id} className="hover:bg-slate-50/80 transition">
                  {/* 指派任務名稱與文章 */}
                  <td className="px-4 py-4 min-w-[220px]">
                    <div className="space-y-1">
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <span className="line-clamp-1" title={asgn.assignmentTitle}>
                          {asgn.assignmentTitle}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                        <span className="text-slate-400">關聯試卷:</span>
                        <span className="font-medium text-slate-700 line-clamp-1" title={asgn.testPaperTitle}>
                          {asgn.testPaperTitle}
                        </span>
                      </div>
                      {paper && (
                        <div className="text-[10px] text-slate-400 flex items-center space-x-2">
                          <span className={`px-1 rounded ${paper.textType === 'literary' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {paper.textType === 'literary' ? '文學' : '訊息'}
                          </span>
                          <span>國小 {paper.targetGrade} 年級</span>
                          <span>•</span>
                          <span>{paper.questions.length} 題 / {paper.totalPoints} 分</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* 受測班級與發起教師 */}
                  <td className="px-4 py-4 min-w-[150px]">
                    <div className="space-y-1">
                      <div className="inline-flex items-center space-x-1 text-xs font-bold bg-sky-50 text-sky-800 border border-sky-100 px-2 py-0.5 rounded">
                        <span>{asgn.className}</span>
                        {totalStudents > 0 && <span className="text-sky-600 font-mono">({totalStudents}人)</span>}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                        <UserCheck className="w-3 h-3 text-slate-400" />
                        <span>
                          發起者：{isMine ? <strong className="text-sky-700 font-bold">我發起的</strong> : asgn.teacherName}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* 測驗期限與狀態 */}
                  <td className="px-4 py-4 min-w-[170px]">
                    <div className="space-y-1">
                      <span
                        className={`inline-flex items-center space-x-1 text-[11px] font-bold border px-2 py-0.5 rounded-full ${deadlineBadgeClass}`}
                      >
                        {isExpired || isClosed ? (
                          <AlertCircle className="w-3 h-3 text-rose-500" />
                        ) : asgn.deadlineType === 'scheduled' ? (
                          <Clock className="w-3 h-3 text-sky-500" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        )}
                        <span>{deadlineText}</span>
                      </span>
                      <div className="text-[10px] text-slate-400">
                        {asgn.deadlineType === 'unlimited' ? '無限期常態開放' : `指派時間: ${new Date(asgn.createdAt).toLocaleDateString()}`}
                      </div>
                    </div>
                  </td>

                  {/* 作答設定與安全碼 */}
                  <td className="px-4 py-4 min-w-[130px]">
                    <div className="space-y-1">
                      <div>
                        {asgn.allowRetake ? (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">
                            <RefreshCw className="w-2.5 h-2.5 text-teal-600" />
                            <span>允許多次練習</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                            <Lock className="w-2.5 h-2.5 text-rose-600" />
                            <span>限作答一次</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                        <span className="text-slate-400">安全碼:</span>
                        {asgn.examCode ? (
                          <span className="font-mono font-bold text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-100">
                            {asgn.examCode}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">免密碼</span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* 班級繳卷進度 */}
                  <td className="px-4 py-4 min-w-[150px]">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-700">完成繳卷</span>
                        <span className="font-mono font-bold text-sky-700">
                          {submittedCount} / {totalStudents} 人 ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            pct >= 80 ? 'bg-emerald-500' : pct >= 40 ? 'bg-sky-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* 測驗表現 */}
                  <td className="px-4 py-4 min-w-[120px]">
                    {submittedCount > 0 ? (
                      <div className="space-y-0.5 text-[11px]">
                        <div className="text-slate-600">
                          班平均: <strong className="text-indigo-600 font-bold">{stats?.avgScore || 0}</strong> 分
                        </div>
                        <div className="text-slate-500 text-[10px]">
                          最高分: <span className="font-semibold">{stats?.maxScore || 0}</span> 分
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">尚無繳卷</span>
                    )}
                  </td>

                  {/* 管理操作 */}
                  <td className="px-4 py-4 text-right whitespace-nowrap min-w-[240px]">
                    <div className="flex items-center justify-end space-x-1.5">
                      {/* 成績冊 (帶入 assignmentId 查詢該次獨立事件) */}
                      <Link
                        href={`/dashboard/teacher/test-papers/${asgn.testPaperId}/results?assignmentId=${asgn.id}`}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold inline-flex items-center space-x-1 transition"
                        title="檢視本次獨立指派的成績冊與能力雷達"
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>成績</span>
                      </Link>

                      {/* 調整期限與設定 (EditAssignmentModal) */}
                      <button
                        type="button"
                        onClick={() => onEditAssignment(asgn)}
                        className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold inline-flex items-center space-x-1 transition"
                        title="調整截止期限、延長時間或提前關閉"
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                        <span>調整</span>
                      </button>

                      {/* A4 列印 */}
                      <a
                        href={`/print/${asgn.testPaperId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                        title="A4 雙面列印試卷"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </a>

                      {/* 撤回指派事件 */}
                      <button
                        type="button"
                        onClick={() => onDeleteAssignment(asgn.id, asgn.assignmentTitle)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="撤回/刪除此指派任務（不影響試卷與其他指派）"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
