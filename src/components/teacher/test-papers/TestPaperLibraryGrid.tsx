import React from 'react';
import Link from 'next/link';
import {
  Search, BookOpen, Send, BarChart3, Edit3, Printer, Trash2, Lock
} from 'lucide-react';
import { TestPaper } from '@/lib/types';

interface TestPaperLibraryGridProps {
  papers: TestPaper[];
  currentUserId: string;
  isAdmin: boolean;
  filterScope: 'all' | 'mine' | 'public';
  searchQuery: string;
  myPaperCount: number;
  publicPaperCount: number;
  totalPaperCount: number;
  onFilterScopeChange: (scope: 'all' | 'mine' | 'public') => void;
  onSearchQueryChange: (query: string) => void;
  onClearFilters: () => void;
  onOpenAssign: (test: TestPaper) => void;
  onDelete: (id: string, title: string) => void;
}

export const TestPaperLibraryGrid: React.FC<TestPaperLibraryGridProps> = ({
  papers,
  currentUserId,
  isAdmin,
  filterScope,
  searchQuery,
  myPaperCount,
  publicPaperCount,
  totalPaperCount,
  onFilterScopeChange,
  onSearchQueryChange,
  onClearFilters,
  onOpenAssign,
  onDelete,
}) => {
  return (
    <div className="space-y-4">
      {/* 搜尋與分類過濾列 */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs">
          <button
            type="button"
            onClick={() => onFilterScopeChange('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              filterScope === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            全部試卷 ({totalPaperCount})
          </button>
          <button
            type="button"
            onClick={() => onFilterScopeChange('mine')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              filterScope === 'mine' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            👤 我建立的 ({myPaperCount})
          </button>
          <button
            type="button"
            onClick={() => onFilterScopeChange('public')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              filterScope === 'public' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🌐 全校公開 ({publicPaperCount})
          </button>
        </div>

        {/* 關鍵字搜尋 */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜尋試卷標題或作者..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs w-48 sm:w-64 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white"
          />
        </div>
      </div>

      {papers.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-lg mx-auto space-y-3">
          <p className="text-sm font-bold text-slate-700">查無符合條件的試卷</p>
          <p className="text-xs text-slate-500">請嘗試更換搜尋關鍵字或切換篩選分類。</p>
          <button
            type="button"
            onClick={onClearFilters}
            className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
          >
            清除所有篩選
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {papers.map((t) => {
            const isMine = t.creatorId === currentUserId;
            const canModify = isMine || isAdmin;

            return (
              <div
                key={t.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:border-sky-300 transition space-y-4"
              >
                <div>
                  {/* 標籤列 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          t.textType === 'literary'
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {t.textType === 'literary' ? '文學性文本' : '訊息性文本'}
                      </span>
                      {isMine ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">
                          👤 我建立的
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          👥 他人分享
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-semibold">
                      國小 {t.targetGrade} 年級
                    </span>
                  </div>

                  {/* 標題與簡介 */}
                  <h3 className="text-base font-bold text-slate-900 mt-2 line-clamp-1" title={t.title}>
                    {t.title}
                  </h3>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    出題者：<span className="text-slate-700 font-medium">{t.creatorName || '全校教師'}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {t.themeSummary || t.articleContent.substring(0, 60) + '...'}
                  </p>

                  {/* 規格列 */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>題數：{t.questions.length} 題</span>
                    <span>總分：{t.totalPoints} 分</span>
                    <span>字數：{t.wordCount} 字</span>
                  </div>

                  {/* 指派與自學狀態 */}
                  <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
                    <div>
                      指派班級：
                      {t.assignedClassIds && t.assignedClassIds.length > 0 ? (
                        <span className="text-sky-600 font-bold ml-1">{t.assignedClassIds.length} 個班級</span>
                      ) : (
                        <span className="text-slate-400 ml-1">尚未指派</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {t.allowRetake === false ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                          🔒 限一次
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                          🔄 允許多次
                        </span>
                      )}
                      {t.isPublic ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          開放自學
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          未公開
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 底部操作列 */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    {/* 指派 */}
                    <button
                      type="button"
                      onClick={() => onOpenAssign(t)}
                      className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold inline-flex items-center space-x-1 transition"
                      title="指派班級受測或設定公開自學"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>指派</span>
                    </button>

                    {/* 成績 */}
                    <Link
                      href={`/dashboard/teacher/test-papers/${t.id}/results`}
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold inline-flex items-center space-x-1 transition"
                      title="檢視全班受測成績與五大基準落點"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>成績</span>
                    </Link>

                    {/* 再度編輯（僅限建立者本人或管理員） */}
                    {canModify && (
                      <Link
                        href={`/dashboard/teacher/create?edit=${t.id}`}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold inline-flex items-center space-x-1 transition"
                        title="再度編輯自己的試卷"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>編輯</span>
                      </Link>
                    )}

                    {/* A4 列印 */}
                    <a
                      href={`/print/${t.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center space-x-1 transition"
                      title="A4 雙面列印試卷"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>A4</span>
                    </a>
                  </div>

                  {/* 刪除試卷按鈕 */}
                  {canModify ? (
                    <button
                      type="button"
                      onClick={() => onDelete(t.id, t.title)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="刪除試卷"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <span
                      className="text-[11px] text-slate-400 flex items-center space-x-1"
                      title="您無法刪除其他教師之試卷"
                    >
                      <Lock className="w-3 h-3 text-slate-300" />
                      <span>唯讀</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
