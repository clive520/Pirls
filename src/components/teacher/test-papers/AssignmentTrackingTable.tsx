import React from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet, BookOpen, Globe, Lock, BarChart3,
  Send, Edit3, Printer, Trash2
} from 'lucide-react';
import { TestPaper, ClassRoom } from '@/lib/types';

export interface AssignedTaskItem extends TestPaper {
  myAssignedClasses: ClassRoom[];
}

interface AssignmentTrackingTableProps {
  tasks: AssignedTaskItem[];
  assignmentStats: Record<string, any>;
  currentUserId: string;
  isAdmin: boolean;
  onOpenAssign: (test: TestPaper) => void;
  onDelete: (id: string, title: string) => void;
  onSwitchToLibrary: () => void;
}

export const AssignmentTrackingTable: React.FC<AssignmentTrackingTableProps> = ({
  tasks,
  assignmentStats,
  currentUserId,
  isAdmin,
  onOpenAssign,
  onDelete,
  onSwitchToLibrary,
}) => {
  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-lg mx-auto space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 mx-auto flex items-center justify-center">
          <FileSpreadsheet className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">目前尚無由您指派給班級的測驗任務</h3>
        <p className="text-xs text-slate-500">
          此明細表僅列出已指派至您任教班級的任務。請切換至「📚 題庫試卷總覽」挑選試卷並點選「指派」，即可指派班級學生進行測驗！
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
            <tr>
              <th scope="col" className="px-4 py-3.5">試卷名稱與規格</th>
              <th scope="col" className="px-4 py-3.5">受測與作答設定</th>
              <th scope="col" className="px-4 py-3.5">已指派受測班級</th>
              <th scope="col" className="px-4 py-3.5">作答繳卷進度</th>
              <th scope="col" className="px-4 py-3.5">班級表現</th>
              <th scope="col" className="px-4 py-3.5 text-right">管理與快捷操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {tasks.map((t) => {
              const isMine = t.creatorId === currentUserId;
              const canModify = isMine || isAdmin;
              const assignedClasses = t.myAssignedClasses;
              const paperStats = assignmentStats[t.id];

              return (
                <tr key={t.id} className="hover:bg-slate-50/80 transition">
                  {/* 試卷名稱與規格 */}
                  <td className="px-4 py-4 min-w-[220px]">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            t.textType === 'literary'
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {t.textType === 'literary' ? '文學' : '訊息'}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          國小 {t.targetGrade} 年級
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 text-sm line-clamp-1" title={t.title}>
                        {t.title}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center space-x-2">
                        <span>{t.questions.length} 題 / {t.totalPoints} 分</span>
                        <span>•</span>
                        <span>
                          出題者：{isMine ? <strong className="text-sky-700 font-bold">我建立的</strong> : t.creatorName || '全校教師'}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* 受測與作答設定 */}
                  <td className="px-4 py-4 min-w-[140px]">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap gap-1">
                        {t.isPublic ? (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            <Globe className="w-3 h-3 text-emerald-600" />
                            <span>公開自學</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                            <Lock className="w-3 h-3 text-slate-400" />
                            <span>班級限定</span>
                          </span>
                        )}

                        {t.allowRetake === false ? (
                          <span
                            className="inline-flex items-center space-x-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded"
                            title="正式評量：僅限作答一次"
                          >
                            🔒 限一次
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center space-x-1 text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded"
                            title="平時練習：允許多次作答"
                          >
                            🔄 允許多次
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                        <span className="text-slate-400">安全碼:</span>
                        {t.examCode ? (
                          <span className="font-mono font-bold text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-100">
                            {t.examCode}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">免密碼</span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* 已指派受測班級 */}
                  <td className="px-4 py-4 min-w-[160px]">
                    <div className="space-y-1">
                      <div className="flex flex-wrap gap-1">
                        {assignedClasses.map((c) => (
                          <span
                            key={c.id}
                            className="text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-100 px-2 py-0.5 rounded"
                          >
                            {c.name} ({c.studentCount}人)
                          </span>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        共 {assignedClasses.length} 個班級，應考 {assignedClasses.reduce((s, c) => s + c.studentCount, 0)} 人
                      </p>
                    </div>
                  </td>

                  {/* 作答繳卷進度 */}
                  <td className="px-4 py-4 min-w-[150px]">
                    <div className="space-y-1.5">
                      {assignedClasses.map((c) => {
                        const cStats = paperStats?.classes[c.name];
                        const submitted = cStats?.submittedCount || 0;
                        const total = c.studentCount || 1;
                        const pct = Math.min(100, Math.round((submitted / total) * 100));

                        return (
                          <div key={c.id} className="space-y-0.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-slate-700">{c.name}</span>
                              <span className="font-mono font-bold text-sky-700">
                                {submitted} / {total} 人 ({pct}%)
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
                        );
                      })}
                    </div>
                  </td>

                  {/* 班級表現 */}
                  <td className="px-4 py-4 min-w-[130px]">
                    {assignedClasses.some((c) => paperStats?.classes[c.name]?.submittedCount) ? (
                      <div className="space-y-1 text-[11px]">
                        {assignedClasses.map((c) => {
                          const cStats = paperStats?.classes[c.name];
                          if (!cStats || !cStats.submittedCount) return null;
                          return (
                            <div key={c.id} className="text-slate-600">
                              <span className="font-semibold text-slate-800">{c.name}</span>: 均分{' '}
                              <strong className="text-indigo-600">{cStats.avgScore}</strong> 分 / 最高 {cStats.maxScore}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">尚無繳卷紀錄</span>
                    )}
                  </td>

                  {/* 管理與快捷操作 */}
                  <td className="px-4 py-4 text-right whitespace-nowrap min-w-[210px]">
                    <div className="flex items-center justify-end space-x-1.5">
                      {/* 成績冊 */}
                      <Link
                        href={`/dashboard/teacher/test-papers/${t.id}/results`}
                        className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold inline-flex items-center space-x-1 transition"
                        title="檢視全班作答成績冊與五大素養落點分析"
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>成績</span>
                      </Link>

                      {/* 指派/調整 */}
                      <button
                        type="button"
                        onClick={() => onOpenAssign(t)}
                        className="px-2 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold inline-flex items-center space-x-1 transition"
                        title="調整指派受測班級、開放自學與安全碼"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>指派</span>
                      </button>

                      {/* 再度編輯（僅限建立者本人或管理員） */}
                      {canModify ? (
                        <Link
                          href={`/dashboard/teacher/create?edit=${t.id}`}
                          className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold inline-flex items-center space-x-1 transition"
                          title="再度編輯自己出題之文章、段落與試題規準"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>編輯</span>
                        </Link>
                      ) : (
                        <span
                          className="px-1.5 py-1 text-slate-400 text-[11px] font-medium"
                          title="此試卷由其他教師建立，僅供指派與自學，無法修改文章內容"
                        >
                          唯讀
                        </span>
                      )}

                      {/* A4 列印 */}
                      <a
                        href={`/print/${t.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                        title="A4 雙面試卷列印"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </a>

                      {/* 刪除試卷 */}
                      {canModify ? (
                        <button
                          type="button"
                          onClick={() => onDelete(t.id, t.title)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="刪除此試卷"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="p-1 text-slate-300" title="您無權刪除其他教師之試卷">
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                      )}
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
