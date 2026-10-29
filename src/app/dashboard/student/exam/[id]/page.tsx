'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen, ArrowLeft, Send, CheckCircle2, AlertCircle,
  HelpCircle, RefreshCw, ZoomIn, ZoomOut, Check
} from 'lucide-react';
import { TestPaper, TestQuestion } from '@/lib/types';

export default function StudentExamPage() {
  const router = useRouter();
  const params = useParams();
  const testId = params.id as string;

  const [testPaper, setTestPaper] = useState<TestPaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
        const res = await fetch(`/api/student/exam/${testId}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || '載入試卷失敗');

        if (data.alreadySubmitted) {
          router.push(`/dashboard/student/result/${data.submissionId}`);
          return;
        }

        setTestPaper(data.testPaper);
        if (data.testPaper?.questions?.length > 0) {
          setActiveQuestionId(data.testPaper.questions[0].id);
        }
      } catch (err: any) {
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (testId) fetchExam();
  }, [testId, router]);

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
      const res = await fetch('/api/student/submit-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testPaperId: testPaper.id,
          rawAnswers: answers,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '交卷失敗');

      router.push(`/dashboard/student/result/${data.submissionId}`);
    } catch (err: any) {
      alert(err.message);
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
    if (fontSizeLevel === 1) return 'text-base leading-relaxed';
    if (fontSizeLevel === 2) return 'text-lg leading-loose';
    return 'text-sm leading-relaxed';
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between">
      {/* 頂部作答列 */}
      <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard/student"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-slate-900 line-clamp-1">{testPaper.title}</h1>
              <p className="text-[11px] text-slate-500">
                PIRLS 閱讀測驗 • 國小 {testPaper.targetGrade} 年級
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* 字體放大縮小按鈕 */}
            <div className="hidden sm:flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setFontSizeLevel(Math.max(0, fontSizeLevel - 1))}
                className="p-1 rounded hover:bg-white text-slate-600"
                title="縮小字體"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-bold px-1 text-slate-600">字級</span>
              <button
                onClick={() => setFontSizeLevel(Math.min(2, fontSizeLevel + 1))}
                className="p-1 rounded hover:bg-white text-slate-600"
                title="放大字體"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 作答進度 */}
            <div className="text-right">
              <div className="text-xs font-bold text-slate-700">
                作答進度：{answeredCount} / {testPaper.questions.length} 題
              </div>
              <div className="w-24 bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
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
                  <span>完成交卷</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 主體雙欄視窗 */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 左欄：文章閱讀區 (佔 6 欄) */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 lg:sticky lg:top-20 max-h-[calc(100vh-100px)] overflow-y-auto">
          <div className="border-b pb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center space-x-1">
              <BookOpen className="w-4 h-4" />
              <span>閱讀材料正文</span>
            </span>
            <span className="text-xs text-slate-400 font-mono">
              約 {testPaper.wordCount} 字
            </span>
          </div>

          <h2 className="text-xl font-black text-slate-900 leading-snug">
            {testPaper.title}
          </h2>

          {/* 文章插圖或 SVG 科學圖表 */}
          {testPaper.illustrations && testPaper.illustrations.length > 0 && (
            <div className="my-3 space-y-3">
              {testPaper.illustrations.map((ill) => (
                <div key={ill.id} className="rounded-xl border border-slate-200 bg-slate-50 p-2 overflow-hidden shadow-inner">
                  {ill.imageUrl ? (
                    <div className="flex justify-center p-1 bg-white rounded-lg">
                      <img
                        src={ill.imageUrl}
                        alt={ill.caption || '課文插圖'}
                        className="w-full max-h-80 object-contain rounded-lg shadow-sm"
                      />
                    </div>
                  ) : ill.svgCode ? (
                    <div dangerouslySetInnerHTML={{ __html: ill.svgCode }} />
                  ) : (
                    <div className="h-36 bg-slate-200 rounded flex items-center justify-center text-xs text-slate-400">
                      插圖
                    </div>
                  )}
                  <p className="text-[11px] text-center text-slate-500 font-semibold mt-1.5">
                    {ill.caption}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* 段落本文 */}
          <div className={`space-y-4 text-slate-800 font-serif ${getArticleFontSize()}`}>
            {testPaper.paragraphs.map((p) => (
              <p key={p.paragraphNumber} className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 text-justify">
                {p.text}
              </p>
            ))}
          </div>
        </div>

        {/* 右欄：題目作答區 (佔 6 欄) */}
        <div className="lg:col-span-6 space-y-5">
          {testPaper.questions.map((q, idx) => {
            const currentAns = answers[q.id] || '';
            const isAnswered = currentAns.trim().length > 0;

            return (
              <div
                key={q.id}
                id={`question_${q.id}`}
                className={`bg-white p-6 rounded-2xl border shadow-sm transition space-y-4 ${
                  isAnswered ? 'border-slate-200' : 'border-indigo-200/80 ring-1 ring-indigo-50'
                }`}
              >
                {/* 題目標頭 */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                      {q.questionNumber}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {q.type === 'multiple_choice' ? '選擇題' : '開放簡答題'}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">
                    配分：{q.points} 分
                  </span>
                </div>

                {/* 題幹文字 */}
                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed">
                  {q.prompt}
                </h3>

                {/* 題幹附帶插圖縮圖 (如江婆婆微笑頭像) */}
                {q.thumbnailUrl && (
                  <div className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden">
                    <img src={q.thumbnailUrl} alt="題目插圖" className="w-full h-full object-cover" />
                  </div>
                )}

                {/* 答題區域 */}
                {q.type === 'multiple_choice' ? (
                  /* 選擇題選項卡片 */
                  <div className="space-y-2 pt-1">
                    {q.options?.map((opt) => {
                      const isSelected = currentAns === opt.label;
                      return (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => handleSelectChoice(q.id, opt.label)}
                          className={`w-full p-3.5 rounded-xl border text-left text-xs sm:text-sm font-medium transition flex items-center space-x-3 ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500/20 shadow-sm'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <span
                            className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 transition ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {opt.label}
                          </span>
                          <span className="flex-1">{opt.text}</span>
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
                        rows={3}
                        value={currentAns}
                        onChange={(e) => handleTextAnswerChange(q.id, e.target.value)}
                        placeholder="請將你的想法與文章理由寫在這裡..."
                        className="w-full text-sm text-slate-800 rounded-xl border border-slate-300 p-3.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-400 leading-relaxed"
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-400 px-1">
                      <span>💡 提示：試著從文章段落中找出具體理由，論述會更完整喔！</span>
                      <span>已輸入 {currentAns.length} 字</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* 底部大交卷按鈕 */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm text-center space-y-3">
            <h4 className="text-sm font-bold text-slate-800">檢查完畢了嗎？</h4>
            <p className="text-xs text-slate-500">
              確認作答完畢後，點擊下方按鈕繳交試卷，AI 將即時進行四維素養診斷！
            </p>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white text-sm font-bold shadow-lg shadow-indigo-500/25 transition disabled:opacity-50"
            >
              {submitting ? 'AI 正在為你進行素養批改中...' : '確認送出測驗'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
