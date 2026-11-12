'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen, Award, CheckCircle2, Sparkles, LogOut, ArrowRight,
  Compass, Clock, AlertCircle, BarChart3, RotateCcw, Lock, MessageSquare
} from 'lucide-react';

export default function StudentDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [assignedTests, setAssignedTests] = useState<any[]>([]);
  const [practiceList, setPracticeList] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'assigned' | 'practice'>('assigned');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const meRes = await fetch('/api/auth/me');
        const meData = await meRes.json();
        if (!meData.authenticated) {
          router.push('/login');
          return;
        }
        setCurrentUser(meData.user);

        // 平行載入「老師派發的測驗」與「我的自主練習歷程」
        const [testRes, practiceRes] = await Promise.all([
          fetch('/api/student/assigned-tests').then((r) => r.json()).catch(() => ({ assignedTests: [] })),
          fetch('/api/student/practice-history').then((r) => r.json()).catch(() => ({ practiceSubmissions: [] })),
        ]);

        setAssignedTests(testRes.assignedTests || []);
        setPracticeList(practiceRes.practiceSubmissions || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">載入中...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* 學生頂部導航 */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-sky-500 text-white flex items-center justify-center shadow">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">PIRLS 閱讀成長島</h1>
              <p className="text-xs text-slate-500">
                {currentUser?.className || '自選班級'} • {currentUser?.seatNumber ? `${currentUser?.seatNumber} 號 • ` : ''}{currentUser?.displayName} 同學
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>登出</span>
          </button>
        </div>
      </header>

      {/* 學生主舞台 */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* 歡迎橫幅 */}
        <div className="bg-gradient-to-r from-sky-600 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-sky-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>國小 {currentUser?.gradeLevel || 4} 年級閱讀素養探險</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black">
              哈囉，{currentUser?.displayName}！
            </h2>
            <p className="mt-2 text-sky-100 text-sm max-w-xl">
              今天你想挑戰哪一個好故事呢？讀完文章後回答題目，AI 助教會即時為你批改，並指出你思考最棒的地方喔！
            </p>
          </div>
        </div>

        {/* 核心區塊：老師指派測驗 vs 自主練習歷程 頁籤切換 */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('assigned')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center space-x-2 transition ${
                  activeTab === 'assigned'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>📝 老師指派的閱讀測驗</span>
                <span className={`ml-1 text-[11px] px-2 py-0.5 rounded-full font-mono ${
                  activeTab === 'assigned' ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-600'
                }`}>
                  {assignedTests.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('practice')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center space-x-2 transition ${
                  activeTab === 'practice'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>🧭 我的自主練習歷程</span>
                <span className={`ml-1 text-[11px] px-2 py-0.5 rounded-full font-mono ${
                  activeTab === 'practice' ? 'bg-sky-700 text-sky-100' : 'bg-slate-100 text-slate-600'
                }`}>
                  {practiceList.length}
                </span>
              </button>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              班級：<span className="font-bold text-slate-700">{currentUser?.className || '自選班級'}</span>
            </div>
          </div>

          {activeTab === 'assigned' ? (
            <div>
              {assignedTests.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 space-y-2">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                  <div className="font-bold text-sm">目前老師尚未派發新測驗</div>
                  <p className="text-xs text-slate-400">當老師出題並指派給您的班級時，試卷將自動顯示於此！</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assignedTests.map((t) => {
                    const now = new Date();
                    let deadlineBadge = null;
                    if (t.deadlineType === 'unlimited') {
                      deadlineBadge = (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <span>🟢 常態開放</span>
                        </span>
                      );
                    } else if (t.deadlineType === 'scheduled' && t.dueDate) {
                      const due = new Date(t.dueDate);
                      const diffMs = due.getTime() - now.getTime();
                      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                      const diffDays = Math.floor(diffHours / 24);
                      const dateStr = `${due.getMonth() + 1}/${due.getDate()} ${String(due.getHours()).padStart(2, '0')}:${String(due.getMinutes()).padStart(2, '0')}`;

                      if (diffMs <= 0 || t.isExpired) {
                        deadlineBadge = (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            <AlertCircle className="w-3 h-3 text-rose-500" />
                            <span>已截止 ({dateStr})</span>
                          </span>
                        );
                      } else if (diffDays > 0) {
                        deadlineBadge = (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                            <Clock className="w-3 h-3 text-sky-500" />
                            <span>剩餘 {diffDays} 天 ({dateStr})</span>
                          </span>
                        );
                      } else {
                        deadlineBadge = (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span>剩餘 {Math.max(1, diffHours)} 小時 ({dateStr})</span>
                          </span>
                        );
                      }
                    }

                    const examUrl = t.assignmentId
                      ? `/dashboard/student/exam/${t.id}?assignmentId=${t.assignmentId}`
                      : `/dashboard/student/exam/${t.id}`;

                    return (
                      <div
                        key={t.assignmentId || t.id}
                        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition space-y-4"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1.5">
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                                  t.textType === 'literary' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                                }`}
                              >
                                {t.textType === 'literary' ? '文學故事' : '自然科普'}
                              </span>
                              {deadlineBadge}
                            </div>
                            <span className="text-xs text-slate-400">
                              共 {t.questionCount} 題 • 總分 {t.totalPoints} 分
                            </span>
                          </div>

                          <h4 className="text-base font-bold text-slate-900 mt-2">
                            {t.assignmentTitle || t.title}
                          </h4>
                          {t.teacherName && (
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              派卷教師：<span className="font-semibold text-slate-600">{t.teacherName}</span>
                            </div>
                          )}
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            {t.themeSummary || '請仔細閱讀文章並回答 PIRLS 四層次思維試題。'}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          {t.isSubmitted ? (
                            <>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                  已繳交：{t.score} / {t.totalPoints} 分
                                </span>
                                {t.allowRetake === false ? (
                                  <span className="inline-flex items-center text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                                    <Lock className="w-2.5 h-2.5 mr-0.5" />
                                    僅限作答一次
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">
                                    <RotateCcw className="w-2.5 h-2.5 mr-0.5" />
                                    可重複練習
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-1.5">
                                <Link
                                  href={`/dashboard/student/result/${t.submissionId}`}
                                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center space-x-1 transition"
                                >
                                  <BarChart3 className="w-3.5 h-3.5" />
                                  <span>診斷報告</span>
                                </Link>
                                {t.allowRetake !== false && !t.isExpired && (
                                  <Link
                                    href={examUrl}
                                    className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold inline-flex items-center space-x-1 transition"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>再測一次</span>
                                  </Link>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center space-x-1.5">
                                <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded">
                                  尚未測驗
                                </span>
                                {t.allowRetake === false ? (
                                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                                    🔒 僅限一次
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                    🔄 允許多次
                                  </span>
                                )}
                              </div>
                              {t.isExpired ? (
                                <span
                                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold inline-flex items-center space-x-1.5 cursor-not-allowed"
                                  title="此測驗已超過截止時間"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>測驗已截止</span>
                                </span>
                              ) : (
                                <Link
                                  href={examUrl}
                                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center space-x-1.5 shadow-sm transition"
                                >
                                  <span>進入測驗</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* 分頁二：🧭 我的自主練習歷程 */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="text-xs sm:text-sm text-slate-600">
                  你在自主練習區所完成的閱讀挑戰已完整保存，任課老師也能在工作台為你批閱與指導！
                </p>
                <Link
                  href="/practice"
                  className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold inline-flex items-center space-x-1 transition self-start sm:self-auto shadow-xs"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>+ 前往自主練習庫選文章</span>
                </Link>
              </div>

              {practiceList.length === 0 ? (
                <div className="bg-white p-10 rounded-3xl border border-slate-200 text-center space-y-3 shadow-xs">
                  <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
                    <Compass className="w-8 h-8" />
                  </div>
                  <div className="font-bold text-base text-slate-800">尚未有自主練習紀錄</div>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                    想練習更多文章嗎？自主練習庫提供不同年級精選的文學故事與自然科普篇章，作答後立即可獲得 AI 規準評分與四層次能力診斷！
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/practice"
                      className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm inline-flex items-center space-x-1.5 shadow-sm transition"
                    >
                      <span>前往自主練習庫挑戰 🚀</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {practiceList.map((p) => {
                    const formatDuration = (secs?: number) => {
                      if (!secs) return null;
                      const m = Math.floor(secs / 60);
                      const s = secs % 60;
                      return `${m} 分 ${s} 秒`;
                    };

                    const formatSubmittedDate = (isoStr: string) => {
                      try {
                        const d = new Date(isoStr);
                        return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                      } catch {
                        return isoStr;
                      }
                    };

                    let statusBadge = (
                      <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <span>⏳ 未複閱</span>
                      </span>
                    );
                    if (p.reviewStatus === 'teacher_reviewed' || p.isTeacherReviewed) {
                      statusBadge = (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>👨‍🏫 老師已複閱</span>
                        </span>
                      );
                    } else if (p.reviewStatus === 'ai_reviewed') {
                      statusBadge = (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          <Sparkles className="w-3 h-3 text-purple-600" />
                          <span>🤖 AI 深度複閱</span>
                        </span>
                      );
                    }

                    return (
                      <div
                        key={p.id}
                        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-sky-300 transition space-y-4"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1.5">
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                                  p.textType === 'literary' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                                }`}
                              >
                                {p.textType === 'literary' ? '文學故事' : '自然科普'}
                              </span>
                              {statusBadge}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {formatSubmittedDate(p.submittedAt)}
                            </span>
                          </div>

                          <h4 className="text-base font-bold text-slate-900 mt-2.5">
                            《{p.testPaperTitle}》
                          </h4>

                          {/* 分數與量尺摘要 */}
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                            <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-900 font-bold border border-sky-100">
                              🎯 得分：{p.totalScore} / {p.maxScore} 分 ({p.percentage}%)
                            </span>
                            {p.scaleScore && (
                              <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-900 font-bold border border-purple-100">
                                🌐 量尺：{p.scaleScore} 分 ({p.benchmarkName || '高基準'})
                              </span>
                            )}
                            {p.durationSeconds ? (
                              <span className="px-2 py-1 rounded-lg bg-slate-50 text-slate-600 text-[11px] font-medium border border-slate-200">
                                ⏱️ 作答時間：{formatDuration(p.durationSeconds)}
                              </span>
                            ) : null}
                          </div>

                          {/* 老師親筆評語 (若有) */}
                          {p.teacherGeneralNote && (
                            <div className="mt-3 p-3 rounded-xl bg-purple-50/60 border border-purple-100 text-xs text-purple-950 leading-relaxed">
                              <div className="font-bold flex items-center space-x-1 text-purple-900 mb-0.5">
                                <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                                <span>老師親筆評語：</span>
                              </div>
                              <p className="italic font-medium">"{p.teacherGeneralNote}"</p>
                            </div>
                          )}
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <Link
                            href={`/dashboard/student/result/${p.id}`}
                            className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold inline-flex items-center space-x-1.5 transition shadow-xs"
                          >
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span>查看完整診斷書</span>
                          </Link>

                          <Link
                            href={`/practice/${p.testPaperId}`}
                            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center space-x-1 transition"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>再次練習</span>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        {/* 輔助區塊：開放自主練習區 */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">開放式自主閱讀練習庫</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                想練習更多文章嗎？挑選各年級不同故事，隨時挑戰四層次理解！
              </p>
            </div>
          </div>
          <Link
            href="/practice"
            className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition flex-shrink-0"
          >
            探索自主練習
          </Link>
        </section>

        {/* PIRLS 四層次能力勛章展示 */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-sky-600" />
            <span>PIRLS 四個思考能力階梯</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-xs font-bold text-sky-700">第一層</div>
              <div className="font-extrabold text-slate-800 mt-1">提取線索偵探</div>
              <div className="text-[11px] text-slate-500 mt-1">看清文章寫的重要事實</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-xs font-bold text-emerald-700">第二層</div>
              <div className="font-extrabold text-slate-800 mt-1">推理思考大師</div>
              <div className="text-[11px] text-slate-500 mt-1">找出文字沒明說的秘密</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-xs font-bold text-amber-700">第三層</div>
              <div className="font-extrabold text-slate-800 mt-1">詮釋整合專家</div>
              <div className="text-[11px] text-slate-500 mt-1">看懂作者想告訴我們的道理</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-xs font-bold text-purple-700">第四層</div>
              <div className="font-extrabold text-slate-800 mt-1">評論鑑賞家</div>
              <div className="text-[11px] text-slate-500 mt-1">說出自己的想法與理由</div>
            </div>
          </div>
        </div>
      </main>

      {/* 學生端頁尾 */}
      <footer className="py-6 text-center text-xs text-slate-400">
        PIRLS 智慧閱讀素養評量平臺 • 陪你一起閱讀成長
      </footer>
    </div>
  );
}
