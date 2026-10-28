'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen, PlusCircle, ArrowLeft, Trash2, Send,
  Users, Calendar, Award, CheckCircle2, AlertCircle, BarChart3,
  Printer, Globe
} from 'lucide-react';
import { TestPaper, ClassRoom } from '@/lib/types';

export default function TeacherTestPapersPage() {
  const router = useRouter();
  const [testPapers, setTestPapers] = useState<TestPaper[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);

  // 派卷 Modal 狀態
  const [assignModalTest, setAssignModalTest] = useState<TestPaper | null>(null);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [modalIsPublic, setModalIsPublic] = useState(false);
  const [modalExamCode, setModalExamCode] = useState('');
  const [assigning, setAssigning] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [testRes, clsRes] = await Promise.all([
        fetch('/api/teacher/test-papers'),
        fetch('/api/teacher/classes'),
      ]);

      if (testRes.status === 401 || testRes.status === 403) {
        router.push('/login');
        return;
      }

      const testData = await testRes.json();
      const clsData = await clsRes.json();

      setTestPapers(testData.testPapers || []);
      setClasses(clsData.classes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 刪除試卷
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`確定要刪除試卷《${title}》嗎？`)) return;
    try {
      const res = await fetch(`/api/teacher/test-papers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTestPapers(testPapers.filter((t) => t.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 打開派卷彈窗
  const openAssignModal = (test: TestPaper) => {
    setAssignModalTest(test);
    setSelectedClassIds(test.assignedClassIds || []);
    setModalIsPublic(test.isPublic || false);
    setModalExamCode(test.examCode || '');
  };

  // 儲存派卷
  const handleSaveAssign = async () => {
    if (!assignModalTest) return;
    try {
      setAssigning(true);
      const res = await fetch(`/api/teacher/test-papers/${assignModalTest.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classIds: selectedClassIds,
          isPublic: modalIsPublic,
          examCode: modalExamCode,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        setAssignModalTest(null);
        fetchData();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAssigning(false);
    }
  };

  const toggleClassSelect = (classId: string) => {
    if (selectedClassIds.includes(classId)) {
      setSelectedClassIds(selectedClassIds.filter((id) => id !== classId));
    } else {
      setSelectedClassIds([...selectedClassIds, classId]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* 導覽列 */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard/teacher"
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">我的 PIRLS 題庫與班級派卷</h1>
              <p className="text-xs text-slate-500">管理自編考卷、指派隨堂測驗與正式素養檢定</p>
            </div>
          </div>

          <Link
            href="/dashboard/teacher/create"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-xs font-bold inline-flex items-center space-x-1.5 shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>AI 命題新試卷</span>
          </Link>
        </div>
      </header>

      {/* 主體區塊 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {loading ? (
          <div className="py-16 text-center text-slate-400">載入題庫中...</div>
        ) : testPapers.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-lg mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 mx-auto flex items-center justify-center">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">您目前還沒有建立任何試卷</h3>
            <p className="text-xs text-slate-500">
              點擊下方按鈕，運用 AI 輸入主題或貼上國語課文，一鍵提煉 PIRLS 四層次考卷！
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard/teacher/create"
                className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm inline-flex items-center space-x-1.5 shadow-sm transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>立即建立第一份試卷</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testPapers.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:border-sky-300 transition space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                      t.textType === 'literary' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {t.textType === 'literary' ? '文學性文本' : '訊息性文本'}
                    </span>
                    <span className="text-xs text-slate-400">
                      國小 {t.targetGrade} 年級
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mt-2 line-clamp-1">{t.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {t.themeSummary || t.articleContent.substring(0, 60) + '...'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>題數：{t.questions.length} 題</span>
                    <span>總分：{t.totalPoints} 分</span>
                    <span>字數：{t.wordCount} 字</span>
                  </div>

                  <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
                    <div>
                      已指派班級：
                      {t.assignedClassIds && t.assignedClassIds.length > 0 ? (
                        <span className="text-sky-600 font-bold ml-1">{t.assignedClassIds.length} 個班級</span>
                      ) : (
                        <span className="text-slate-400 ml-1">尚未指派</span>
                      )}
                    </div>
                    {t.isPublic && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        開放自學中
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => openAssignModal(t)}
                      className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold inline-flex items-center space-x-1 transition"
                      title="指派班級或設定公開自學"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>指派</span>
                    </button>

                    <Link
                      href={`/dashboard/teacher/test-papers/${t.id}/results`}
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold inline-flex items-center space-x-1 transition"
                      title="檢視全班受測成績與五大基準落點"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>成績</span>
                    </Link>

                    <a
                      href={`/print/${t.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center space-x-1 transition"
                      title="A4 雙面列印試卷"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>A4</span>
                    </a>
                  </div>

                  <button
                    onClick={() => handleDelete(t.id, t.title)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="刪除試卷"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 派卷 Modal */}
      {assignModalTest && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              指派試卷《{assignModalTest.title}》
            </h3>
            <p className="text-xs text-slate-500">
              勾選要指派受測的班級。學生登入後即可在專屬工作區看到這份測驗！
            </p>

            {classes.length === 0 ? (
              <div className="p-4 bg-amber-50 text-amber-800 text-xs rounded-xl">
                您尚未建立任何班級，請先至班級工作台建立班級！
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto border border-slate-200 p-3 rounded-xl bg-slate-50">
                {classes.map((c) => {
                  const isChecked = selectedClassIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className="flex items-center space-x-3 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-sky-50 transition"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleClassSelect(c.id)}
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-4 h-4"
                      />
                      <div className="text-xs font-bold text-slate-800">
                        {c.name} (國小 {c.gradeLevel} 年級 • {c.studentCount} 位學生)
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Stage 6: 雙場景營運設定 (開放自學與測驗代碼) */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={modalIsPublic}
                  onChange={(e) => setModalIsPublic(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-4 h-4"
                />
                <span className="text-xs font-bold text-slate-800">
                  同時公開至「開放自學區」（全校與訪客免指派即可練習）
                </span>
              </label>

              <div className="flex items-center space-x-2 text-xs">
                <span className="text-slate-600 font-bold flex-shrink-0">測驗安全碼：</span>
                <input
                  type="text"
                  value={modalExamCode}
                  onChange={(e) => setModalExamCode(e.target.value)}
                  placeholder="選填，例如 2026PIRLS"
                  className="p-1.5 rounded-lg border border-slate-200 text-xs w-full focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setAssignModalTest(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                disabled={assigning}
                onClick={handleSaveAssign}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
              >
                {assigning ? '派卷中...' : '確認指派'}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="py-4 text-center text-xs text-slate-400 border-t bg-white">
        PIRLS 智慧閱讀素養評量平臺 • 題庫管理中心
      </footer>
    </div>
  );
}
