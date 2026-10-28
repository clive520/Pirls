'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen, Compass, Award, ArrowRight, ArrowLeft,
  Sparkles, Filter, CheckCircle2, ShieldCheck, HelpCircle
} from 'lucide-react';

interface PublicTestPaper {
  id: string;
  title: string;
  targetGrade: number;
  textType: 'literary' | 'informational';
  themeSummary: string;
  wordCount: number;
  totalPoints: number;
  questionsCount: number;
  createdAt: string;
}

export default function PracticeCatalogPage() {
  const [testPapers, setTestPapers] = useState<PublicTestPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState<number | 'all'>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'literary' | 'informational'>('all');

  useEffect(() => {
    const fetchPublicTests = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/practice/test-papers');
        const data = await res.json();
        setTestPapers(data.testPapers || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPublicTests();
  }, []);

  const filteredTests = testPapers.filter((t) => {
    if (selectedGrade !== 'all' && t.targetGrade !== selectedGrade) return false;
    if (selectedType !== 'all' && t.textType !== selectedType) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* 導覽列 */}
      <header className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              title="返回首頁"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">PIRLS 開放自學練習區</h1>
              <p className="text-xs text-slate-500">免登入自由挑戰 • 即時 AI 規準評分與四維雷達診斷</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 transition"
            >
              班級測驗登入
            </Link>
          </div>
        </div>
      </header>

      {/* 主體區塊 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Banner 橫幅說明 */}
        <div className="bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl text-center md:text-left">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              自主探究 • 國際閱讀素養模擬
            </span>
            <h2 className="text-2xl sm:text-3xl font-black">
              挑選一篇喜愛的故事或科普文章，展開深度思考！
            </h2>
            <p className="text-xs sm:text-sm text-sky-100 leading-relaxed">
              開放自學區精選標準 800～1,200 字長篇文本與非連續性科學圖表，測驗後立即產生專屬 PIRLS 國際量尺估計、五大基準能力勳章與正向三明治回饋！
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center flex-shrink-0">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <div className="text-xl font-black text-amber-300">4 層次</div>
              <div className="text-[11px] text-sky-100 mt-0.5">認知思維診斷</div>
            </div>
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <div className="text-xl font-black text-white">100%</div>
              <div className="text-[11px] text-sky-100 mt-0.5">即時 AI 智慧批改</div>
            </div>
          </div>
        </div>

        {/* 篩選控制器 */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
            <Filter className="w-4 h-4 text-sky-600" />
            <span>文章年級篩選：</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: '全部年級', val: 'all' },
                { label: '三年級', val: 3 },
                { label: '四年級', val: 4 },
                { label: '五年級', val: 5 },
                { label: '六年級', val: 6 },
              ].map((g) => (
                <button
                  key={g.label}
                  onClick={() => setSelectedGrade(g.val as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    selectedGrade === g.val
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
            <span>文體類型：</span>
            <div className="flex gap-1.5">
              {[
                { label: '全部', val: 'all' },
                { label: '文學性故事', val: 'literary' },
                { label: '訊息性科普', val: 'informational' },
              ].map((t) => (
                <button
                  key={t.label}
                  onClick={() => setSelectedType(t.val as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    selectedType === t.val
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 試卷卡片列表 */}
        {loading ? (
          <div className="py-16 text-center text-slate-400">正在探索開放題庫中...</div>
        ) : filteredTests.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-md mx-auto space-y-3">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">目前沒有符合條件的開放試卷</h3>
            <p className="text-xs text-slate-500">建議切換篩選條件，或請教師將自編試卷設為公開！</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTests.map((test) => (
              <div
                key={test.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:border-sky-300 hover:shadow-md transition space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        test.textType === 'literary'
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {test.textType === 'literary' ? '文學性文本' : '訊息性文本'}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      國小 {test.targetGrade} 年級
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mt-3 line-clamp-1">
                    《{test.title}》
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {test.themeSummary || '完整包含四層次 PIRLS 題本，引導閱讀深層思維。'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>題目數：{test.questionsCount} 題</span>
                    <span>總分：{test.totalPoints} 分</span>
                    <span>字數：{test.wordCount} 字</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href={`/practice/${test.id}`}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold text-xs inline-flex items-center justify-center space-x-1.5 shadow transition"
                  >
                    <span>開始自學挑戰</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 頁尾 */}
      <footer className="py-6 text-center text-xs text-slate-400 border-t bg-white">
        PIRLS 智慧閱讀素養評量平臺 • 開放自學與素養增能社群
      </footer>
    </div>
  );
}
