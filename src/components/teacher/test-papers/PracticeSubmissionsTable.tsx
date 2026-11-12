import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Compass, Search, Filter, Sparkles, CheckCircle2, Clock,
  ArrowUpDown, ExternalLink, Edit3, Award, BarChart3, Loader2,
  Check, AlertCircle, RefreshCw
} from 'lucide-react';
import { api } from '@/lib/api-client';

export interface PracticeSubmissionItem {
  id: string;
  studentId: string;
  studentName: string;
  seatNumber?: number;
  classId: string;
  className: string;
  testPaperId: string;
  testPaperTitle: string;
  targetGrade: number;
  textType: 'literary' | 'informational';
  totalScore: number;
  maxScore: number;
  percentage: number;
  scaleScore: number;
  benchmarkKey: string;
  benchmarkName: string;
  normPR?: number;
  durationSeconds?: number;
  submittedAt: string;
  reviewStatus: 'unreviewed' | 'ai_reviewed' | 'teacher_reviewed';
  isTeacherReviewed: boolean;
  teacherGeneralNote?: string | null;
  hasAiAdvice?: boolean;
}

interface PracticeSubmissionsTableProps {
  submissions: PracticeSubmissionItem[];
  classes: Array<{ id: string; name: string; gradeLevel: number }>;
  onRefresh: () => void;
  loading: boolean;
}

export const PracticeSubmissionsTable: React.FC<PracticeSubmissionsTableProps> = ({
  submissions: initialSubmissions,
  classes,
  onRefresh,
  loading,
}) => {
  const [submissions, setSubmissions] = useState<PracticeSubmissionItem[]>(initialSubmissions);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('time_desc');

  // 一鍵 AI 批閱批次狀態
  const [batchRegrading, setBatchRegrading] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; currentStudent: string }>({
    current: 0,
    total: 0,
    currentStudent: '',
  });

  // 當外部資料更新時同步更新內部狀態
  React.useEffect(() => {
    setSubmissions(initialSubmissions);
  }, [initialSubmissions]);

  // 格式化作答耗時 (分:秒)
  const formatDuration = (secs?: number) => {
    if (!secs) return '未記錄';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}分${s}秒`;
  };

  // 格式化日期時間
  const formatSubmittedDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return isoStr;
    }
  };

  // 篩選與排序
  const filteredSubmissions = useMemo(() => {
    let list = submissions.filter((s) => {
      if (selectedClassId !== 'all' && s.classId !== selectedClassId) return false;
      if (selectedStatus !== 'all' && s.reviewStatus !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (s.studentName || '').toLowerCase().includes(q);
        const matchSeat = String(s.seatNumber || '').includes(q);
        const matchTitle = (s.testPaperTitle || '').toLowerCase().includes(q);
        const matchClass = (s.className || '').toLowerCase().includes(q);
        if (!matchName && !matchSeat && !matchTitle && !matchClass) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'time_desc') {
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      }
      if (sortBy === 'time_asc') {
        return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      }
      if (sortBy === 'seat_asc') {
        return (a.seatNumber || 999) - (b.seatNumber || 999);
      }
      if (sortBy === 'score_desc') {
        return b.percentage - a.percentage;
      }
      if (sortBy === 'unreviewed_first') {
        const rank = (status: string) => (status === 'unreviewed' ? 0 : status === 'ai_reviewed' ? 1 : 2);
        return rank(a.reviewStatus) - rank(b.reviewStatus);
      }
      return 0;
    });

    return list;
  }, [submissions, selectedClassId, selectedStatus, searchQuery, sortBy]);

  // 統計指標
  const stats = useMemo(() => {
    const total = submissions.length;
    const unreviewed = submissions.filter((s) => s.reviewStatus === 'unreviewed').length;
    const aiReviewed = submissions.filter((s) => s.reviewStatus === 'ai_reviewed').length;
    const teacherReviewed = submissions.filter((s) => s.reviewStatus === 'teacher_reviewed').length;
    const avgScale = total > 0 ? Math.round(submissions.reduce((acc, s) => acc + (s.scaleScore || 500), 0) / total) : 500;
    return { total, unreviewed, aiReviewed, teacherReviewed, avgScale };
  }, [submissions]);

  // 一鍵依序非同步執行 AI 深度複閱 (防超時佇列)
  const handleAutoRegradeAllUnreviewed = async () => {
    const targets = filteredSubmissions.filter((s) => s.reviewStatus === 'unreviewed');
    if (targets.length === 0) {
      alert('目前所選範圍內無「未複閱」的自主練習試卷！');
      return;
    }

    if (!confirm(`確定要為目前清單中的 ${targets.length} 份「未複閱」試卷依序執行 AI 深度再閱嗎？\n系統將依照順序逐一完成並即時更新表格，約需 ${targets.length * 2} 秒。`)) {
      return;
    }

    try {
      setBatchRegrading(true);
      setBatchProgress({ current: 0, total: targets.length, currentStudent: '' });

      for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        setBatchProgress({
          current: i + 1,
          total: targets.length,
          currentStudent: `${target.className} ${target.seatNumber ? `${target.seatNumber}號 ` : ''}${target.studentName}《${target.testPaperTitle}》`,
        });

        try {
          const res = await api.teacher.autoRegradeAllSubmission(target.id);
          if (res.success && res.submission) {
            setSubmissions((prev) =>
              prev.map((item) =>
                item.id === target.id
                  ? {
                      ...item,
                      totalScore: res.submission.totalScore,
                      percentage: res.submission.percentage,
                      scaleScore: res.submission.scaleScore ?? item.scaleScore,
                      reviewStatus: 'ai_reviewed',
                    }
                  : item
              )
            );
          }
        } catch (itemErr) {
          console.warn(`[Batch AI Regrade] 學生 ${target.studentName} 複閱失敗:`, itemErr);
        }
      }

      alert(`🎉 恭喜！已順利完成 ${targets.length} 份自主練習之 AI 深度複閱！`);
    } catch (err: any) {
      console.error(err);
      alert('批次複閱中斷：' + (err.message || '請確認網路狀態'));
    } finally {
      setBatchRegrading(false);
      setBatchProgress({ current: 0, total: 0, currentStudent: '' });
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* 統計摘要 KPI 卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-xs font-bold text-slate-500">自學繳交總卷數</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.total} 份</div>
        </div>
        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 shadow-2xs">
          <div className="text-xs font-bold text-amber-800">⏳ 待複閱試卷</div>
          <div className="text-2xl font-black text-amber-700 mt-1">{stats.unreviewed} 份</div>
        </div>
        <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-200 shadow-2xs">
          <div className="text-xs font-bold text-purple-800">🤖 AI 深度複閱</div>
          <div className="text-2xl font-black text-purple-700 mt-1">{stats.aiReviewed} 份</div>
        </div>
        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-2xs">
          <div className="text-xs font-bold text-emerald-800">👨‍🏫 老師已核定</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{stats.teacherReviewed} 份</div>
        </div>
        <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200 shadow-2xs col-span-2 sm:col-span-1">
          <div className="text-xs font-bold text-indigo-800">🌐 平均國際量尺</div>
          <div className="text-2xl font-black text-indigo-700 mt-1">{stats.avgScale} 分</div>
        </div>
      </div>

      {/* 批次 AI 複閱進行中進度指示條 */}
      {batchRegrading && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
            <span className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                正在進行全班 AI 深度複閱中... ({batchProgress.current} / {batchProgress.total})
              </span>
            </span>
            <span>{Math.round((batchProgress.current / batchProgress.total) * 100)}%</span>
          </div>
          <div className="text-xs text-purple-100 truncate">目前處理：{batchProgress.currentStudent}</div>
          <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
            <div
              className="bg-white h-full transition-all duration-300"
              style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* 篩選與工具列 */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* 班級篩選 */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-transparent border-none text-slate-700 focus:outline-none font-bold"
            >
              <option value="all">全部班級 ({submissions.length})</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* 複閱狀態篩選 */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium">
            <span className="text-slate-400">審閱狀態：</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent border-none text-slate-700 focus:outline-none font-bold"
            >
              <option value="all">全部狀態</option>
              <option value="unreviewed">⏳ 待複閱 ({stats.unreviewed})</option>
              <option value="ai_reviewed">🤖 AI 已複閱 ({stats.aiReviewed})</option>
              <option value="teacher_reviewed">👨‍🏫 老師已核定 ({stats.teacherReviewed})</option>
            </select>
          </div>

          {/* 排序方式 */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent border-none text-slate-700 focus:outline-none font-bold"
            >
              <option value="time_desc">繳交時間 (新→舊)</option>
              <option value="time_asc">繳交時間 (舊→新)</option>
              <option value="unreviewed_first">未複閱優先</option>
              <option value="seat_asc">座號 (小→大)</option>
              <option value="score_desc">得分率 (高→低)</option>
            </select>
          </div>
        </div>

        {/* 搜尋與操作按鈕 */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋姓名、座號或文章..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none bg-slate-50/50"
            />
          </div>

          <button
            type="button"
            onClick={handleAutoRegradeAllUnreviewed}
            disabled={batchRegrading || stats.unreviewed === 0}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold inline-flex items-center space-x-1.5 shadow-xs transition disabled:opacity-50 flex-shrink-0"
            title="一鍵為目前篩選範圍內所有未複閱的試卷執行 AI 深度再閱卷"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>一鍵全班 AI 複閱</span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition"
            title="重新整理資料"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 資料表格 */}
      {filteredSubmissions.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
            <Compass className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-slate-800">目前尚無符合條件的學生自主練習紀錄</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            當學生登入帳號並在「開放自學區」完成閱讀測驗交卷後，成果將自動匯入於此，供老師檢視、批閱改分與生成 AI 診斷！
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th scope="col" className="px-4 py-3.5">受測學生</th>
                  <th scope="col" className="px-4 py-3.5">所屬班級</th>
                  <th scope="col" className="px-4 py-3.5">自主練習試卷</th>
                  <th scope="col" className="px-4 py-3.5">作答時間 / 耗時</th>
                  <th scope="col" className="px-4 py-3.5">得分表現</th>
                  <th scope="col" className="px-4 py-3.5">PIRLS 量尺與基準</th>
                  <th scope="col" className="px-4 py-3.5">複閱狀態</th>
                  <th scope="col" className="px-4 py-3.5 text-right">批閱與操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredSubmissions.map((s) => {
                  let statusBadge = (
                    <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      <span>⏳ 待複閱</span>
                    </span>
                  );
                  if (s.reviewStatus === 'teacher_reviewed' || s.isTeacherReviewed) {
                    statusBadge = (
                      <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>👨‍🏫 老師已核定</span>
                      </span>
                    );
                  } else if (s.reviewStatus === 'ai_reviewed') {
                    statusBadge = (
                      <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        <Sparkles className="w-3 h-3 text-purple-600" />
                        <span>🤖 AI 深度複閱</span>
                      </span>
                    );
                  }

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition">
                      {/* 學生資訊 */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-mono text-xs font-bold flex items-center justify-center">
                            {s.seatNumber ?? '—'}
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">
                              {s.studentName}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 班級 */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-xs">
                          {s.className}
                        </span>
                      </td>

                      {/* 試卷名稱與文體 */}
                      <td className="px-4 py-3.5 max-w-xs">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 line-clamp-1">
                            《{s.testPaperTitle}》
                          </div>
                          <div className="flex items-center space-x-1 text-[10px]">
                            <span
                              className={`px-1.5 py-0.2 rounded font-bold ${
                                s.textType === 'literary'
                                  ? 'bg-indigo-50 text-indigo-700'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              {s.textType === 'literary' ? '文學故事' : '科普說明'}
                            </span>
                            <span className="text-slate-400">
                              {s.targetGrade}年級
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 繳卷時間與作答耗時 */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-500">
                        <div className="space-y-0.5 font-mono text-xs">
                          <div>{formatSubmittedDate(s.submittedAt)}</div>
                          <div className="text-[11px] text-slate-400 flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>耗時 {formatDuration(s.durationSeconds)}</span>
                          </div>
                        </div>
                      </td>

                      {/* 得分與得分率 */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="font-bold text-slate-900">
                            {s.totalScore} / {s.maxScore} 分
                            <span className="text-slate-400 font-normal ml-1 text-[11px]">
                              ({s.percentage}%)
                            </span>
                          </div>
                          <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-600 h-full rounded-full"
                              style={{ width: `${Math.min(100, s.percentage)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* PIRLS 量尺與基準 */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <span className="font-black text-purple-700 font-mono text-sm">
                            {s.scaleScore} 分
                          </span>
                          <div className="text-[10px] text-purple-900 font-bold">
                            {s.benchmarkName}
                          </div>
                        </div>
                      </td>

                      {/* 複閱狀態 */}
                      <td className="px-4 py-3.5 whitespace-nowrap">{statusBadge}</td>

                      {/* 操作 */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-right space-x-1.5">
                        <Link
                          href={`/dashboard/teacher/submissions/${s.id}`}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs inline-flex items-center space-x-1 shadow-xs transition"
                          title="進入專屬全螢幕複閱頁面，可手動改分、單題 AI 深度再閱與生成學習改進建議"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>進入批閱/改分</span>
                        </Link>

                        <Link
                          href={`/dashboard/student/result/${s.id}`}
                          target="_blank"
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs inline-flex items-center space-x-1 transition"
                          title="另開新視窗查看學生診斷書全貌"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>診斷書</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
