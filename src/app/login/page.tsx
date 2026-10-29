'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  Lock,
  User,
  AlertCircle,
  ArrowRight,
  KeyRound,
  X,
  GraduationCap,
  School,
  Sparkles,
} from 'lucide-react';

interface DirectoryStudent {
  id: string;
  seatNumber?: number;
  displayName: string;
  username: string;
}

interface DirectoryClass {
  id: string;
  name: string;
  gradeLevel: number;
  students: DirectoryStudent[];
}

interface DirectoryTeacher {
  id: string;
  displayName: string;
  school?: string;
  classes: DirectoryClass[];
}

export default function LoginPage() {
  const router = useRouter();

  // 登入方式切換：'student' (學生班級座號快速登入) | 'account' (一般帳密登入)
  const [activeTab, setActiveTab] = useState<'student' | 'account'>('student');

  // 一般帳密登入狀態
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // 學生階層選單狀態
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [teachers, setTeachers] = useState<DirectoryTeacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentUsername, setSelectedStudentUsername] = useState('');
  const [studentPassword, setStudentPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // 載入班級與學生目錄
  useEffect(() => {
    async function loadDirectory() {
      try {
        setDirectoryLoading(true);
        const res = await fetch('/api/auth/class-directory');
        const data = await res.json();
        if (data.teachers) {
          setTeachers(data.teachers);
        }
      } catch (e) {
        console.error('載入班級名冊失敗', e);
      } finally {
        setDirectoryLoading(false);
      }
    }
    loadDirectory();
  }, []);

  // 當前選取的老師與班級物件
  const currentTeacher = teachers.find((t) => t.id === selectedTeacherId);
  const availableClasses = currentTeacher?.classes || [];
  const currentClass = availableClasses.find((c) => c.id === selectedClassId);
  const availableStudents = currentClass?.students || [];

  // 切換老師時重設後續選項
  const handleTeacherChange = (teacherId: string) => {
    setSelectedTeacherId(teacherId);
    setSelectedClassId('');
    setSelectedStudentUsername('');
    setError('');
  };

  // 切換班級時重設學生選項
  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    setSelectedStudentUsername('');
    setError('');
  };

  // 學生四步階層登入送出
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedTeacherId) {
      setError('請先選擇授課老師');
      return;
    }
    if (!selectedClassId) {
      setError('請選擇所屬班級');
      return;
    }
    if (!selectedStudentUsername) {
      setError('請選擇您的座號與姓名');
      return;
    }
    if (!studentPassword) {
      setError('請輸入密碼');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: selectedStudentUsername,
          password: studentPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '登入失敗，請確認密碼是否正確，或向老師尋求協助');
      }

      router.push('/dashboard/student');
    } catch (err: any) {
      setError(err.message || '登入失敗');
    } finally {
      setLoading(false);
    }
  };

  // 一般帳密登入送出 (教師 / 管理員)
  const handleAccountSubmit = async (e: React.FormEvent) => {
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
        throw new Error(data.error || '帳號或密碼錯誤');
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Link
            href="/"
            className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-lg"
          >
            <BookOpen className="w-8 h-8" />
          </Link>
        </div>
        <h2 className="mt-4 text-center text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          PIRLS 閱讀理解評量平臺
        </h2>
        <p className="mt-2 text-center text-xs sm:text-sm text-slate-600">
          歡迎使用！學生請選班級座號，教師與管理員請使用專屬帳密
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-6 px-5 sm:py-8 sm:px-10 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200/80">
          {/* 模式切換 Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('student');
                setError('');
              }}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'student'
                  ? 'bg-white text-sky-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>👦 學生班級座號登入</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('account');
                setError('');
              }}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'account'
                  ? 'bg-white text-sky-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <User className="w-4 h-4" />
              <span>👩‍🏫 一般帳密登入</span>
            </button>
          </div>

          {/* 錯誤訊息 */}
          {error && (
            <div className="mb-5 rounded-xl bg-red-50 p-3.5 border border-red-200 flex items-start space-x-2.5 text-red-700 text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: 學生班級座號四階快速登入 */}
          {activeTab === 'student' && (
            <form className="space-y-4" onSubmit={handleStudentSubmit}>
              {directoryLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  載入班級名冊中，請稍候...
                </div>
              ) : teachers.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-2">
                  <p className="font-bold">目前系統尚未建立任何班級學生名冊。</p>
                  <p>若老師已開課，請確認已在班級工作台建立學生名單；若您持有帳號密碼，請切換至「一般帳密登入」。</p>
                </div>
              ) : (
                <>
                  {/* 第 1 步：選擇授課老師 */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      步驟 1：選擇授課老師
                    </label>
                    <select
                      value={selectedTeacherId}
                      onChange={(e) => handleTeacherChange(e.target.value)}
                      required
                      className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm font-medium"
                    >
                      <option value="">-- 請選擇授課老師 --</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.displayName} 老師 {t.school ? `(${t.school})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 第 2 步：選擇班級 */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      步驟 2：選擇班級
                    </label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => handleClassChange(e.target.value)}
                      disabled={!selectedTeacherId}
                      required
                      className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm font-medium disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="">-- 請選擇班級 --</option>
                      {availableClasses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.gradeLevel} 年級)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 第 3 步：選擇座號與姓名 */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      步驟 3：選擇座號與姓名
                    </label>
                    <select
                      value={selectedStudentUsername}
                      onChange={(e) => setSelectedStudentUsername(e.target.value)}
                      disabled={!selectedClassId}
                      required
                      className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm font-medium disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="">-- 請選擇你的座號與姓名 --</option>
                      {availableStudents.map((s) => (
                        <option key={s.id} value={s.username}>
                          {s.seatNumber ? `${s.seatNumber} 號 ` : ''}
                          {s.displayName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 第 4 步：輸入密碼 */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        步驟 4：輸入密碼
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowForgotModal(true)}
                        className="text-[11px] font-semibold text-sky-600 hover:text-sky-700"
                      >
                        忘記密碼？
                      </button>
                    </div>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type="password"
                        required
                        value={studentPassword}
                        onChange={(e) => setStudentPassword(e.target.value)}
                        placeholder="請輸入老師發給你的密碼"
                        className="block w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !selectedStudentUsername}
                    className="w-full mt-2 flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition disabled:opacity-50"
                  >
                    {loading ? '學生驗證登入中...' : '👦 學生立即進入閱讀'}
                  </button>
                </>
              )}
            </form>
          )}

          {/* TAB 2: 一般帳密登入 (教師 / 管理員 / 自主學習) */}
          {activeTab === 'account' && (
            <form className="space-y-4" onSubmit={handleAccountSubmit}>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  帳號 (Username)
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="輸入管理員、老師或學生帳號"
                    className="block w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm font-medium font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    密碼 (Password)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[11px] font-semibold text-sky-600 hover:text-sky-700"
                  >
                    忘記密碼？
                  </button>
                </div>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="輸入密碼"
                    className="block w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition disabled:opacity-50"
              >
                {loading ? '驗證登入中...' : '立即登入'}
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <Link
              href="/register"
              className="inline-flex items-center text-xs sm:text-sm font-bold text-sky-600 hover:text-sky-700"
            >
              我是新教師，點此申請帳號 <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* 忘記密碼補救指引 Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">忘記密碼補救指引</h3>
              <p className="text-xs text-slate-500 mt-0.5">依據校園教學平臺與資安管理規範：</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 space-y-3">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center flex-shrink-0 text-[11px] mt-0.5">
                  1
                </span>
                <div>
                  <strong className="text-slate-900">班級學生忘記密碼：</strong>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">
                    請直接向您的<strong className="text-emerald-800">國語任課老師</strong>反映，老師可在「班級管理後台」的學生名冊中點擊「編輯帳密」，直接為您重設新密碼！
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-2.5 border-t border-slate-200/60">
                <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center flex-shrink-0 text-[11px] mt-0.5">
                  2
                </span>
                <div>
                  <strong className="text-slate-900">授課教師忘記密碼：</strong>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">
                    請聯繫校內<strong className="text-sky-800">系統最高管理員</strong>（如教務主任、資訊組長或設備組長），管理員可於管理員後台為您一鍵重設臨時密碼。
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
              >
                我知道了，返回登入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
