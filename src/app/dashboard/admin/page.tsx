'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  Clock,
  Building,
  LogOut,
  CheckCircle,
  RefreshCw,
  UserPlus,
  Trash2,
  RotateCcw,
  ArrowRightLeft,
  AlertTriangle,
  BookOpen,
  Users,
  FileText,
  Check,
  AlertCircle,
  UserCog,
} from 'lucide-react';

interface TeacherItem {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'teacher' | 'student';
  status: 'active' | 'pending' | 'suspended';
  school: string;
  createdAt: string;
  classCount: number;
  studentCount: number;
  submissionCount: number;
  paperCount: number;
}

interface TransferTarget {
  id: string;
  username: string;
  displayName: string;
  school: string;
  role: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();

  const [pendingTeachers, setPendingTeachers] = useState<TeacherItem[]>([]);
  const [approvedTeachers, setApprovedTeachers] = useState<TeacherItem[]>([]);
  const [admins, setAdmins] = useState<TeacherItem[]>([]);
  const [transferTargets, setTransferTargets] = useState<TransferTarget[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 直接新增教師 Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [teacherUsername, setTeacherUsername] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('teacher123');
  const [teacherDisplayName, setTeacherDisplayName] = useState('');
  const [teacherSchool, setTeacherSchool] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // 刪除教師處置 Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTeacherForDelete, setSelectedTeacherForDelete] = useState<TeacherItem | null>(null);
  const [deleteMode, setDeleteMode] = useState<'transfer' | 'cascade'>('transfer');
  const [targetTeacherId, setTargetTeacherId] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch('/api/admin/teachers');
      if (res.status === 401 || res.status === 403) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setPendingTeachers(data.pendingTeachers || []);
      setApprovedTeachers(data.approvedTeachers || []);
      setAdmins(data.admins || []);
      setTransferTargets(data.availableTransferTargets || []);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('獲取教師資料失敗，請稍後重試');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const triggerToast = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 4000);
    } else {
      setActionMsg(msg);
      setTimeout(() => setActionMsg(''), 4000);
    }
  };

  // 處理核准、停用、打回未審核、指定管理員、解除管理員
  const handleTeacherAction = async (
    teacherId: string,
    action: 'approve' | 'reject' | 'reset_to_pending' | 'make_admin' | 'revoke_admin'
  ) => {
    let confirmPrompt = '';
    if (action === 'reset_to_pending') {
      confirmPrompt = '確定要將此位教師打回「未審核（待審核）」狀態嗎？\n該教師將會立即無法登入，直到您再次核准。';
    } else if (action === 'make_admin') {
      confirmPrompt = '確定要指定此位教師為「系統管理員」嗎？\n管理員將擁有審核教師、指定管理員與刪除處置的最高權限。';
    } else if (action === 'revoke_admin') {
      confirmPrompt = '確定要解除此人員之「系統管理員」權限，降為一般教師嗎？';
    }

    if (confirmPrompt && !window.confirm(confirmPrompt)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast(data.message);
        fetchTeachers();
      } else {
        triggerToast(data.error || '操作失敗', true);
      }
    } catch (err: any) {
      triggerToast(err.message || '操作異常', true);
    }
  };

  // 打開刪除 Modal
  const openDeleteModal = (teacher: TeacherItem) => {
    setSelectedTeacherForDelete(teacher);
    // 預設篩選出第一個不是自己的目標
    const available = transferTargets.filter((t) => t.id !== teacher.id);
    if (available.length > 0) {
      setTargetTeacherId(available[0].id);
      setDeleteMode('transfer');
    } else {
      setTargetTeacherId('');
      setDeleteMode('cascade');
    }
    setShowDeleteModal(true);
  };

  // 執行刪除教師
  const handleConfirmDelete = async () => {
    if (!selectedTeacherForDelete) return;

    if (deleteMode === 'transfer' && !targetTeacherId) {
      alert('請選擇一位接手該班級與學生的新任教師！');
      return;
    }

    if (deleteMode === 'cascade') {
      const doubleCheck = window.confirm(
        `【嚴重警告】您選擇了「連帶刪除」！\n此操作將徹底刪除【${selectedTeacherForDelete.displayName}】名下的 ${selectedTeacherForDelete.classCount} 個班級、${selectedTeacherForDelete.studentCount} 位學生以及所有歷史測驗成績！\n此動作無法還原，確定要執行嗎？`
      );
      if (!doubleCheck) return;
    }

    setDeleteLoading(true);
    try {
      const res = await fetch('/api/admin/teachers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: selectedTeacherForDelete.id,
          deleteMode,
          targetTeacherId: deleteMode === 'transfer' ? targetTeacherId : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        triggerToast(data.message);
        setShowDeleteModal(false);
        setSelectedTeacherForDelete(null);
        fetchTeachers();
      } else {
        alert(data.error || '刪除失敗');
      }
    } catch (err: any) {
      alert(err.message || '刪除異常');
    } finally {
      setDeleteLoading(false);
    }
  };

  // 管理員直接建立教師
  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const res = await fetch('/api/admin/teachers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: teacherUsername,
          password: teacherPassword,
          displayName: teacherDisplayName,
          school: teacherSchool,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast(data.message);
        setShowCreateModal(false);
        setTeacherUsername('');
        setTeacherDisplayName('');
        setTeacherSchool('');
        fetchTeachers();
      } else {
        alert(data.error || '建立失敗');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const validTransferOptions = transferTargets.filter(
    (t) => t.id !== selectedTeacherForDelete?.id
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <div>
        {/* 頂部導航 */}
        <header className="bg-white border-b sticky top-0 z-20 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-600 text-white flex items-center justify-center shadow-md">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  系統管理員審核中心
                  <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                    最高權限
                  </span>
                </h1>
                <p className="text-xs text-slate-500">PIRLS 閱讀素養評量平臺 • 教師審核與權限架構管理</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Link
                href="/dashboard/teacher"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span className="hidden sm:inline">前往教師教學工作台</span>
              </Link>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm transition"
              >
                <UserPlus className="w-4 h-4" />
                <span>直接新增教師</span>
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">登出</span>
              </button>
            </div>
          </div>
        </header>

        {/* 提示訊息 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          {actionMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 shadow-xs transition-all">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="font-medium">{actionMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2 shadow-xs transition-all">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}
        </div>

        {/* 主體內容 */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
          {/* 總覽指標卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500">待審核教師申請</p>
                <p className="text-2xl font-black text-amber-600 mt-1">{pendingTeachers.length}</p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500">已正式開通教師</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">{approvedTeachers.length}</p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <UserCheck className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500">系統管理員人數</p>
                <p className="text-2xl font-black text-purple-600 mt-1">{admins.length}</p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* ========================================================
              區塊一：系統管理員名單 (至少保留一位)
             ======================================================== */}
          <section className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    系統最高管理員名冊 ({admins.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    管理員具備審核教師、指定/解除管理員、刪除教師及轉移班級之最高權限。整個系統至少必須保留一位管理員。
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
              {admins.map((adm) => {
                const isOnlyAdmin = admins.length <= 1;
                return (
                  <div
                    key={adm.id}
                    className="p-4 rounded-2xl border border-purple-200/80 bg-gradient-to-br from-purple-50/50 to-indigo-50/30 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-bold text-slate-900 text-sm">{adm.displayName}</span>
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-600 text-white">
                            系統管理員
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 mt-1.5 flex items-center">
                        <Building className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        {adm.school}
                      </p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">帳號: {adm.username}</p>
                    </div>

                    <div className="pt-2 border-t border-purple-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400">
                        {adm.classCount} 個班級 • {adm.studentCount} 位學生
                      </span>
                      {isOnlyAdmin ? (
                        <span className="text-[10px] text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded font-medium">
                          系統唯一管理員（不可降級）
                        </span>
                      ) : (
                        <button
                          onClick={() => handleTeacherAction(adm.id, 'revoke_admin')}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 font-medium transition text-[11px]"
                          title="解除管理員身分，恢復為一般教師"
                        >
                          降為一般教師
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ========================================================
              區塊二：待審核之教師註冊申請 (核心修正 1)
             ======================================================== */}
          <section className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    待審核之教師註冊申請 ({pendingTeachers.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    教師自行註冊後必須等候管理員審核通過，方可登入使用教師工作台
                  </p>
                </div>
              </div>
              <button
                onClick={fetchTeachers}
                className="inline-flex items-center space-x-1 text-xs text-sky-600 hover:text-sky-700 font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>重新整理</span>
              </button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-400 text-xs">載入中...</div>
            ) : pendingTeachers.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                目前沒有待審核的教師申請！所有註冊帳號皆已處理完畢。
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingTeachers.map((t) => (
                  <div
                    key={t.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-sm">{t.displayName}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                          等候審核中 (Pending)
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500 flex flex-wrap items-center gap-3">
                        <span>
                          帳號: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">{t.username}</code>
                        </span>
                        <span className="flex items-center">
                          <Building className="w-3.5 h-3.5 mr-1 text-slate-400" /> {t.school}
                        </span>
                        <span>申請時間: {new Date(t.createdAt).toLocaleDateString('zh-TW')}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleTeacherAction(t.id, 'approve')}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center space-x-1 transition shadow-xs"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>審核通過開通</span>
                      </button>
                      <button
                        onClick={() => handleTeacherAction(t.id, 'reject')}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold inline-flex items-center space-x-1 transition"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>駁回申請</span>
                      </button>
                      <button
                        onClick={() => openDeleteModal(t)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="直接刪除此申請"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ========================================================
              區塊三：已開通教師清單與進階權限控制 (指定管理員 / 打回未審核 / 刪除與移交)
             ======================================================== */}
          <section className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    已正式開通之教師清單 ({approvedTeachers.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    可在此處「指定為系統管理員」、「打回未審核狀態」或「刪除教師（支援指定轉移班級或連帶刪除）」
                  </p>
                </div>
              </div>
            </div>

            {approvedTeachers.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">目前尚無已開通之教師帳號</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                {approvedTeachers.map((t) => {
                  const isSuspended = t.status === 'suspended';
                  const isAlsoAdmin = t.role === 'admin';

                  return (
                    <div
                      key={t.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                        isSuspended
                          ? 'border-slate-200 bg-slate-50/70 opacity-80'
                          : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-bold text-slate-900 text-sm">{t.displayName}</span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {isAlsoAdmin && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                                  兼任管理員
                                </span>
                              )}
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  isSuspended
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {isSuspended ? '已停用' : '正常使用中'}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => openDeleteModal(t)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="刪除此教師帳號（提供轉移或連帶刪除選項）"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <p className="text-xs text-slate-500 mt-2 flex items-center">
                          <Building className="w-3.5 h-3.5 mr-1 text-slate-400" /> {t.school}
                        </p>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">帳號: {t.username}</p>

                        {/* 統計摘要條 */}
                        <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] grid grid-cols-4 text-center">
                          <div>
                            <span className="text-slate-400 block text-[10px]">班級數</span>
                            <strong className="text-slate-700 font-bold">{t.classCount}</strong>
                          </div>
                          <div className="border-x border-slate-200/60">
                            <span className="text-slate-400 block text-[10px]">學生數</span>
                            <strong className="text-slate-700 font-bold">{t.studentCount}</strong>
                          </div>
                          <div className="border-r border-slate-200/60">
                            <span className="text-slate-400 block text-[10px]">測驗作答</span>
                            <strong className="text-slate-700 font-bold">{t.submissionCount}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">教學文章</span>
                            <strong className="text-indigo-600 font-bold">{t.paperCount || 0}</strong>
                          </div>
                        </div>
                      </div>

                      {/* 底部操作按鈕群 */}
                      <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5 text-xs">
                        {/* 指定為管理員 */}
                        {!isAlsoAdmin ? (
                          <button
                            onClick={() => handleTeacherAction(t.id, 'make_admin')}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/60 font-semibold text-[11px] transition"
                            title="賦予系統最高管理員權限"
                          >
                            <UserCog className="w-3.5 h-3.5" />
                            <span>指定為管理員</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-purple-700 font-semibold px-2 py-0.5 rounded bg-purple-50">
                            已具備管理員權限
                          </span>
                        )}

                        <div className="flex items-center space-x-1">
                          {/* 打回未審核狀態 */}
                          <button
                            onClick={() => handleTeacherAction(t.id, 'reset_to_pending')}
                            className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-amber-700 hover:bg-amber-50 text-[11px] font-medium transition"
                            title="打回未審核狀態，教師將暫時無法登入"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>打回未審核</span>
                          </button>

                          {/* 停用/復用切換 */}
                          {isSuspended ? (
                            <button
                              onClick={() => handleTeacherAction(t.id, 'approve')}
                              className="px-2 py-1 text-emerald-600 hover:bg-emerald-50 rounded-lg text-[11px] font-medium"
                            >
                              重新啟用
                            </button>
                          ) : (
                            <button
                              onClick={() => handleTeacherAction(t.id, 'reject')}
                              className="px-2 py-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-[11px] font-medium"
                            >
                              停用
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* 頁尾 */}
      <footer className="py-6 text-center text-xs text-slate-400 border-t bg-white mt-12">
        PIRLS 智慧閱讀素養評量平臺 • 系統最高管理員控制台
      </footer>

      {/* ========================================================
          刪除教師與班級資料處置方案 Modal (核心需求 2)
         ======================================================== */}
      {showDeleteModal && selectedTeacherForDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  刪除教師與名下班級學生處置方案
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  您即將刪除教師【<strong>{selectedTeacherForDelete.displayName}</strong>】（帳號: {selectedTeacherForDelete.username}）
                </p>
              </div>
            </div>

            {/* 資料盤點說明框 */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 space-y-1">
              <div className="font-bold text-slate-800">該教師目前名下擁有的資料規模：</div>
              <div className="grid grid-cols-4 gap-2 text-center pt-1 font-medium">
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">班級數</span>
                  <strong className="text-indigo-600 text-sm">{selectedTeacherForDelete.classCount}</strong> 個
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">學生總數</span>
                  <strong className="text-indigo-600 text-sm">{selectedTeacherForDelete.studentCount}</strong> 位
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">測驗作答</span>
                  <strong className="text-indigo-600 text-sm">{selectedTeacherForDelete.submissionCount}</strong> 份
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">教材文章</span>
                  <strong className="text-emerald-600 text-sm">{selectedTeacherForDelete.paperCount || 0}</strong> 篇
                </div>
              </div>
            </div>

            {/* 方案 A 校本資產保護制度公告 */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-teal-50/70 to-indigo-50/60 border border-emerald-200 text-xs text-slate-800 flex items-start space-x-2.5">
              <BookOpen className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="font-bold text-emerald-950 block">
                  📚 校本教材資產保護機制（方案 A 已生效）：
                </strong>
                <p className="text-[11px] leading-relaxed text-slate-700">
                  無論選擇轉移班級或連帶刪除班級學生，該教師建立的{' '}
                  <strong className="text-emerald-800 font-bold">{selectedTeacherForDelete.paperCount || 0} 篇 PIRLS 文章與題本</strong>
                  均會<strong>全數安全保留</strong>，並自動歸檔至「全校公共題庫」，由系統管理員代管，保留教學成果且確保學生歷史評量診斷書永遠完整可查！
                </p>
              </div>
            </div>

            {/* 兩大處置選項 */}
            <div className="space-y-3 pt-1">
              <p className="text-xs font-bold text-slate-800">請選擇刪除此教師後，名下班級與學生的處理方式：</p>

              {/* 選項 1: 指定接手老師 */}
              <label
                className={`block p-4 rounded-2xl border cursor-pointer transition-all ${
                  deleteMode === 'transfer'
                    ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <input
                    type="radio"
                    name="deleteMode"
                    value="transfer"
                    checked={deleteMode === 'transfer'}
                    onChange={() => setDeleteMode('transfer')}
                    className="mt-1 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1 space-y-2">
                    <div>
                      <span className="font-bold text-slate-900 text-xs">
                        方案一：由指定的老師接手班級、學生與相關成績（推薦）
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        班級管理權、學生名冊及所有歷史測驗診斷紀錄將完整移交給指定教師，確保學生學習檔案不中斷。
                      </p>
                    </div>

                    {deleteMode === 'transfer' && (
                      <div className="pt-2">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          請選擇新任接手教師：
                        </label>
                        {validTransferOptions.length === 0 ? (
                          <div className="text-rose-600 text-xs font-medium p-2 bg-rose-50 rounded-xl border border-rose-200">
                            目前系統中沒有其他可接手的活躍教師帳號，請改選連帶刪除或先新增其他教師。
                          </div>
                        ) : (
                          <select
                            value={targetTeacherId}
                            onChange={(e) => setTargetTeacherId(e.target.value)}
                            className="w-full text-xs font-medium rounded-xl border-slate-300 border p-2.5 bg-white text-slate-800 shadow-xs focus:ring-2 focus:ring-indigo-500"
                          >
                            {validTransferOptions.map((tgt) => (
                              <option key={tgt.id} value={tgt.id}>
                                {tgt.displayName} ({tgt.username}) • {tgt.school}
                                {tgt.role === 'admin' ? ' [管理員]' : ''}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </label>

              {/* 選項 2: 直接連帶刪除 */}
              <label
                className={`block p-4 rounded-2xl border cursor-pointer transition-all ${
                  deleteMode === 'cascade'
                    ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <input
                    type="radio"
                    name="deleteMode"
                    value="cascade"
                    checked={deleteMode === 'cascade'}
                    onChange={() => setDeleteMode('cascade')}
                    className="mt-1 text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <span className="font-bold text-rose-900 text-xs">
                      方案二：直接刪除該教師底下的班級、學生及其相關成績（危險）
                    </span>
                    <p className="text-[11px] text-rose-700/90 mt-0.5 leading-relaxed">
                      連帶徹底清除該教師建立的所有班級、學生帳號以及所有作答診斷書，無法復原。
                    </p>
                  </div>
                </div>
              </label>
            </div>

            {/* Modal 按鈕區 */}
            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading || (deleteMode === 'transfer' && !targetTeacherId)}
                className={`px-5 py-2 rounded-xl text-white text-xs font-bold shadow-sm transition inline-flex items-center space-x-1.5 ${
                  deleteMode === 'cascade'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {deleteLoading ? (
                  <span>處理中...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>確認執行處置刪除</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          直接新增教師 Modal (快速建立無需審核之教師)
         ======================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">管理員直接建立已開通教師帳號</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                此處由管理員直接建立之教師帳號將自動設為「已開通」，可立即登入使用
              </p>
            </div>

            <form onSubmit={handleCreateTeacher} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700">登入帳號</label>
                <input
                  type="text"
                  required
                  value={teacherUsername}
                  onChange={(e) => setTeacherUsername(e.target.value)}
                  placeholder="例：teacher_lin"
                  className="mt-1 block w-full rounded-xl border-slate-300 border px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">初始密碼</label>
                <input
                  type="text"
                  required
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                  placeholder="teacher123"
                  className="mt-1 block w-full rounded-xl border-slate-300 border px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">教師姓名</label>
                <input
                  type="text"
                  required
                  value={teacherDisplayName}
                  onChange={(e) => setTeacherDisplayName(e.target.value)}
                  placeholder="例：林美華 老師"
                  className="mt-1 block w-full rounded-xl border-slate-300 border px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">任教學校</label>
                <input
                  type="text"
                  required
                  value={teacherSchool}
                  onChange={(e) => setTeacherSchool(e.target.value)}
                  placeholder="例：新北市板橋國小"
                  className="mt-1 block w-full rounded-xl border-slate-300 border px-3 py-2 text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm"
                >
                  {createLoading ? '建立中...' : '確認開通建立'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
