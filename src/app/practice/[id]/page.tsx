'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen, Clock, ArrowLeft, ArrowRight, Send, CheckCircle2,
  AlertCircle, Sparkles, HelpCircle, User, Compass, X, Check, ZoomIn, ZoomOut
} from 'lucide-react';
import { TestPaper, TestQuestion } from '@/lib/types';
import { ArticleContent, ArticleModal } from '@/components/article';

export default function PracticeTakingPage() {
  const router = useRouter();
  const params = useParams();
  const testId = params.id as string;

  const [testPaper, setTestPaper] = useState<TestPaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [nickname, setNickname] = useState('自主學習同學');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
          if (data.user.displayName) {
            setNickname(data.user.displayName);
          }
        }
      })
      .catch(() => {});
  }, []);

  // 自學答題流程階段: 'reading' (先閱讀文章) | 'answering' (再回答題目)
  const [phase, setPhase] = useState<'reading' | 'answering'>('reading');
  // 做題中隨時查看文章的彈窗狀態
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);

  // 作答計時器狀態
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!startTime || submitting) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, submitting]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remSecs).padStart(2, '0')}`;
  };

  useEffect(() => {
    const fetchExam = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/student/exam/${testId}`);
        if (!res.ok) {
          throw new Error('載入試卷失敗');
        }
        const data = await res.json();
        setTestPaper(data.testPaper);
        setStartTime(Date.now());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (testId) fetchExam();
  }, [testId]);


  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-bold text-sm">
        正在載入自學試卷...
      </div>
    );
  }

  if (!testPaper) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-md space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">找不到試卷或試卷未開放</h3>
          <Link
            href="/practice"
            className="inline-block mt-3 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
          >
            返回自學目錄
          </Link>
        </div>
      </div>
    );
  }

  const handleSelectOption = (questionId: string, label: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: label }));
  };

  const handleTextChange = (questionId: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: val }));
  };

  // 計算已作答題數
  const totalQuestions = testPaper.questions.length;
  const answeredCount = Object.values(answers).filter((a) => a && a.trim() !== '').length;
  const progressPct = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const handleSubmit = async () => {
    if (answeredCount < totalQuestions) {
      if (!confirm(`您還有 ${totalQuestions - answeredCount} 題尚未作答，確定要現在繳卷並進行 AI 批改嗎？`)) {
        return;
      }
    }

    try {
      setSubmitting(true);
      const finalDuration = startTime ? Math.max(1, Math.floor((Date.now() - startTime) / 1000)) : elapsedSeconds;
      const startedAtIso = startTime ? new Date(startTime).toISOString() : new Date().toISOString();

      const res = await fetch('/api/practice/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testPaperId: testPaper.id,
          rawAnswers: answers,
          nickname,
          durationSeconds: finalDuration,
          timeSpentSeconds: finalDuration,
          startedAt: startedAtIso,
        }),
      });

      const data = await res.json();
      if (res.ok && data.submissionId) {
        router.push(`/dashboard/student/result/${data.submissionId}`);
      } else {
        alert(data.error || '自學批改失敗');
      }
    } catch (err: any) {
      alert(err.message || '連線錯誤');
    } finally {
      setSubmitting(false);
    }
  };

  const fontClass =
    fontSize === 'xlarge'
      ? 'text-lg sm:text-xl leading-loose'
      : fontSize === 'large'
      ? 'text-base sm:text-lg leading-relaxed'
      : 'text-sm sm:text-base leading-relaxed';



  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between">
      {/* 頂部導航與進度列 */}
      <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/practice"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              title="離開自學"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    phase === 'reading'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-sky-100 text-sky-800 border border-sky-200'
                  }`}
                >
                  {phase === 'reading' ? '📖 第 1 階段：閱讀文章' : '📝 第 2 階段：自學作答'}
                </span>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  國小 {testPaper.targetGrade} 年級
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 line-clamp-1">{testPaper.title}</h1>
            </div>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* 字體縮放按鈕 */}
            <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl space-x-1 text-xs">
              <button
                onClick={() => setFontSize('normal')}
                className={`px-2 py-0.5 rounded-lg font-bold transition ${
                  fontSize === 'normal' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
                }`}
              >
                標準
              </button>
              <button
                onClick={() => setFontSize('large')}
                className={`px-2 py-0.5 rounded-lg font-bold transition ${
                  fontSize === 'large' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
                }`}
              >
                中字級
              </button>
              <button
                onClick={() => setFontSize('xlarge')}
                className={`px-2 py-0.5 rounded-lg font-bold transition ${
                  fontSize === 'xlarge' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
                }`}
              >
                大字級
              </button>
            </div>

            {/* 作答時間計時 */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/80 border border-indigo-100 text-indigo-700 font-mono text-xs font-bold shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
              <span>{formatTime(elapsedSeconds)}</span>
            </div>

            {/* 作答者暱稱 */}
            <div className="hidden md:flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl text-xs">
              <User className="w-3.5 h-3.5 text-slate-400" />
              {currentUser ? (
                <span className="font-bold text-slate-800" title="已登入，成績將自動同步至個人歷程與教師端">
                  {currentUser.className ? `${currentUser.className} ` : ''}
                  {currentUser.seatNumber ? `${currentUser.seatNumber}號 ` : ''}
                  {currentUser.displayName}
                </span>
              ) : (
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="輸入姓名/暱稱"
                  className="bg-transparent border-none text-slate-800 text-xs w-24 focus:outline-none font-bold"
                />
              )}
            </div>

            {/* 階段專屬按鈕 */}
            {phase === 'reading' ? (
              <button
                onClick={() => {
                  setPhase('answering');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-xs font-bold inline-flex items-center space-x-1.5 shadow-md shadow-sky-500/20 transition"
              >
                <span>我讀完了，開始做題</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                {/* 隨時查看文章按鈕 */}
                <button
                  onClick={() => setIsArticleModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold flex items-center space-x-1.5 transition shadow-sm"
                  title="點擊彈出文章對照"
                >
                  <BookOpen className="w-4 h-4 text-amber-600" />
                  <span>查看文章</span>
                </button>

                {/* 交卷按鈕 */}
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-xs font-bold inline-flex items-center space-x-1.5 shadow-sm transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? '批改中...' : '交卷並診斷'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 作答進度條 */}
        {phase === 'answering' && (
          <div className="w-full bg-slate-200 h-1">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </header>

      {/* 依階段切換主介面 */}
      {phase === 'reading' ? (
        /* ========== 第 1 階段：專注文讀模式 ========== */
        <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
          {/* 引導標籤卡 */}
          <div className="bg-gradient-to-r from-sky-50 via-indigo-50 to-sky-50 p-4 sm:p-5 rounded-2xl border border-sky-100 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-md shadow-sky-500/20">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black px-2 py-0.5 rounded bg-sky-600 text-white">
                    第一階段
                  </span>
                  <span className="text-sm font-bold text-slate-800">請先仔細閱讀文章</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  專心讀完整篇故事與情境圖後，點擊下方「開始做題」即可進入題目回答階段。
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setPhase('answering');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-500/20 flex items-center justify-center space-x-1.5 transition flex-shrink-0"
            >
              <span>我讀完了，開始做題</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* 文章閱讀大卡片 */}
          <article className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-6">
            <div className="border-b border-slate-100 pb-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {testPaper.textType === 'literary' ? '文學性故事閱讀' : '訊息性科普閱讀'}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  約 {testPaper.wordCount} 字 • 共 {testPaper.paragraphs.length} 個自然段
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                《{testPaper.title}》
              </h2>
              {testPaper.themeSummary && (
                <p className="text-xs sm:text-sm text-slate-600 italic bg-slate-50 p-3.5 rounded-xl border border-slate-100 leading-relaxed">
                  💡 導讀：{testPaper.themeSummary}
                </p>
              )}
            </div>

            {/* 段落本文與穿插插圖 */}
            <ArticleContent
              paragraphs={testPaper.paragraphs}
              illustrations={testPaper.illustrations}
              fontSizeClass={fontClass}
              badgeTheme="sky"
            />

            {/* 讀畢引導區 */}
            <div className="pt-8 border-t border-slate-100">
              <div className="p-6 sm:p-8 bg-gradient-to-br from-sky-50 via-indigo-50 to-sky-50/60 rounded-3xl border border-sky-100 text-center space-y-4">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/25">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    文章已經讀完了嗎？
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                    接下來將進入題目回答。在做題過程中，
                    <strong className="text-sky-600 font-bold">隨時可點擊「查看文章」按鈕</strong>彈出全文對照，尋找答案證據！
                  </p>
                </div>
                <button
                  onClick={() => {
                    setPhase('answering');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-sm font-bold shadow-lg shadow-sky-500/25 transition transform hover:scale-[1.02] active:scale-[0.98] inline-flex items-center space-x-2"
                >
                  <span>我讀完了，開始做題</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </article>
        </main>
      ) : (
        /* ========== 第 2 階段：專注做題模式 ========== */
        <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 space-y-6">
          {/* 做題輔助導航提示 */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-800">
                作答進度：{answeredCount} / {totalQuestions} 題 ({progressPct}%)
              </span>
              <span className="text-slate-400 hidden sm:inline">•</span>
              <span className="text-slate-500 hidden sm:inline">
                需要查找證據時，可隨時點擊查看文章
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsArticleModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold flex items-center space-x-1.5 transition shadow-sm"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                <span>查看文章</span>
              </button>
              <button
                onClick={() => {
                  setPhase('reading');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                返回文章
              </button>
            </div>
          </div>

          {/* 題目清單 */}
          <div className="space-y-6">
            {testPaper.questions.map((q) => {
              const currentAns = answers[q.id] || '';
              const isAnswered = currentAns.trim() !== '';

              return (
                <div
                  key={q.id}
                  className={`bg-white rounded-3xl border p-6 sm:p-7 shadow-sm transition space-y-4 ${
                    isAnswered ? 'border-sky-300' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2">
                      <span className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                        {q.questionNumber}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          q.processLevelNumber === 1
                            ? 'bg-blue-50 text-blue-700'
                            : q.processLevelNumber === 2
                            ? 'bg-emerald-50 text-emerald-700'
                            : q.processLevelNumber === 3
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-purple-50 text-purple-700'
                        }`}
                      >
                        L{q.processLevelNumber} {q.processLevel}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => setIsArticleModalOpen(true)}
                        className="text-xs text-sky-700 hover:text-sky-900 hover:bg-sky-50 px-2.5 py-1 rounded-lg flex items-center space-x-1 font-bold transition border border-sky-100"
                        title="開啟文章彈窗查閱線索"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>對照文章</span>
                      </button>
                      <span className="text-xs font-bold text-slate-500">
                        配分：{q.points} 分
                      </span>
                    </div>
                  </div>

                  {/* 題幹 */}
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                    {q.prompt}
                  </h3>

                  {/* 選擇題選項 */}
                  {q.type === 'multiple_choice' && q.options && (
                    <div className="space-y-2.5 pt-1">
                      {q.options.map((opt) => {
                        const isSelected = currentAns === opt.label;
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => handleSelectOption(q.id, opt.label)}
                            className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border text-xs sm:text-sm font-medium transition flex items-center space-x-3 ${
                              isSelected
                                ? 'bg-sky-50 border-sky-500 text-sky-900 shadow-sm ring-1 ring-sky-400/30'
                                : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <span
                              className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs border transition ${
                                isSelected
                                  ? 'bg-sky-600 text-white border-sky-600'
                                  : 'bg-white border-slate-300 text-slate-600'
                              }`}
                            >
                              {opt.label}
                            </span>
                            <span className="flex-1 leading-relaxed">{opt.text}</span>
                            {isSelected && <Check className="w-4 h-4 text-sky-600 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* 簡答題輸入框 */}
                  {q.type === 'constructed_response' && (
                    <div className="space-y-2 pt-1">
                      <textarea
                        rows={4}
                        value={currentAns}
                        onChange={(e) => handleTextChange(q.id, e.target.value)}
                        placeholder="請依據文章內容寫下您的思考與文本證據（建議寫出具體原因與段落線索）..."
                        className="w-full p-4 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition leading-relaxed resize-y shadow-sm"
                      />
                      <div className="flex justify-between items-center text-[11px] text-slate-400">
                        <span>字數：{currentAns.length} 字</span>
                        {q.points >= 3 && (
                          <span className="text-amber-600 font-medium">
                            ★ 本題為 3 分申論題：請寫出前後轉變與文章具體事件！
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 底部繳卷卡 */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-base font-bold text-slate-800">準備好領取您的素養診斷書了嗎？</div>
              <div className="text-xs text-slate-400 mt-0.5">
                已完成 {answeredCount} / {totalQuestions} 題
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center space-x-1.5 shadow-md shadow-sky-500/25 transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? '批改運算中...' : '確認交卷並診斷'}</span>
            </button>
          </div>

          {/* 畫面右下角常駐懸浮按鈕 (FAB) - 隨時彈出文章 */}
          <button
            onClick={() => setIsArticleModalOpen(true)}
            className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold px-4 py-3 rounded-full shadow-2xl flex items-center space-x-2 transition transform hover:scale-105 active:scale-95 border-2 border-white ring-4 ring-amber-500/20"
            title="隨時查看文章內容"
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-xs sm:text-sm font-bold">隨時查看文章</span>
          </button>
        </main>
      )}

      {/* ========== 隨時查看文章之彈出視窗 (Modal) ========== */}
      <ArticleModal
        isOpen={isArticleModalOpen}
        onClose={() => setIsArticleModalOpen(false)}
        title={testPaper.title}
        wordCount={testPaper.wordCount}
        themeSummary={testPaper.themeSummary}
        paragraphs={testPaper.paragraphs}
        illustrations={testPaper.illustrations}
        accentColor="sky"
      />
    </div>
  );
}
