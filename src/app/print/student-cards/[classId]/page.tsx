'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { Printer, X, BookOpen, QrCode, Scissors, ArrowLeft } from 'lucide-react';

interface StudentItem {
  id: string;
  displayName: string;
  seatNumber: number;
  username: string;
  initialPassword?: string;
  gradeLevel?: number;
}

interface ClassInfo {
  id: string;
  name: string;
  gradeLevel: number;
  teacherId: string;
}

export default function StudentCardsPrintPage({ params }: { params: { classId: string } }) {
  const classId = params.classId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentClass, setCurrentClass] = useState<ClassInfo | null>(null);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [teacherSchool, setTeacherSchool] = useState('');
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [cardsPerPage, setCardsPerPage] = useState<'8' | '6'>('8');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // 1. 取得當前使用者與班級
        const meRes = await fetch('/api/auth/me');
        const meData = await meRes.json();
        if (meData.user) {
          setTeacherSchool(meData.user.school || '鹿陽國小');
        }

        const clsRes = await fetch('/api/teacher/classes');
        const clsData = await clsRes.json();
        const foundClass = (clsData.classes || []).find((c: any) => c.id === classId);
        if (!foundClass) {
          throw new Error('找不到指定的教學班級');
        }
        setCurrentClass(foundClass);

        // 2. 取得班級學生名冊
        const stuRes = await fetch(`/api/teacher/students?classId=${classId}`);
        const stuData = await stuRes.json();
        const studentList: StudentItem[] = stuData.students || [];
        setStudents(studentList);

        // 3. 生成每位學生的 QR Code
        const origin =
          typeof window !== 'undefined'
            ? window.location.origin
            : 'https://pirls-learning-system.vercel.app';

        const qrMap: Record<string, string> = {};
        for (const s of studentList) {
          const loginUrl = `${origin}/login?teacherId=${foundClass.teacherId}&classId=${foundClass.id}&username=${encodeURIComponent(
            s.username
          )}`;
          const qrDataUrl = await QRCode.toDataURL(loginUrl, {
            width: 140,
            margin: 1,
            color: {
              dark: '#0369a1', // sky-700 高對比深藍，識別率極佳且外觀精美
              light: '#ffffff',
            },
          });
          qrMap[s.id] = qrDataUrl;
        }
        setQrCodes(qrMap);
      } catch (err: any) {
        setError(err.message || '載入學生資料失敗');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [classId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-700">正在生成學生帳號密碼卡與專屬 QR Code...</p>
        </div>
      </div>
    );
  }

  if (error || !currentClass) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl shadow-lg max-w-md w-full text-center space-y-4">
          <p className="text-sm font-bold text-rose-600">{error || '無法載入班級資料'}</p>
          <Link
            href="/dashboard/teacher"
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>返回教師工作台</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-16">
      {/* 頂部列印控制工具列（列印時自動隱藏） */}
      <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard/teacher"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
              title="返回教師工作台"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center space-x-2">
                <span>🖨️ 學生帳號密碼卡列印工作台</span>
                <span className="text-xs bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full font-bold">
                  {currentClass.name}（共 {students.length} 人）
                </span>
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                含專屬 6 碼數字密碼與直達 QR Code，A4 虛線裁切規格，直接列印即可發放給學生
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            {/* 每頁排版密度選擇 */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setCardsPerPage('8')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  cardsPerPage === '8' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-500'
                }`}
              >
                每頁 8 張 (推薦)
              </button>
              <button
                type="button"
                onClick={() => setCardsPerPage('6')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  cardsPerPage === '6' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-500'
                }`}
              >
                每頁 6 張 (大字)
              </button>
            </div>

            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-bold inline-flex items-center space-x-1.5 shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              <span>立即列印 (A4 規格)</span>
            </button>
          </div>
        </div>
      </header>

      {/* 列印卡片預覽區（列印時以 A4 標準輸出） */}
      <main className="max-w-5xl mx-auto p-4 sm:p-8">
        {students.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-500 space-y-3 shadow-xs">
            <p className="text-sm font-bold">本班級尚無學生資料，請先至班級工作台建立學生帳號。</p>
            <Link
              href="/dashboard/teacher"
              className="inline-block px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold"
            >
              前往建立學生
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 print:grid-cols-2 print:gap-3">
            {students.map((s) => (
              <div
                key={s.id}
                className={`student-card relative border-2 border-dashed border-slate-300 rounded-2xl p-3.5 sm:p-4 bg-white shadow-xs print:shadow-none flex flex-col justify-between break-inside-avoid print:break-inside-avoid ${
                  cardsPerPage === '6' ? 'min-h-[220px]' : 'min-h-[195px]'
                }`}
              >
                {/* 剪刀裁切提示 */}
                <div className="absolute -top-2.5 right-4 bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 flex items-center space-x-1">
                  <Scissors className="w-3 h-3 text-slate-400 rotate-90" />
                  <span>沿虛線裁切</span>
                </div>

                {/* 卡片標題 */}
                <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-5 h-5 rounded-md bg-sky-600 text-white flex items-center justify-center font-bold text-[10px]">
                      P
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 leading-tight">
                        {teacherSchool} • {currentClass.name}
                      </div>
                      <div className="text-[10px] text-slate-400 leading-tight">
                        PIRLS 智慧閱讀素養學習平臺 • 學生登入卡
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                    國小 {currentClass.gradeLevel} 年級
                  </span>
                </div>

                {/* 卡片本體：左側資訊，右側 QR Code */}
                <div className="pt-2.5 flex items-center justify-between gap-3">
                  {/* 左側：座號、姓名、帳號與 6 位數字密碼 */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-baseline space-x-2">
                      <span className="text-sm font-black text-sky-800 bg-sky-100/70 px-2 py-0.5 rounded">
                        {s.seatNumber ? `${s.seatNumber} 號` : '學生'}
                      </span>
                      <span className="text-base sm:text-lg font-black text-slate-900 truncate">
                        {s.displayName}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 flex items-center space-x-1">
                      <span>帳號：</span>
                      <span className="font-mono font-bold text-slate-700 bg-slate-50 px-1 rounded border border-slate-200">
                        {s.username}
                      </span>
                    </div>

                    {/* 6 碼數字密碼（大字高對比） */}
                    <div className="pt-0.5">
                      <div className="text-[11px] font-bold text-slate-500">登入密碼 (6位數)：</div>
                      <div className="mt-0.5 inline-flex items-center px-3 py-1 bg-amber-50 text-amber-950 border border-amber-300 rounded-lg font-mono font-extrabold text-base tracking-widest shadow-2xs">
                        {s.initialPassword || '******'}
                      </div>
                    </div>

                    {/* 使用說明 */}
                    <p className="text-[10px] text-slate-400 leading-tight pt-1">
                      💡 掃描右方 QR Code，系統自動選好班級座號，輸入上方密碼即可登入！
                    </p>
                  </div>

                  {/* 右側：專屬 QR Code */}
                  <div className="flex-shrink-0 flex flex-col items-center justify-center p-1 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    {qrCodes[s.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={qrCodes[s.id]}
                        alt="登入 QR Code"
                        className="w-22 h-22 sm:w-24 sm:h-24 rounded-lg bg-white p-1"
                      />
                    ) : (
                      <div className="w-22 h-22 sm:w-24 sm:h-24 flex items-center justify-center text-xs text-slate-400">
                        生成中...
                      </div>
                    )}
                    <span className="text-[10px] font-bold text-sky-700 mt-1 flex items-center space-x-0.5">
                      <QrCode className="w-2.5 h-2.5" />
                      <span>掃碼快速登入</span>
                    </span>
                  </div>
                </div>

                {/* 卡片底邊裝飾 */}
                <div className="mt-2 pt-1 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
                  <span>https://pirls-learning-system.vercel.app</span>
                  <span>請妥善保管個人帳號密碼</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 列印專屬 CSS */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          body {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .student-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
