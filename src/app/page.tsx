'use client';

import Link from 'next/link';
import { BookOpen, Award, CheckCircle, BarChart3, Users, Sparkles, Compass } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* 導覽列 */}
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-700 to-indigo-800">
                PIRLS 智慧閱讀素養評量平臺
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                國小 3-6 年級
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/practice"
              className="px-3.5 py-2 text-sm font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition"
            >
              開放自學區
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-sky-600 transition"
            >
              系統登入
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition"
            >
              教師帳號申請
            </Link>
          </div>
        </div>
      </header>

      {/* 英雄區 (Hero Section) */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center text-center justify-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-sm mb-6 font-medium">
          <Sparkles className="w-4 h-4 text-sky-500" />
          <span>依循 IEA PIRLS 國際閱讀素養四層次架構</span>
        </div>
        
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight max-w-4xl">
          讓每一次閱讀，都成為思辨思維的
          <span className="text-sky-600"> 智慧階梯</span>
        </h1>
        
        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl leading-relaxed">
          結合大型語言模型與 PIRLS 國際標準，提供 800~1,200 字適齡文本、四層次人機協同出題、精準 Rubrics 批改與三明治正向回饋，完整定位學生的國際常模落點。
        </p>

        {/* 雙軌入口按鈕 */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
          <Link
            href="/login"
            className="px-8 py-4 rounded-xl text-base font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 shadow-lg shadow-sky-500/25 transition transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
          >
            <Users className="w-5 h-5" />
            <span>班級測驗與後台入口</span>
          </Link>
          <Link
            href="/practice"
            className="px-8 py-4 rounded-xl text-base font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-sm transition flex items-center justify-center space-x-2"
          >
            <Compass className="w-5 h-5 text-sky-600" />
            <span>進入開放自學練習區</span>
          </Link>
        </div>

        {/* 四大層次特點展示 */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-4 gap-6 text-left w-full">
          <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold mb-4">
              L1
            </div>
            <h3 className="text-lg font-bold text-slate-900">直接提取訊息</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              辨識與定位文章中明確陳述的時間、人物、地點與核心事實。
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold mb-4">
              L2
            </div>
            <h3 className="text-lg font-bold text-slate-900">直接推論</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              串連相鄰線索，理解未明言但顯而易見的因果關係與角色動機。
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold mb-4">
              L3
            </div>
            <h3 className="text-lg font-bold text-slate-900">詮釋整合觀點</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              跨段落統整全文脈絡，提煉核心主旨、寓意及角色的心態轉變。
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold mb-4">
              L4
            </div>
            <h3 className="text-lg font-bold text-slate-900">檢驗與評估</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              客觀審視作者手法、修辭效果，結合生活經驗進行批判性思考。
            </p>
          </div>
        </div>
      </main>

      {/* 頁尾 */}
      <footer className="border-t bg-white py-6 text-center text-sm text-slate-500">
        <p>PIRLS 智慧閱讀素養評量平臺 © 2026 • 專為國小語文教學量身打造</p>
      </footer>
    </div>
  );
}
