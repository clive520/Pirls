'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen, PlusCircle, ArrowLeft, Trash2, Send,
  Users, Calendar, Award, CheckCircle2, AlertCircle, BarChart3,
  Printer, Globe, Lock, Edit3, Search, Filter, ShieldCheck,
  CheckSquare, FileSpreadsheet, Sparkles, ChevronRight
} from 'lucide-react';
import { TestPaper, ClassRoom } from '@/lib/types';

interface TestPaperClassStats {
  submittedCount: number;
  avgScore: number;
  maxScore: number;
}

interface TestPaperAssignmentStats {
  totalSubmitted: number;
  classes: Record<string, TestPaperClassStats>;
}

export default function TeacherTestPapersPage() {
  const router = useRouter();
  const [testPapers, setTestPapers] = useState<TestPaper[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [assignmentStats, setAssignmentStats] = useState<Record<string, TestPaperAssignmentStats>>({});
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  // 視圖切換：'assignments' (指派明細表) | 'library' (題庫卡片清單)
  const [activeTab, setActiveTab] = useState<'assignments' | 'library'>('assignments');

  // 題庫過濾條件
  const [filterScope, setFilterScope] = useState<'all' | 'mine' | 'public'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 派卷 Modal 狀態
  const [assignModalTest, setAssignModalTest] = useState<TestPaper | null>(null);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [modalIsPublic, setModalIsPublic] = useState(false);
  const [modalExamCode, setModalExamCode] = useState('');
  const [modalAllowRetake, setModalAllowRetake] = useState<boolean>(true);
  const [assigning, setAssigning] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [testRes, clsRes] = await Promise.all([
        fetch('/api/teacher/test-papers', { cache: 'no-store' }),
        fetch('/api/teacher/classes', { cache: 'no-store' }),
      ]);

      if (testRes.status === 401 || testRes.status === 403) {
        router.push('/login');
        return;
      }

      const testData = await testRes.json();
      const clsData = await clsRes.json();

      setTestPapers(testData.testPapers || []);
      setAssignmentStats(testData.assignmentStats || {});
      setCurrentUserId(testData.currentUserId || '');
      setCurrentUserName(testData.currentUserName || '');
      setIsAdmin(!!testData.isAdmin);
      setClasses(clsData.classes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 刪除試卷（嚴格限建立者本人或管理員）
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`確定要刪除試卷《${title}》嗎？此操作將永久自題庫中移除該試卷。`)) return;
    try {
      const res = await fetch(`/api/teacher/test-papers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestPapers((prev) => prev.filter((t) => t.id !== id));
        alert('🎉 試卷已成功刪除！');
      } else {
        alert(data.error || '刪除失敗，您只能刪除自己建立的試卷');
      }
    } catch (err: any) {
      console.error(err);
      alert('刪除過程發生錯誤：' + (err.message || '請確認網路狀態'));
    }
  };

  // 打開派卷彈窗
  const openAssignModal = (test: TestPaper) => {
    setAssignModalTest(test);
    setSelectedClassIds(test.assignedClassIds || []);
    setModalIsPublic(test.isPublic || false);
    setModalExamCode(test.examCode || '');
    setModalAllowRetake(test.allowRetake !== false);
  };

  // 儲存派卷
  const handleSaveAssign = async () => {
    if (!assignModalTest) return;
    try {
      setAssigning(true);
      const res = await fetch(`/api/teacher/test-papers/${assignModalTest.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classIds: selectedClassIds,
          isPublic: modalIsPublic,
          examCode: modalExamCode,
          allowRetake: modalAllowRetake,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || '派卷設定已更新！');
        setAssignModalTest(null);
        fetchData();
      } else {
        alert(data.error || '派卷失敗');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAssigning(false);
    }
  };

  const toggleClassSelect = (classId: string) => {
    if (selectedClassIds.includes(classId)) {
      setSelectedClassIds(selectedClassIds.filter((id) => id !== classId));
    } else {
      setSelectedClassIds([...selectedClassIds, classId]);
    }
  };

  // 真正指派至我任教班級的任務清單（完全過濾掉尚未指派或非我班級之任務）
  const myAssignedTasks = testPapers
    .map((t) => {
      const assigned = classes.filter((c) => t.assignedClassIds?.includes(c.id));
      return {
        ...t,
        myAssignedClasses: assigned,
      };
    })
    .filter((t) => t.myAssignedClasses.length > 0);

  // 計算統計指標
  const assignedPaperCount = myAssignedTasks.length;
  const publicPaperCount = testPapers.filter((t) => t.isPublic).length;
  const myPaperCount = testPapers.filter((t) => t.creatorId === currentUserId).length;
  const totalSubmissions = Object.values(assignmentStats).reduce((sum, item) => sum + (item.totalSubmitted || 0), 0);

  // 篩選後題庫清單
  const filteredPapers = testPapers.filter((t) => {
    // 範圍過濾
    if (filterScope === 'mine' && t.creatorId !== currentUserId) return false;
    if (filterScope === 'public' && !t.isPublic) return false;
    // 關鍵字搜尋
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchCreator = (t.creatorName || '').toLowerCase().includes(q);
      const matchTheme = (t.themeSummary || '').toLowerCase().includes(q);
      return matchTitle || matchCreator || matchTheme;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* 導覽列 */}
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard/teacher"
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              title="返回教師工作台"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">PIRLS 題庫管理與班級指派中心</h1>
              <p className="text-xs text-slate-500">
                目前登入：<span className="font-semibold text-slate-700">{currentUserName || '教師'}</span>
                {isAdmin && <span className="ml-1 text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-bold">全站管理員</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/dashboard/teacher/create"
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-xs font-bold inline-flex items-center space-x-1.5 shadow-sm transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>AI 命題新試卷</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 主體區塊 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI 頂部摘要卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">總可見試卷</p>
              <p className="text-xl font-black text-slate-900">{testPapers.length} <span className="text-xs font-normal text-slate-400">份</span></p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">已指派班級任務</p>
              <p className="text-xl font-black text-indigo-700">{myAssignedTasks.length} <span className="text-xs font-normal text-slate-400">項</span></p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">學生已繳卷人次</p>
              <p className="text-xl font-black text-emerald-700">{totalSubmissions} <span className="text-xs font-normal text-slate-400">人次</span></p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">開放自學題庫</p>
              <p className="text-xl font-black text-purple-700">{publicPaperCount} <span className="text-xs font-normal text-slate-400">份</span></p>
            </div>
          </div>
        </div>

        {/* 雙視圖切換 Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('assignments')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center space-x-2 transition ${
                activeTab === 'assignments'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>📊 班級測驗指派明細總覽表</span>
              <span className={`ml-1 text-[11px] px-2 py-0.5 rounded-full font-mono ${
                activeTab === 'assignments' ? 'bg-sky-700 text-sky-100' : 'bg-slate-100 text-slate-600'
              }`}>
                {myAssignedTasks.length} 項指派
              </span>
            </button>

            <button
              onClick={() => setActiveTab('library')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center space-x-2 transition ${
                activeTab === 'library'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>📚 題庫試卷總覽</span>
              <span className={`ml-1 text-[11px] px-2 py-0.5 rounded-full font-mono ${
                activeTab === 'library' ? 'bg-sky-700 text-sky-100' : 'bg-slate-100 text-slate-600'
              }`}>
                {testPapers.length}
              </span>
            </button>
          </div>

          {activeTab === 'library' && (
            <div className="flex flex-wrap items-center gap-2">
              {/* 過濾範圍 */}
              <div className="inline-flex rounded-xl bg-slate-200/80 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterScope('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    filterScope === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  全部 ({testPapers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterScope('mine')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    filterScope === 'mine' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  👤 我建立的 ({myPaperCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterScope('public')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs w-44 sm:w-56 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* 載入中骨架 */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 font-medium">載入題庫與指派統計中...</div>
        ) : activeTab === 'assignments' ? (
          /* ==========================================================
             分頁一：📊 班級測驗指派明細總覽表 (Assignment Tracking Table)
             ========================================================== */
          <div className="space-y-4">
            <div className="bg-sky-50 border border-sky-200/70 p-4 rounded-2xl flex items-start space-x-3 text-xs text-sky-900">
              <CheckSquare className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">班級測驗即時進度追蹤明細表</p>
                <p className="text-sky-700 leading-relaxed">
                  本表詳列每份試卷已指派的班級清單、學生應考與繳卷進度條、各班平均成績，以及測驗安全碼。您可以直接點選「成績冊」查看 PIRLS 四層次落點，或隨時「調整指派」增加受測班級。
                </p>
              </div>
            </div>

            {myAssignedTasks.length === 0 ? (
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
                  onClick={() => setActiveTab('library')}
                  className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm inline-flex items-center space-x-1.5 shadow-sm transition"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>前往題庫挑選試卷指派</span>
                </button>
              </div>
            ) : (
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
                      {myAssignedTasks.map((t) => {
                        const isMine = t.creatorId === currentUserId;
                        const canModify = isMine || isAdmin;
                        const assignedClasses = t.myAssignedClasses;
                        const paperStats = assignmentStats[t.id];
                        const totalSubmittedForPaper = paperStats?.totalSubmitted || 0;

                        return (
                          <tr key={t.id} className="hover:bg-slate-50/80 transition">
                            {/* 試卷名稱與規格 */}
                            <td className="px-4 py-4 min-w-[220px]">
                              <div className="space-y-1">
                                <div className="flex items-center space-x-1.5">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    t.textType === 'literary' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                                  }`}>
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
                                  <span>出題者：{isMine ? <strong className="text-sky-700 font-bold">我建立的</strong> : t.creatorName || '全校教師'}</span>
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
                                    <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded" title="正式評量：僅限作答一次">
                                      🔒 限一次
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded" title="平時練習：允許多次作答">
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
                              {assignedClasses.length > 0 ? (
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
                              ) : (
                                <div className="space-y-1">
                                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                    ⚠️ 尚未指派班級
                                  </span>
                                  <p className="text-[10px] text-slate-400">
                                    {t.isPublic ? '學生可於公開自學區自由受測' : '請點擊「指派」指派至班級'}
                                  </p>
                                </div>
                              )}
                            </td>

                            {/* 作答繳卷進度 */}
                            <td className="px-4 py-4 min-w-[150px]">
                              {assignedClasses.length > 0 ? (
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
                                          <span className="font-mono font-bold text-sky-700">{submitted} / {total} 人 ({pct}%)</span>
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
                              ) : (
                                <div className="text-[11px] text-slate-500">
                                  累計自學繳卷：<strong className="text-slate-800 font-bold">{totalSubmittedForPaper}</strong> 份
                                </div>
                              )}
                            </td>

                            {/* 班級表現 */}
                            <td className="px-4 py-4 min-w-[130px]">
                              {assignedClasses.length > 0 && assignedClasses.some((c) => paperStats?.classes[c.name]?.submittedCount) ? (
                                <div className="space-y-1 text-[11px]">
                                  {assignedClasses.map((c) => {
                                    const cStats = paperStats?.classes[c.name];
                                    if (!cStats || !cStats.submittedCount) return null;
                                    return (
                                      <div key={c.id} className="text-slate-600">
                                        <span className="font-semibold text-slate-800">{c.name}</span>: 均分 <strong className="text-indigo-600">{cStats.avgScore}</strong> 分 / 最高 {cStats.maxScore}
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
                                  onClick={() => openAssignModal(t)}
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

                                {/* 刪除試卷（僅限建立者本人或管理員） */}
                                {canModify ? (
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(t.id, t.title)}
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
            )}
          </div>
        ) : (
          /* ==========================================================
             分頁二：📚 題庫試卷總覽 (Library Card View)
             ========================================================== */
          <div className="space-y-4">
            {filteredPapers.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-lg mx-auto space-y-3">
                <p className="text-sm font-bold text-slate-700">查無符合條件的試卷</p>
                <p className="text-xs text-slate-500">請嘗試更換搜尋關鍵字或切換篩選分類。</p>
                <button
                  type="button"
                  onClick={() => { setFilterScope('all'); setSearchQuery(''); }}
                  className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                >
                  清除所有篩選
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPapers.map((t) => {
                  const isMine = t.creatorId === currentUserId;
                  const canModify = isMine || isAdmin;
                  const paperStats = assignmentStats[t.id];

                  return (
                    <div
                      key={t.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:border-sky-300 transition space-y-4"
                    >
                      <div>
                        {/* 標籤列 */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                              t.textType === 'literary' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                            }`}>
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
                            onClick={() => openAssignModal(t)}
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

                        {/* 刪除試卷按鈕（僅限建立者本人或管理員顯示） */}
                        {canModify ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(t.id, t.title)}
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
        )}
      </main>

      {/* 派卷 Modal */}
      {assignModalTest && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              指派試卷《{assignModalTest.title}》
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
                        onChange={() => toggleClassSelect(c.id)}
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
                  onClick={() => setModalAllowRetake(false)}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    !modalAllowRetake
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
                  onClick={() => setModalAllowRetake(true)}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    modalAllowRetake
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
                  checked={modalIsPublic}
                  onChange={(e) => setModalIsPublic(e.target.checked)}
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
                  value={modalExamCode}
                  onChange={(e) => setModalExamCode(e.target.value)}
                  placeholder="選填，例如 2026PIRLS"
                  className="p-1.5 rounded-lg border border-slate-200 text-xs w-full focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setAssignModalTest(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                disabled={assigning}
                onClick={handleSaveAssign}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
              >
                {assigning ? '派卷中...' : '確認指派'}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="py-4 text-center text-xs text-slate-400 border-t bg-white">
        PIRLS 智慧閱讀素養評量平臺 • 題庫與指派管理中心
      </footer>
    </div>
  );
}
