'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '登入失敗');
      }

      // 依角色跳轉不同專屬儀表板
      const role = data.user.role;
      if (role === 'admin') router.push('/dashboard/admin');
      else if (role === 'teacher') router.push('/dashboard/teacher');
      else router.push('/dashboard/student');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Link href="/" className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
            <BookOpen className="w-8 h-8" />
          </Link>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          登入 PIRLS 閱讀平臺
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          管理員、授課教師與學生請使用各自帳密登入
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-2xl sm:px-10 border border-slate-200/80">
          {error && (
            <div className="mb-6 rounded-xl bg-red-50 p-4 border border-red-200 flex items-start space-x-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-slate-700">帳號 (Username)</label>
              <div className="mt-1 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="輸入管理員、老師或學生帳號"
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">密碼 (Password)</label>
              <div className="mt-1 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="輸入密碼"
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition disabled:opacity-50"
            >
              {loading ? '驗證登入中...' : '立即登入'}
            </button>
          </form>

          {/* 系統預設提示卡片 */}
          <div className="mt-8 pt-6 border-t border-slate-200 text-xs text-slate-500 space-y-2 bg-slate-50 p-4 rounded-xl">
            <div className="font-semibold text-slate-700">💡 帳號說明指引：</div>
            <div>• <strong className="text-slate-700">預設管理員</strong>：帳號 <code className="text-sky-700 bg-sky-100 px-1 py-0.5 rounded">admin</code> / 密碼 <code className="text-sky-700 bg-sky-100 px-1 py-0.5 rounded">admin123</code></div>
            <div>• <strong className="text-slate-700">老師帳號</strong>：若無帳號可點擊下方註冊，由管理員審核開通。</div>
            <div>• <strong className="text-slate-700">學生帳號</strong>：由授課老師在班級後台建立並發放帳密通知條。</div>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/register"
              className="inline-flex items-center text-sm font-semibold text-sky-600 hover:text-sky-700"
            >
              我是新教師，點此申請帳號 <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
