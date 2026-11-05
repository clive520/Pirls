'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen, PlusCircle, ArrowLeft, FileSpreadsheet
} from 'lucide-react';
import { TestPaper, ClassRoom } from '@/lib/types';
import { api, ApiClientError } from '@/lib/api-client';
import {
  TestPaperKpiHeader,
  AssignModal,
  AssignmentTrackingTable,
  TestPaperLibraryGrid,
  AssignedTaskItem,
} from '@/components/teacher/test-papers';

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
      const [testData, clsData] = await Promise.all([
        api.teacher.getTestPapers(),
        api.teacher.getClasses(),
      ]);

      setTestPapers(testData.testPapers || []);
      setAssignmentStats(testData.assignmentStats || {});
      setCurrentUserId(testData.currentUserId || '');
      setCurrentUserName(testData.currentUserName || '');
      setIsAdmin(!!testData.isAdmin);
      setClasses(clsData.classes || []);
    } catch (err: any) {
      console.error(err);
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

  // 刪除試卷（嚴格限建立者本人或管理員）
  const handleDelete = async (id: string, title: string) => {
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
      const data = await api.teacher.assignTestPaper(assignModalTest.id, {
        classIds: selectedClassIds,
        isPublic: modalIsPublic,
        examCode: modalExamCode,
        allowRetake: modalAllowRetake,
      });
      alert(data.message || '派卷設定已更新！');
      setAssignModalTest(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert(err.message || '派卷失敗');
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
  const myAssignedTasks: AssignedTaskItem[] = testPapers
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
        <TestPaperKpiHeader
          totalPapers={testPapers.length}
          assignedCount={assignedPaperCount}
          totalSubmissions={totalSubmissions}
          publicCount={publicPaperCount}
        />

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
        </div>

        {/* 載入中骨架 */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 font-medium">載入題庫與指派統計中...</div>
        ) : activeTab === 'assignments' ? (
          /* 分頁一：📊 班級測驗指派明細總覽表 */
          <AssignmentTrackingTable
            tasks={myAssignedTasks}
            assignmentStats={assignmentStats}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onOpenAssign={openAssignModal}
            onDelete={handleDelete}
            onSwitchToLibrary={() => setActiveTab('library')}
          />
        ) : (
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
            onDelete={handleDelete}
          />
        )}
      </main>

      {/* 派卷 Modal */}
      <AssignModal
        testPaper={assignModalTest}
        classes={classes}
        selectedClassIds={selectedClassIds}
        isPublic={modalIsPublic}
        examCode={modalExamCode}
        allowRetake={modalAllowRetake}
        assigning={assigning}
        onClose={() => setAssignModalTest(null)}
        onToggleClass={toggleClassSelect}
        onTogglePublic={setModalIsPublic}
        onChangeExamCode={setModalExamCode}
        onChangeAllowRetake={setModalAllowRetake}
        onSave={handleSaveAssign}
      />

      <footer className="py-4 text-center text-xs text-slate-400 border-t bg-white">
        PIRLS 智慧閱讀素養評量平臺 • 題庫與指派管理中心
      </footer>
    </div>
  );
}
