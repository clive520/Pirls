'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen, Award, CheckCircle2, Sparkles, LogOut, ArrowRight,
  Compass, Clock, AlertCircle, BarChart3
} from 'lucide-react';

export default function StudentDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [assignedTests, setAssignedTests] = useState<any[]>([]);
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

        // 載入指派給該學生班級的測驗
        const testRes = await fetch('/api/student/assigned-tests');
        const testData = await testRes.json();
        setAssignedTests(testData.assignedTests || []);
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

        {/* 核心區塊：老師派發的班級測驗 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <span>老師指派的閱讀測驗 ({assignedTests.length})</span>
            </h3>
            <span className="text-xs text-slate-500">
              班級：{currentUser?.className || '尚未加入班級'}
            </span>
          </div>

          {assignedTests.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 space-y-2">
              <Clock className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="font-bold text-sm">目前老師尚未派發新測驗</div>
              <p className="text-xs text-slate-400">當老師出題並指派給您的班級時，試卷將自動顯示於此！</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignedTests.map((t) => (
                <div
                  key={t.id}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        t.textType === 'literary' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {t.textType === 'literary' ? '文學故事' : '自然科普'}
                      </span>
                      <span className="text-xs text-slate-400">
                        共 {t.questionCount} 題 • 總分 {t.totalPoints} 分
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-slate-900 mt-2">{t.title}</h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {t.themeSummary || '請仔細閱讀文章並回答 PIRLS 四層次思維試題。'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    {t.isSubmitted ? (
                      <>
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            已繳交：{t.score} / {t.totalPoints} 分
                          </span>
                        </div>
                        <Link
                          href={`/dashboard/student/result/${t.submissionId}`}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center space-x-1 transition"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>查看素養診斷報告</span>
                        </Link>
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded">
                          尚未測驗
                        </span>
                        <Link
                          href={`/dashboard/student/exam/${t.id}`}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center space-x-1.5 shadow-sm transition"
                        >
                          <span>進入測驗</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              ))}
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
