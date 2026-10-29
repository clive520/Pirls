'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, Users, PlusCircle, UserPlus, Printer, LogOut, CheckCircle, Sparkles, Trash2, KeyRound, ShieldCheck, QrCode, RefreshCw } from 'lucide-react';

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 新增班級彈窗狀態
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState(4);
  const [showClassModal, setShowClassModal] = useState(false);

  // 建立學生彈窗狀態
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchMode, setBatchMode] = useState<'auto' | 'names'>('auto');
  const [batchCount, setBatchCount] = useState(5);
  const [batchPrefix, setBatchPrefix] = useState('s401');
  const [batchStartSeat, setBatchStartSeat] = useState(1);
  const [studentNamesInput, setStudentNamesInput] = useState('');
  const [createdStudentSlips, setCreatedStudentSlips] = useState<any[]>([]);

  // 編輯學生帳號密碼彈窗狀態
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editSeatNumber, setEditSeatNumber] = useState<number | string>(1);
  const [editUsername, setEditUsername] = useState('');
  const [editNewPassword, setEditNewPassword] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // 取得當前使用者與班級清單
  const initData = async (targetClassId?: string) => {
    try {
      setLoading(true);
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (!meData.authenticated) {
        router.push('/login');
        return;
      }
      setCurrentUser(meData.user);

      const clsRes = await fetch('/api/teacher/classes');
      const clsData = await clsRes.json();
      const loadedClasses = clsData.classes || [];
      setClasses(loadedClasses);

      if (targetClassId) {
        setSelectedClassId(targetClassId);
      } else if (loadedClasses.length > 0) {
        // 若尚未選取或原選取已不存在，預設選取第一個
        setSelectedClassId((prev) => (loadedClasses.some((c: any) => c.id === prev) ? prev : loadedClasses[0].id));
      } else {
        setSelectedClassId('');
        setStudents([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initData();
  }, []);

  // 載入指定班級學生
  const fetchClassStudents = async (classId: string) => {
    if (!classId) {
      setStudents([]);
      return;
    }
    try {
      const res = await fetch(`/api/teacher/students?classId=${classId}`);
      const data = await res.json();
      setStudents(data.students || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedClassId) {
      fetchClassStudents(selectedClassId);
    } else {
      setStudents([]);
    }
  }, [selectedClassId]);

  // 建立班級
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/teacher/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newClassName, gradeLevel: newClassGrade }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowClassModal(false);
        setNewClassName('');
        await initData(data.class.id);
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 刪除班級
  const handleDeleteClass = async (classId: string) => {
    const cls = classes.find((c) => c.id === classId);
    if (!confirm(`確定要刪除「${cls?.name || '此班級'}」及其所有的學生帳號嗎？此動作無法復原。`)) {
      return;
    }

    try {
      const res = await fetch(`/api/teacher/classes?classId=${classId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        await initData();
      } else {
        alert(data.error || '刪除失敗');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 建立學生
  const handleBatchCreateStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) return;

    const currentCls = classes.find((c) => c.id === selectedClassId);
    const gradeLevel = currentCls?.gradeLevel || 4;

    const studentBatch = [];

    if (batchMode === 'names') {
      const lines = studentNamesInput
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length === 0) {
        alert('請在清單中至少輸入一位學生姓名（一行一人）');
        return;
      }

      for (let i = 0; i < lines.length; i++) {
        const seat = batchStartSeat + i;
        const seatStr = seat.toString().padStart(2, '0');
        const random6Digits = Math.floor(100000 + Math.random() * 900000).toString();
        studentBatch.push({
          seatNumber: seat,
          username: `${batchPrefix}_${seatStr}`,
          displayName: lines[i],
          plainPassword: random6Digits,
          gradeLevel,
        });
      }
    } else {
      for (let i = 0; i < batchCount; i++) {
        const seat = batchStartSeat + i;
        const seatStr = seat.toString().padStart(2, '0');
        const random6Digits = Math.floor(100000 + Math.random() * 900000).toString();
        studentBatch.push({
          seatNumber: seat,
          username: `${batchPrefix}_${seatStr}`,
          displayName: `${currentCls?.name} ${seat}號`,
          plainPassword: random6Digits,
          gradeLevel,
        });
      }
    }

    try {
      const res = await fetch('/api/teacher/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClassId,
          gradeLevel,
          students: studentBatch,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreatedStudentSlips(data.students || []);
        fetchClassStudents(selectedClassId);
        // 更新班級人數
        setClasses((prev) =>
          prev.map((c) =>
            c.id === selectedClassId ? { ...c, studentCount: c.studentCount + studentBatch.length } : c
          )
        );
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 為全班學生重設為 6 碼隨機數字密碼
  const handleBatchResetPasswords = async () => {
    if (!selectedClassId) return;
    const cls = classes.find((c) => c.id === selectedClassId);
    if (!confirm(`確定要為「${cls?.name || '本班'}」全體學生重新生成 6 位數亂數密碼嗎？\n生成後原舊密碼將失效，您可以直接列印最新的帳號密碼卡發放給學生。`)) {
      return;
    }

    try {
      const res = await fetch('/api/teacher/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_all_passwords',
          classId: selectedClassId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || '全班密碼已重設！');
        await fetchClassStudents(selectedClassId);
      } else {
        alert(data.error || '重設失敗');
      }
    } catch (err: any) {
      alert(err.message || '網路通訊錯誤');
    }
  };

  // 打開編輯學生彈窗
  const handleOpenEditModal = (student: any) => {
    setEditingStudent(student);
    setEditDisplayName(student.displayName || '');
    setEditSeatNumber(student.seatNumber || 1);
    setEditUsername(student.username || '');
    setEditNewPassword('');
    setEditError('');
    setShowEditModal(true);
  };

  // 儲存編輯學生
  const handleSaveStudentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setEditLoading(true);
    setEditError('');

    try {
      const res = await fetch('/api/teacher/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: editingStudent.id,
          displayName: editDisplayName,
          seatNumber: Number(editSeatNumber),
          username: editUsername,
          newPassword: editNewPassword.trim() ? editNewPassword.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowEditModal(false);
        await fetchClassStudents(selectedClassId);
      } else {
        setEditError(data.error || '更新學生資料失敗');
      }
    } catch (err: any) {
      setEditError(err.message || '網路通訊錯誤');
    } finally {
      setEditLoading(false);
    }
  };

  // 刪除單一學生
  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`確定要刪除學生「${studentName}」嗎？`)) {
      return;
    }

    try {
      const res = await fetch(`/api/teacher/students?studentId=${studentId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        fetchClassStudents(selectedClassId);
        setClasses((prev) =>
          prev.map((c) =>
            c.id === selectedClassId ? { ...c, studentCount: Math.max(0, c.studentCount - 1) } : c
          )
        );
      } else {
        alert(data.error || '刪除失敗');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 頂部導航 */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">教師教學評量與班級工作台</h1>
              <p className="text-xs text-slate-500">
                歡迎，{currentUser?.displayName} 老師 ({currentUser?.school})
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2.5">
            {currentUser?.role === 'admin' && (
              <Link
                href="/dashboard/admin"
                className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition shadow-2xs"
              >
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span className="hidden sm:inline">系統管理員中心</span>
              </Link>
            )}
            <Link
              href="/dashboard/teacher/create"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white text-xs font-bold shadow-sm hover:from-sky-700 hover:to-indigo-700 transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>AI 命題出題</span>
            </Link>
            <Link
              href="/dashboard/teacher/test-papers"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
            >
              <BookOpen className="w-4 h-4 text-sky-600" />
              <span>題庫與派卷</span>
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>登出</span>
            </button>
          </div>
        </div>
      </header>

      {/* 主體區塊 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* 班級選擇列 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Users className="w-6 h-6 text-sky-600 flex-shrink-0" />
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">目前管理之班級</label>
              {classes.length === 0 ? (
                <div className="text-sm font-bold text-slate-800">尚未建立班級，請點擊右側「新增班級」開始使用</div>
              ) : (
                <div className="flex items-center space-x-2 mt-0.5">
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="block w-full rounded-lg border-slate-300 text-sm font-bold text-slate-900 focus:ring-sky-500 focus:border-sky-500 py-1.5 px-3 bg-slate-50 border"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (國小 {c.gradeLevel} 年級) - 共 {c.studentCount} 位學生
                      </option>
                    ))}
                  </select>
                  {selectedClassId && (
                    <button
                      onClick={() => handleDeleteClass(selectedClassId)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition border border-transparent hover:border-rose-100"
                      title="刪除目前選取的班級"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowClassModal(true)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold inline-flex items-center space-x-1.5 transition"
            >
              <PlusCircle className="w-4 h-4 text-sky-600" />
              <span>新增班級</span>
            </button>
            {selectedClassId && (
              <button
                onClick={() => {
                  setCreatedStudentSlips([]);
                  setShowBatchModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold inline-flex items-center space-x-1.5 transition shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                <span>建立學生帳號</span>
              </button>
            )}
          </div>
        </div>

        {/* 學生名冊清單 */}
        {selectedClassId && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {selectedClass?.name} 學生帳號名冊
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  國小 {selectedClass?.gradeLevel} 年級 • 目前登記學生人數：{students.length} 人
                </p>
              </div>
              {students.length > 0 && (
                <div className="flex items-center space-x-2">
                  <Link
                    href={`/print/student-cards/${selectedClassId}`}
                    target="_blank"
                    className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold inline-flex items-center space-x-1.5 shadow-sm transition"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>🖨️ 列印帳密卡 (附 QR Code)</span>
                  </Link>
                  <button
                    onClick={handleBatchResetPasswords}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center space-x-1 transition"
                    title="重新為全班生成 6 碼隨機數字密碼"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                    <span>重設全班密碼</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center space-x-1 transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>列印名冊</span>
                  </button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-sm">載入學生資料中...</div>
            ) : students.length === 0 ? (
              <div className="py-16 text-center text-slate-500 space-y-3">
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <div className="text-base font-semibold">本班級尚無學生帳號</div>
                <p className="text-xs text-slate-400">點擊上方「建立學生帳號」，可自動流水號生成或貼上姓名名冊</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-semibold text-xs">
                    <tr>
                      <th className="py-3 px-6">座號</th>
                      <th className="py-3 px-6">學生姓名</th>
                      <th className="py-3 px-6">登入帳號</th>
                      <th className="py-3 px-6">登入密碼</th>
                      <th className="py-3 px-6">年級</th>
                      <th className="py-3 px-6">帳號狀態</th>
                      <th className="py-3 px-6">建立日期</th>
                      <th className="py-3 px-6 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {students.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-6 font-bold text-slate-900">{s.seatNumber} 號</td>
                        <td className="py-3.5 px-6 text-slate-800 font-bold">{s.displayName}</td>
                        <td className="py-3.5 px-6 font-mono text-xs text-sky-700 bg-sky-50/50 rounded">{s.username}</td>
                        <td className="py-3.5 px-6 font-mono text-xs">
                          <span className="font-mono font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded tracking-wider">
                            {s.initialPassword || '******'}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-slate-600">{s.gradeLevel} 年級</td>
                        <td className="py-3.5 px-6">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                            正常使用中
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-xs text-slate-400">
                          {new Date(s.createdAt).toLocaleDateString('zh-TW')}
                        </td>
                        <td className="py-3.5 px-6 text-right space-x-3 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenEditModal(s)}
                            className="text-xs text-sky-600 hover:text-sky-800 hover:underline font-bold inline-flex items-center space-x-1"
                            title="修改姓名、座號、帳號或重設密碼"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>編輯帳密</span>
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(s.id, s.displayName)}
                            className="text-xs text-rose-500 hover:text-rose-700 hover:underline font-semibold"
                          >
                            刪除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 新增班級 Modal */}
      {showClassModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">建立新教學班級</h3>
            <form onSubmit={handleCreateClass} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">班級名稱</label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="例：四年三班 或 閱讀素養卓越社"
                  className="mt-1 block w-full rounded-lg border-slate-300 border px-3 py-2 text-sm focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">適用年級</label>
                <select
                  value={newClassGrade}
                  onChange={(e) => setNewClassGrade(parseInt(e.target.value, 10))}
                  className="mt-1 block w-full rounded-lg border-slate-300 border px-3 py-2 text-sm focus:ring-sky-500"
                >
                  <option value={3}>國小三年級</option>
                  <option value={4}>國小四年級 (PIRLS 官方基準)</option>
                  <option value={5}>國小五年級</option>
                  <option value={6}>國小六年級</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold shadow-sm"
                >
                  確認建立
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 建立學生 Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">
              建立學生帳號（{selectedClass?.name}）
            </h3>

            {createdStudentSlips.length > 0 ? (
              <div className="mt-4 space-y-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center space-x-2 font-bold">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>已成功建立 {createdStudentSlips.length} 位學生帳號！請下載或記下初始帳密：</span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 p-2 rounded-xl bg-slate-50 text-xs">
                  {createdStudentSlips.map((st) => (
                    <div key={st.id} className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                      <span className="font-bold">{st.displayName}</span>
                      <span className="text-slate-500 font-mono">帳號: {st.username}</span>
                      <span className="text-sky-700 font-mono font-bold">密碼: {st.initialPassword}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Link
                    href={`/print/student-cards/${selectedClassId}`}
                    target="_blank"
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm inline-flex items-center space-x-1.5"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>🖨️ 立即列印新帳密卡 (附 QR Code)</span>
                  </Link>
                  <button
                    onClick={() => setShowBatchModal(false)}
                    className="px-5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs"
                  >
                    完成並關閉
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleBatchCreateStudents} className="mt-4 space-y-4">
                {/* 模式切換 */}
                <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setBatchMode('auto')}
                    className={`flex-1 py-1.5 rounded-lg transition ${
                      batchMode === 'auto' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    模式 1：依人數流水號快速生成
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchMode('names')}
                    className={`flex-1 py-1.5 rounded-lg transition ${
                      batchMode === 'names' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    模式 2：貼上自訂姓名名單
                  </button>
                </div>

                {batchMode === 'auto' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700">欲建立人數</label>
                      <input
                        type="number"
                        min={1}
                        max={40}
                        value={batchCount}
                        onChange={(e) => setBatchCount(parseInt(e.target.value, 10))}
                        className="mt-1 block w-full rounded-lg border-slate-300 border px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700">起始座號</label>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={batchStartSeat}
                        onChange={(e) => setBatchStartSeat(parseInt(e.target.value, 10))}
                        className="mt-1 block w-full rounded-lg border-slate-300 border px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700">學生姓名清單（一行一人）</label>
                    <textarea
                      rows={5}
                      required
                      value={studentNamesInput}
                      onChange={(e) => setStudentNamesInput(e.target.value)}
                      placeholder="王小明&#10;李小美&#10;陳大同&#10;林小華"
                      className="mt-1 block w-full rounded-lg border-slate-300 border px-3 py-2 text-sm font-sans"
                    />
                    <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                      <span>依序自動編配座號</span>
                      <div className="flex items-center space-x-1">
                        <span>起始座號：</span>
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={batchStartSeat}
                          onChange={(e) => setBatchStartSeat(parseInt(e.target.value, 10))}
                          className="w-14 rounded border border-slate-200 px-1 py-0.5 text-center text-xs text-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700">帳號前綴詞 (Prefix)</label>
                  <input
                    type="text"
                    required
                    value={batchPrefix}
                    onChange={(e) => setBatchPrefix(e.target.value)}
                    placeholder="例：s401 (帳號將為 s401_01, s401_02...)"
                    className="mt-1 block w-full rounded-lg border-slate-300 border px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    預設初始密碼為：<code className="text-sky-700 font-bold">pirls01</code>, <code className="text-sky-700 font-bold">pirls02</code>...
                  </p>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowBatchModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold shadow-sm"
                  >
                    立即生成學生帳號
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* 編輯學生帳號密碼 Modal */}
      {showEditModal && editingStudent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">編輯學生帳號與密碼</h3>
                  <p className="text-xs text-slate-500">修改學生基本資料或為忘記密碼的學生重設密碼</p>
                </div>
              </div>
            </div>

            {editError && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveStudentEdit} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-700">座號</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    required
                    value={editSeatNumber}
                    onChange={(e) => setEditSeatNumber(e.target.value)}
                    className="mt-1 block w-full rounded-lg border-slate-300 border px-3 py-2 text-sm focus:ring-sky-500 font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700">學生姓名</label>
                  <input
                    type="text"
                    required
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    placeholder="例：王小明"
                    className="mt-1 block w-full rounded-lg border-slate-300 border px-3 py-2 text-sm focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">登入帳號</label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="例：s401_01"
                  className="mt-1 block w-full rounded-lg border-slate-300 border px-3 py-2 text-sm focus:ring-sky-500 font-mono"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  ＊學生若使用「老師/班級/座號」快速登入將自動比對此帳號。
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  重設密碼 <span className="text-slate-400 font-normal">（若不更換密碼請保留空白）</span>
                </label>
                <input
                  type="text"
                  value={editNewPassword}
                  onChange={(e) => setEditNewPassword(e.target.value)}
                  placeholder="輸入新密碼，或點擊下方快捷鍵設定"
                  className="block w-full rounded-lg border-slate-300 border px-3 py-2 text-sm font-mono bg-white focus:ring-sky-500"
                />

                {/* 快捷填入密碼 */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400">快捷設定：</span>
                  <button
                    type="button"
                    onClick={() => {
                      const random6 = Math.floor(100000 + Math.random() * 900000).toString();
                      setEditNewPassword(random6);
                    }}
                    className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold border border-emerald-200 transition"
                  >
                    🎲 產生 6 碼亂數密碼
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const seat = String(editSeatNumber).padStart(2, '0');
                      setEditNewPassword(`pirls${seat}`);
                    }}
                    className="text-[11px] px-2 py-0.5 rounded bg-sky-50 text-sky-700 hover:bg-sky-100 font-semibold border border-sky-200 transition"
                  >
                    pirls{String(editSeatNumber).padStart(2, '0')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditNewPassword('123456')}
                    className="text-[11px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 font-semibold transition"
                  >
                    123456
                  </button>
                  {editNewPassword && (
                    <button
                      type="button"
                      onClick={() => setEditNewPassword('')}
                      className="text-[11px] px-2 py-0.5 rounded text-rose-600 hover:underline"
                    >
                      清空
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={editLoading}
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold shadow-sm disabled:opacity-50 inline-flex items-center space-x-1.5"
                >
                  {editLoading ? <span>儲存中...</span> : <span>確認儲存</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
