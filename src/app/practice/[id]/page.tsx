'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen, Clock, ArrowLeft, Send, CheckCircle2,
  AlertCircle, Sparkles, HelpCircle, User, Compass
} from 'lucide-react';
import { TestPaper, TestQuestion } from '@/lib/types';

export default function PracticeTakingPage() {
  const router = useRouter();
  const params = useParams();
  const testId = params.id as string;

  const [testPaper, setTestPaper] = useState<TestPaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [nickname, setNickname] = useState('自主學習同學');
  const [submitting, setSubmitting] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">
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
      const res = await fetch('/api/practice/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testPaperId: testPaper.id,
          rawAnswers: answers,
          nickname,
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
      ? 'text-lg leading-loose'
      : fontSize === 'large'
      ? 'text-base leading-relaxed'
      : 'text-sm leading-relaxed';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between">
      {/* 頂部導航與進度列 */}
      <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/practice"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              title="離開自學"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-50 text-sky-700">
                  開放自學體驗
                </span>
                <span className="text-xs text-slate-400">國小 {testPaper.targetGrade} 年級</span>
              </div>
              <h1 className="text-sm font-bold text-slate-900 line-clamp-1">{testPaper.title}</h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* 字體縮放按鈕 */}
            <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl space-x-1 text-xs">
              <button
                onClick={() => setFontSize('normal')}
                className={`px-2 py-0.5 rounded-lg font-bold ${
                  fontSize === 'normal' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
                }`}
              >
                標準
              </button>
              <button
                onClick={() => setFontSize('large')}
                className={`px-2 py-0.5 rounded-lg font-bold ${
                  fontSize === 'large' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
                }`}
              >
                中字級
              </button>
              <button
                onClick={() => setFontSize('xlarge')}
                className={`px-2 py-0.5 rounded-lg font-bold ${
                  fontSize === 'xlarge' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
                }`}
              >
                大字級
              </button>
            </div>

            {/* 作答者暱稱 */}
            <div className="hidden md:flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl text-xs">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="輸入姓名/暱稱"
                className="bg-transparent border-none text-slate-800 text-xs w-24 focus:outline-none font-bold"
              />
            </div>

            {/* 交卷按鈕 */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-xs font-bold inline-flex items-center space-x-1.5 shadow-sm transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? '批改中...' : '交卷並診斷'}</span>
            </button>
          </div>
        </div>

        {/* 作答進度條 */}
        <div className="w-full bg-slate-200 h-1">
          <div
            className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      {/* 雙欄主閱讀區塊 */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 左側：文本文章區 (佔 6 欄) */}
        <section className="lg:col-span-6 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 lg:sticky lg:top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-[11px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded">
              {testPaper.textType === 'literary' ? '文學性故事閱讀' : '訊息性科普閱讀'}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
              《{testPaper.title}》
            </h2>
            <div className="text-xs text-slate-400 mt-1 flex items-center space-x-3">
              <span>全文約 {testPaper.wordCount} 字</span>
              <span>•</span>
              <span>共 {testPaper.paragraphs.length} 個自然段</span>
            </div>
          </div>

          {/* 插圖 / SVG 流程圖 */}
          {testPaper.illustrations && testPaper.illustrations.length > 0 && (
            <div className="space-y-4">
              {testPaper.illustrations.map((ill) => (
                <div key={ill.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  {ill.imageUrl ? (
                    <div className="w-full flex justify-center py-2">
                      <img
                        src={ill.imageUrl}
                        alt={ill.caption || '課文插圖'}
                        className="max-w-full h-auto max-h-96 object-contain rounded-xl shadow-sm bg-white"
                      />
                    </div>
                  ) : ill.type === 'svg_diagram' && ill.svgCode ? (
                    <div
                      className="w-full overflow-x-auto flex justify-center py-2"
                      dangerouslySetInnerHTML={{ __html: ill.svgCode }}
                    />
                  ) : null}
                  {ill.caption && (
                    <p className="text-center text-xs text-slate-500 font-medium mt-2">
                      圖：{ill.caption}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 文章段落 */}
          <div className={`space-y-4 text-slate-800 ${fontClass}`}>
            {testPaper.paragraphs.map((p) => (
              <div key={p.paragraphNumber} className="relative group flex items-start space-x-2">
                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0 mt-1 select-none">
                  P{p.paragraphNumber}
                </span>
                <p className="indent-4 leading-relaxed">{p.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 右側：答題區 (佔 6 欄) */}
        <section className="lg:col-span-6 space-y-6">
          <div className="bg-sky-50/70 p-4 rounded-2xl border border-sky-100 flex items-center justify-between text-xs text-sky-800">
            <span>
              已完成：<strong>{answeredCount}</strong> / {totalQuestions} 題 ({progressPct}%)
            </span>
            <span className="text-slate-500">回答開放簡答題時，請儘量結合文章字句佐證！</span>
          </div>

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
                  <div className="flex items-center justify-between">
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

                    <span className="text-xs font-bold text-slate-500">
                      配分：{q.points} 分
                    </span>
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
                            className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm font-medium transition flex items-center space-x-3 ${
                              isSelected
                                ? 'bg-sky-50 border-sky-500 text-sky-900 shadow-sm'
                                : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs border ${
                                isSelected
                                  ? 'bg-sky-600 text-white border-sky-600'
                                  : 'bg-white border-slate-300 text-slate-600'
                              }`}
                            >
                              {opt.label}
                            </span>
                            <span className="flex-1">{opt.text}</span>
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
                        className="w-full p-4 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition leading-relaxed resize-y"
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
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-slate-800">準備好領取您的診斷書了嗎？</div>
              <div className="text-xs text-slate-400">
                已答 {answeredCount} / {totalQuestions} 題
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-xs font-bold inline-flex items-center space-x-1.5 shadow transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? '批改運算中...' : '確認交卷'}</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
