'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen, PlusCircle, ArrowLeft, FileSpreadsheet, TrendingUp, Settings, Compass
} from 'lucide-react';
import { TestPaper, ClassRoom, TestAssignment } from '@/lib/types';
import { api, ApiClientError } from '@/lib/api-client';
import { AssignmentProgressStats } from '@/lib/db/assignments';
import {
  TestPaperKpiHeader,
  AssignModal,
  EditAssignmentModal,
  AssignmentTrackingTable,
  TestPaperLibraryGrid,
  PracticeSubmissionsTable,
} from '@/components/teacher/test-papers';

export default function TeacherTestPapersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 font-bold">載入題庫與指派中心...</div>}>
      <TeacherTestPapersContent />
    </Suspense>
  );
}

function TeacherTestPapersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get('tab');

  const [testPapers, setTestPapers] = useState<TestPaper[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [assignments, setAssignments] = useState<TestAssignment[]>([]);
  const [assignmentStats, setAssignmentStats] = useState<Record<string, AssignmentProgressStats>>({});
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  // 學生自主練習成果列表
  const [practiceSubmissions, setPracticeSubmissions] = useState<any[]>([]);
  const [loadingPractice, setLoadingPractice] = useState(false);

  // 視圖切換：'assignments' (指派明細表) | 'library' (題庫卡片清單) | 'practice' (學生自主練習成果)
  const [activeTab, setActiveTab] = useState<'assignments' | 'library' | 'practice'>(
    urlTab === 'practice' ? 'practice' : urlTab === 'library' ? 'library' : 'assignments'
  );

  // 題庫過濾條件
  const [filterScope, setFilterScope] = useState<'all' | 'mine' | 'public'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 派卷 Modal 狀態（建立新指派）
  const [assignModalTest, setAssignModalTest] = useState<TestPaper | null>(null);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [modalExamCode, setModalExamCode] = useState('');
  const [modalAllowRetake, setModalAllowRetake] = useState<boolean>(true);
  const [modalDeadlineType, setModalDeadlineType] = useState<'unlimited' | 'scheduled'>('unlimited');
  const [modalDueDate, setModalDueDate] = useState<string>('');
  const [assigning, setAssigning] = useState(false);

  // 編輯指派 Modal 狀態（調整既有獨立指派）
  const [editingAssignment, setEditingAssignment] = useState<TestAssignment | null>(null);
  const [updatingAssignment, setUpdatingAssignment] = useState(false);

  const fetchPracticeData = async () => {
    try {
      setLoadingPractice(true);
      const res = await api.teacher.getPracticeSubmissions();
      setPracticeSubmissions(res.submissions || []);
    } catch (err) {
      console.warn('載入自主練習清單警告:', err);
    } finally {
      setLoadingPractice(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [testData, clsData, asgnData] = await Promise.all([
        api.teacher.getTestPapers(),
        api.teacher.getClasses(),
        api.teacher.getAssignments().catch((err) => {
          console.warn('載入獨立指派列表警告:', err);
          return { success: false, assignments: [], stats: {} as Record<string, AssignmentProgressStats>, currentUserId: '', isAdmin: false };
        }),
      ]);

      setTestPapers(testData.testPapers || []);
      setCurrentUserId(testData.currentUserId || asgnData.currentUserId || '');
      setCurrentUserName(testData.currentUserName || '');
      setIsAdmin(!!testData.isAdmin);
      setClasses(clsData.classes || []);

      setAssignments(asgnData.assignments || []);
      setAssignmentStats((asgnData.stats as Record<string, AssignmentProgressStats>) || {});

      // 載入自主練習成果
      await fetchPracticeData();
    } catch (err: any) {
      console.error('資料載入失敗:', err);
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 試卷對照 Map（供指派明細表快速取用題目規格）
  const testPapersMap = useMemo(() => {
    const map: Record<string, TestPaper> = {};
    for (const p of testPapers) {
      map[p.id] = p;
    }
    return map;
  }, [testPapers]);

  // 刪除試卷（嚴格限建立者本人或管理員）
  const handleDeleteTestPaper = async (id: string, title: string) => {
    if (!confirm(`確定要刪除試卷《${title}》嗎？此操作將永久自題庫中移除該試卷。`)) return;
    try {
      await api.teacher.deleteTestPaper(id);
      setTestPapers((prev) => prev.filter((t) => t.id !== id));
      alert('🎉 試卷已成功刪除！');
    } catch (err: any) {
      console.error(err);
      alert('刪除失敗：' + (err.message || '您只能刪除自己建立的試卷'));
    }
  };

  // 一鍵切換開放自學區屬性
  const handleTogglePaperPublic = async (testPaperId: string, currentPublic: boolean) => {
    try {
      await api.teacher.updateTestPaper(testPaperId, { isPublic: currentPublic });
      setTestPapers((prev) =>
        prev.map((p) => (p.id === testPaperId ? { ...p, isPublic: currentPublic } : p))
      );
    } catch (err: any) {
      console.error(err);
      alert('切換公開自學狀態失敗：' + (err.message || '請稍後再試'));
    }
  };

  // 打開派卷彈窗（為班級建立新指派）
  const openAssignModal = (test: TestPaper) => {
    setAssignModalTest(test);
    setSelectedClassIds([]); // 每次建立獨立任務，不預先綁定既有班級
    setModalExamCode(test.examCode || '');
    setModalAllowRetake(test.allowRetake !== false);
    setModalDeadlineType('unlimited');
    setModalDueDate('');
  };

  // 儲存建立新指派
  const handleSaveAssign = async () => {
    if (!assignModalTest) return;
    if (selectedClassIds.length === 0) {
      alert('請至少勾選一個要指派受測的班級');
      return;
    }
    if (modalDeadlineType === 'scheduled' && !modalDueDate) {
      alert('請指定測驗截止日期與時間');
      return;
    }

    try {
      setAssigning(true);
      const res = await api.teacher.createAssignments({
        testPaperId: assignModalTest.id,
        classIds: selectedClassIds,
        allowRetake: modalAllowRetake,
        examCode: modalExamCode,
        deadlineType: modalDeadlineType,
        dueDate: modalDeadlineType === 'scheduled' && modalDueDate ? new Date(modalDueDate).toISOString() : null,
      });

      alert(res.message || '🎉 測驗指派已成功建立！各班級為獨立測驗事件。');
      setAssignModalTest(null);
      // 重新整理指派與題庫
      fetchData();
      // 自動切換到指派明細總覽表
      setActiveTab('assignments');
    } catch (err: any) {
      console.error(err);
      alert('派卷失敗：' + (err.message || '請稍後再試'));
    } finally {
      setAssigning(false);
    }
  };

  // 儲存編輯指派（修改期限、重測、安全碼、提前關閉）
  const handleSaveEditAssignment = async (
    updates: Partial<TestAssignment> & { allowRetakeOnExtend?: boolean }
  ) => {
    if (!editingAssignment) return;
    try {
      setUpdatingAssignment(true);
      const res = await api.teacher.updateAssignment(editingAssignment.id, updates);
      alert(res.message || '🎉 指派設定已更新！');
      setEditingAssignment(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert('更新失敗：' + (err.message || '請稍後再試'));
    } finally {
      setUpdatingAssignment(false);
    }
  };

  // 撤回 / 刪除獨立指派事件
  const handleDeleteAssignment = async (id: string, title: string) => {
    if (!confirm(`確定要撤回指派任務【${title}】嗎？\n\n此操作僅會移除該班級的測驗指派，不會影響原始試卷與其他班級的指派記錄。`)) return;
    try {
      await api.teacher.deleteAssignment(id);
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      alert('🎉 指派任務已成功撤回！');
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert('撤回失敗：' + (err.message || '請稍後再試'));
    }
  };

  const toggleClassSelect = (classId: string) => {
    if (selectedClassIds.includes(classId)) {
      setSelectedClassIds(selectedClassIds.filter((id) => id !== classId));
    } else {
      setSelectedClassIds([...selectedClassIds, classId]);
    }
  };

  // 計算 KPI 指標
  const activeAssignmentCount = assignments.filter((a) => a.status === 'active').length;
  const publicPaperCount = testPapers.filter((t) => t.isPublic).length;
  const myPaperCount = testPapers.filter((t) => t.creatorId === currentUserId).length;
  const totalSubmissions = Object.values(assignmentStats).reduce(
    (sum, item) => sum + (item.submittedCount || 0),
    0
  );

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
              <h1 className="text-base font-bold text-slate-900">PIRLS 題庫管理與獨立指派中心</h1>
              <p className="text-xs text-slate-500">
                目前登入：<span className="font-semibold text-slate-700">{currentUserName || '教師'}</span>
                {isAdmin && <span className="ml-1 text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-bold">全站管理員</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/dashboard/teacher/settings/ai"
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center space-x-1.5 border border-slate-200 transition"
              title="管理各大 AI 模型 API Key"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">AI 設定</span>
            </Link>
            <Link
              href="/dashboard/teacher/analytics/comparative"
              className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold inline-flex items-center space-x-1.5 border border-indigo-200/60 transition"
            >
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>前後測雷達對照</span>
            </Link>
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
        <TestPaperKpiHeader
          totalPapers={testPapers.length}
          assignedCount={activeAssignmentCount}
          totalSubmissions={totalSubmissions}
          publicCount={publicPaperCount}
        />

        {/* 三視圖切換 Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('assignments')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center space-x-2 transition ${
                activeTab === 'assignments'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>📊 班級獨立指派任務總覽</span>
              <span className={`ml-1 text-[11px] px-2 py-0.5 rounded-full font-mono ${
                activeTab === 'assignments' ? 'bg-sky-700 text-sky-100' : 'bg-slate-100 text-slate-600'
              }`}>
                {assignments.length} 項指派
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

            <button
              onClick={() => setActiveTab('practice')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center space-x-2 transition ${
                activeTab === 'practice'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>🧭 學生自主練習成果與批閱</span>
              <span className={`ml-1 text-[11px] px-2 py-0.5 rounded-full font-mono ${
                activeTab === 'practice' ? 'bg-purple-700 text-purple-100' : 'bg-slate-100 text-slate-600'
              }`}>
                {practiceSubmissions.length} 份
              </span>
              {practiceSubmissions.some((s) => s.reviewStatus === 'unreviewed') && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse ml-0.5" title="有待複閱試卷" />
              )}
            </button>
          </div>
        </div>

        {/* 載入中骨架 */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 font-medium">載入題庫與獨立指派任務中...</div>
        ) : activeTab === 'assignments' ? (
          /* 分頁一：📊 班級測驗指派明細總覽表 */
          <AssignmentTrackingTable
            assignments={assignments}
            assignmentStats={assignmentStats}
            testPapersMap={testPapersMap}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onEditAssignment={(asgn) => setEditingAssignment(asgn)}
            onDeleteAssignment={handleDeleteAssignment}
            onSwitchToLibrary={() => setActiveTab('library')}
          />
        ) : activeTab === 'library' ? (
          /* 分頁二：📚 題庫試卷總覽 */
          <TestPaperLibraryGrid
            papers={filteredPapers}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            filterScope={filterScope}
            searchQuery={searchQuery}
            myPaperCount={myPaperCount}
            publicPaperCount={publicPaperCount}
            totalPaperCount={testPapers.length}
            onFilterScopeChange={setFilterScope}
            onSearchQueryChange={setSearchQuery}
            onClearFilters={() => {
              setFilterScope('all');
              setSearchQuery('');
            }}
            onOpenAssign={openAssignModal}
            onDelete={handleDeleteTestPaper}
            onTogglePublic={handleTogglePaperPublic}
          />
        ) : (
          /* 分頁三：🧭 學生自主練習成果與批閱 */
          <PracticeSubmissionsTable
            submissions={practiceSubmissions}
            classes={classes}
            onRefresh={fetchPracticeData}
            loading={loadingPractice}
          />
        )}
      </main>

      {/* 派卷 Modal（為班級建立新指派） */}
      <AssignModal
        testPaper={assignModalTest}
        classes={classes}
        selectedClassIds={selectedClassIds}
        examCode={modalExamCode}
        allowRetake={modalAllowRetake}
        deadlineType={modalDeadlineType}
        dueDate={modalDueDate}
        assigning={assigning}
        onClose={() => setAssignModalTest(null)}
        onToggleClass={toggleClassSelect}
        onChangeExamCode={setModalExamCode}
        onChangeAllowRetake={setModalAllowRetake}
        onChangeDeadlineType={setModalDeadlineType}
        onChangeDueDate={setModalDueDate}
        onSave={handleSaveAssign}
      />

      {/* 編輯指派 Modal（修改期限、重測設定、安全碼） */}
      <EditAssignmentModal
        assignment={editingAssignment}
        updating={updatingAssignment}
        onClose={() => setEditingAssignment(null)}
        onSave={handleSaveEditAssignment}
      />

      <footer className="py-4 text-center text-xs text-slate-400 border-t bg-white">
        PIRLS 智慧閱讀素養評量平臺 • 獨立指派與題庫中心
      </footer>
    </div>
  );
}
