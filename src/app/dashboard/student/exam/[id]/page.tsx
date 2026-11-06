'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen, ArrowLeft, ArrowRight, Send, CheckCircle2, AlertCircle,
  HelpCircle, RefreshCw, ZoomIn, ZoomOut, Check, FileText, ChevronRight
} from 'lucide-react';
import { TestPaper, TestQuestion } from '@/lib/types';
import { ArticleContent, ArticleModal } from '@/components/article';
import { api, ApiClientError } from '@/lib/api-client';

export default function StudentExamPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const testId = params.id as string;
  const assignmentId = searchParams.get('assignmentId') || undefined;

  const [testPaper, setTestPaper] = useState<TestPaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 學生答題流程階段: 'reading' (先閱讀文章) | 'answering' (再回答題目)
  const [phase, setPhase] = useState<'reading' | 'answering'>('reading');
  // 做題中隨時查看文章的彈窗狀態
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);

  // 學生答案暫存: { questionId: answerText }
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // 字體大小等級: 0 (標準), 1 (放大), 2 (超大)
  const [fontSizeLevel, setFontSizeLevel] = useState<number>(0);
  // 當前選中的題目快速索引
  const [activeQuestionId, setActiveQuestionId] = useState<string>('');

  useEffect(() => {
    const fetchExam = async () => {
      try {
        setLoading(true);
        const data = await api.student.getExam(testId, assignmentId);

        if (data.alreadySubmitted) {
          if (!data.allowRetake) {
            alert('本測驗教師已設定為「僅限一次作答」，您已完成測驗，系統將帶您前往查看素養診斷報告。');
            router.push(`/dashboard/student/result/${data.submissionId}`);
            return;
          } else {
            const wantRetake = confirm(
              '您先前已完成繳交過本測驗。\n\n本測驗教師開放「允許多次作答練習」！\n點擊「確定」重新作答加強練習；點擊「取消」前往查看先前的素養診斷報告。'
            );
            if (!wantRetake) {
              router.push(`/dashboard/student/result/${data.submissionId}`);
              return;
            }
          }
        }

        setTestPaper(data.testPaper);
        if (data.testPaper?.questions?.length > 0) {
          setActiveQuestionId(data.testPaper.questions[0].id);
        }
      } catch (err: any) {
        if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
          router.push('/login');
          return;
        }
        setErrorMsg(err.message || '載入試卷失敗');
      } finally {
        setLoading(false);
      }
    };
    if (testId) fetchExam();
  }, [testId, assignmentId, router]);

  const handleSelectChoice = (questionId: string, label: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: label }));
  };

  const handleTextAnswerChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: text }));
  };

  const handleSubmit = async () => {
    if (!testPaper) return;

    // 檢查未填題數
    const totalQ = testPaper.questions.length;
    const answeredCount = Object.values(answers).filter((a) => a && a.trim().length > 0).length;

    if (answeredCount < totalQ) {
      const confirmSubmit = confirm(
        `您還有 ${totalQ - answeredCount} 道題目尚未作答，確定現在就交卷嗎？`
      );
      if (!confirmSubmit) return;
    } else {
      if (!confirm('您已完成所有題目，確定要繳交試卷並請 AI 進行批改診斷嗎？')) return;
    }

    setSubmitting(true);
    try {
      const data = await api.student.submitExam({
        testPaperId: testPaper.id,
        assignmentId,
        rawAnswers: answers,
      });

      router.push(`/dashboard/student/result/${data.submissionId}`);
    } catch (err: any) {
      alert(err.message || '交卷失敗');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 space-y-4">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-bold text-slate-600">正在準備您的 PIRLS 閱讀試卷...</p>
      </div>
    );
  }

  if (errorMsg || !testPaper) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl border border-red-200 text-center max-w-md space-y-3 shadow-sm">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">無法載入測驗</h3>
          <p className="text-xs text-slate-500">{errorMsg || '試卷不存在或您無受測權限'}</p>
          <Link
            href="/dashboard/student"
            className="mt-4 inline-block px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200"
          >
            返回個人工作台
          </Link>
        </div>
      </div>
    );
  }

  const answeredCount = Object.values(answers).filter((a) => a && a.trim().length > 0).length;
  const progressPercent = Math.round((answeredCount / testPaper.questions.length) * 100);

  const getArticleFontSize = () => {
    if (fontSizeLevel === 1) return 'text-base sm:text-lg leading-relaxed';
    if (fontSizeLevel === 2) return 'text-lg sm:text-xl leading-loose';
    return 'text-sm sm:text-base leading-relaxed';
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between">
      {/* 頂部作答導航列 */}
      <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard/student"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              title="返回工作台"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    phase === 'reading'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                  }`}
                >
                  {phase === 'reading' ? '📖 第 1 階段：閱讀文章' : '📝 第 2 階段：題目作答'}
                </span>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  國小 {testPaper.targetGrade} 年級
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 line-clamp-1">{testPaper.title}</h1>
            </div>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* 字體放大縮小按鈕 */}
            <div className="hidden sm:flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setFontSizeLevel(Math.max(0, fontSizeLevel - 1))}
                className="p-1 rounded hover:bg-white text-slate-600 transition"
                title="縮小字體"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-bold px-1 text-slate-600">字級</span>
              <button
                onClick={() => setFontSizeLevel(Math.min(2, fontSizeLevel + 1))}
                className="p-1 rounded hover:bg-white text-slate-600 transition"
                title="放大字體"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 階段專屬動作按鈕 */}
            {phase === 'reading' ? (
              <button
                onClick={() => {
                  setPhase('answering');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition flex items-center space-x-1.5"
              >
                <span>我讀完了，開始做題</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                {/* 查看文章彈窗按鈕 */}
                <button
                  onClick={() => setIsArticleModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold flex items-center space-x-1.5 transition shadow-sm"
                  title="點擊隨時彈出完整文章對照"
                >
                  <BookOpen className="w-4 h-4 text-amber-600" />
                  <span>查看文章</span>
                </button>

                {/* 作答進度 */}
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-slate-700">
                    進度：{answeredCount} / {testPaper.questions.length} 題
                  </div>
                  <div className="w-20 bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                    <div
                      className="bg-indigo-600 h-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* 交卷按鈕 */}
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>批改中...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>交卷</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 依階段切換主介面 */}
      {phase === 'reading' ? (
        /* ========== 第 1 階段：專注文讀模式 ========== */
        <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
          {/* 引導標籤卡 */}
          <div className="bg-gradient-to-r from-indigo-50 via-sky-50 to-indigo-50 p-4 sm:p-5 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-md shadow-indigo-500/20">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black px-2 py-0.5 rounded bg-indigo-600 text-white">
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
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center justify-center space-x-1.5 transition flex-shrink-0"
            >
              <span>我讀完了，開始做題</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* 文章閱讀大卡片 */}
          <article className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {testPaper.textType === 'literary' ? '文學性故事閱讀' : '訊息性科普閱讀'}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  約 {testPaper.wordCount} 字 • 共 {testPaper.paragraphs.length} 個自然段
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                {testPaper.title}
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
              fontSizeClass={getArticleFontSize()}
              badgeTheme="indigo"
            />

            {/* 讀畢引導區 */}
            <div className="pt-8 border-t border-slate-100">
              <div className="p-6 sm:p-8 bg-gradient-to-br from-indigo-50 via-sky-50 to-indigo-50/60 rounded-3xl border border-indigo-100 text-center space-y-4">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    文章已經讀完了嗎？
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                    接下來將進入題目回答。在做題過程中，
                    <strong className="text-indigo-600 font-bold">隨時可點擊「查看文章」按鈕</strong>彈出全文對照，尋找答案證據！
                  </p>
                </div>
                <button
                  onClick={() => {
                    setPhase('answering');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white text-sm font-bold shadow-lg shadow-indigo-500/25 transition transform hover:scale-[1.02] active:scale-[0.98] inline-flex items-center space-x-2"
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
                作答進度：{answeredCount} / {testPaper.questions.length} 題 ({progressPercent}%)
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
          <div className="space-y-5">
            {testPaper.questions.map((q) => {
              const currentAns = answers[q.id] || '';
              const isAnswered = currentAns.trim().length > 0;

              return (
                <div
                  key={q.id}
                  id={`question_${q.id}`}
                  className={`bg-white p-6 sm:p-7 rounded-3xl border shadow-sm transition space-y-4 ${
                    isAnswered ? 'border-slate-200' : 'border-indigo-200/90 ring-1 ring-indigo-50'
                  }`}
                >
                  {/* 題目標頭 */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <span className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                        {q.questionNumber}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {q.type === 'multiple_choice' ? '選擇題' : '開放簡答題'}
                      </span>
                      {q.processLevel && (
                        <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded hidden sm:inline">
                          L{q.processLevelNumber} {q.processLevel}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => setIsArticleModalOpen(true)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2.5 py-1 rounded-lg flex items-center space-x-1 font-bold transition border border-indigo-100"
                        title="開啟文章彈窗查閱線索"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>對照文章</span>
                      </button>
                      <span className="text-xs font-semibold text-slate-400">
                        配分：{q.points} 分
                      </span>
                    </div>
                  </div>

                  {/* 題幹文字 */}
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed">
                    {q.prompt}
                  </h3>

                  {/* 題幹插圖縮圖 */}
                  {q.thumbnailUrl && (
                    <div className="w-20 h-20 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      <img src={q.thumbnailUrl} alt="題目插圖" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* 答題區域 */}
                  {q.type === 'multiple_choice' ? (
                    /* 選擇題選項 */
                    <div className="space-y-2.5 pt-1">
                      {q.options?.map((opt) => {
                        const isSelected = currentAns === opt.label;
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => handleSelectChoice(q.id, opt.label)}
                            className={`w-full p-4 rounded-2xl border text-left text-xs sm:text-sm font-medium transition flex items-center space-x-3 ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500/20 shadow-sm'
                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <span
                              className={`w-7 h-7 rounded-xl text-xs font-bold flex items-center justify-center flex-shrink-0 transition ${
                                isSelected
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {opt.label}
                            </span>
                            <span className="flex-1 leading-relaxed">{opt.text}</span>
                            {isSelected && <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* 簡答題輸入框 */
                    <div className="space-y-2 pt-1">
                      <div className="relative">
                        <textarea
                          rows={4}
                          value={currentAns}
                          onChange={(e) => handleTextAnswerChange(q.id, e.target.value)}
                          placeholder="請將你的想法與文章理由寫在這裡..."
                          className="w-full text-sm text-slate-800 rounded-2xl border border-slate-300 p-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-400 leading-relaxed shadow-sm resize-y"
                        />
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-slate-400 px-1">
                        <span>💡 提示：可點右上角「對照文章」找出段落理由，論述會更完整喔！</span>
                        <span>已輸入 {currentAns.length} 字</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 底部大交卷按鈕 */}
          <div className="p-6 sm:p-8 bg-white rounded-3xl border border-slate-200 shadow-sm text-center space-y-3">
            <h4 className="text-base font-bold text-slate-800">所有題目都檢查完畢了嗎？</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              確認作答完畢後，點擊下方按鈕繳交試卷，AI 將立即為你進行四維度閱讀素養診斷！
            </p>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white text-sm font-bold shadow-lg shadow-indigo-500/25 transition disabled:opacity-50"
            >
              {submitting ? 'AI 正在為你進行素養批改中...' : '確認送出測驗'}
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
        accentColor="indigo"
      />
    </div>
  );
}
