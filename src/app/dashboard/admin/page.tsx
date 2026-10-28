'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, UserCheck, UserX, Clock, Building, LogOut, CheckCircle, RefreshCw } from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [pendingTeachers, setPendingTeachers] = useState<any[]>([]);
  const [approvedTeachers, setApprovedTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/teachers');
      if (res.status === 401 || res.status === 403) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setPendingTeachers(data.pendingTeachers || []);
      setApprovedTeachers(data.approvedTeachers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleAction = async (teacherId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/admin/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg(data.message);
        fetchTeachers();
        setTimeout(() => setActionMsg(''), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 頂部導航 */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">系統管理員審核中心</h1>
              <p className="text-xs text-slate-500">PIRLS 閱讀素養評量平臺最高權限</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>登出系統</span>
          </button>
        </div>
      </header>

      {/* 主要內容區 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {actionMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span>{actionMsg}</span>
          </div>
        )}

        {/* 待審核教師申請區 */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-slate-900">
                待審核之教師帳號 ({pendingTeachers.length})
              </h2>
            </div>
            <button
              onClick={fetchTeachers}
              className="inline-flex items-center space-x-1 text-xs text-sky-600 hover:text-sky-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>重新整理</span>
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-slate-400 text-sm">載入資料中...</div>
          ) : pendingTeachers.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
              目前沒有待審核的教師申請！
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingTeachers.map((t) => (
                <div key={t.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900">{t.displayName}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                        審核中 (Pending)
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500 flex items-center space-x-4">
                      <span>帳號: <code className="bg-slate-100 px-1 py-0.5 rounded">{t.username}</code></span>
                      <span className="flex items-center"><Building className="w-3 h-3 mr-1" /> {t.school}</span>
                      <span>申請時間: {new Date(t.createdAt).toLocaleDateString('zh-TW')}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleAction(t.id, 'approve')}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center space-x-1 transition shadow-sm"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>核准通過</span>
                    </button>
                    <button
                      onClick={() => handleAction(t.id, 'reject')}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold inline-flex items-center space-x-1 transition"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>駁回</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 已開通之教師清單 */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-emerald-500" />
            <span>已正式開通之教師名單 ({approvedTeachers.length})</span>
          </h2>

          {approvedTeachers.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-sm">尚無已核准的教師</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {approvedTeachers.map((t) => (
                <div key={t.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-slate-800">{t.displayName}</span>
                    <p className="text-xs text-slate-500 mt-1 flex items-center">
                      <Building className="w-3 h-3 mr-1" /> {t.school}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">帳號: {t.username}</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-emerald-600 font-medium">
                    <span>正常使用中</span>
                    <button
                      onClick={() => handleAction(t.id, 'reject')}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      停用
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
