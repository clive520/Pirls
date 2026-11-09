'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, BookOpen, CheckCircle2, Clock, Eye, AlertCircle,
  Edit3, Sparkles, Check, X, ChevronDown, ChevronUp, FileText,
  MessageSquare, Loader2, Save, ChevronLeft, ChevronRight,
  Split, LayoutList, HelpCircle, Users, Trophy, Award
} from 'lucide-react';
import { TestPaper, TestQuestion } from '@/lib/types';
import { ArticleContent } from '@/components/article';
import { api, ApiClientError } from '@/lib/api-client';

interface StudentSubmissionAnswer {
  questionId: string;
  questionNumber: number;
  type: string;
  score: number;
  maxScore: number;
  teacherScore?: number;
  originalScore?: number;
  studentAnswer?: string;
  aiFeedback?: any;
  teacherComment?: string;
  isTeacherReviewed?: boolean;
  code?: string;
}

interface StudentSubmissionItem {
  id: string;
  studentId: string;
  studentName: string;
  seatNumber?: number;
  className?: string;
  totalScore: number;
  maxScore: number;
  scaleScore: number;
  classPR?: number;
  normPR?: number;
  isTeacherReviewed: boolean;
  submittedAt: string;
  answers: StudentSubmissionAnswer[];
}

export default function GradeByQuestionPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const testId = params.id as string;
  const assignmentId = searchParams.get('assignmentId') || undefined;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const [testPaper, setTestPaper] = useState<TestPaper | null>(null);
  const [assignment, setAssignment] = useState<any>(null);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [submissions, setSubmissions] = useState<StudentSubmissionItem[]>([]);

  // 當前選中的題目 ID
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('');

  // 暫存全班在此題的核定分數與個別評語：key: submissionId -> score / comment
  const [grades, setGrades] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // AI 深度再閱狀態：key: submissionId -> result
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [aiResults, setAiResults] = useState<Record<string, any>>({});

  // 左側文章原文對照面板控制
  const [showArticlePanel, setShowArticlePanel] = useState(true);
  const [articleFontSize, setArticleFontSize] = useState<'text-sm' | 'text-base' | 'text-lg'>('text-base');

  // 審題規準收合開關
  const [rubricOpen, setRubricOpen] = useState(true);

  // 載入資料
  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.teacher.getQuestionBatchGrading(testId, assignmentId);

      setTestPaper(data.testPaper);
      setAssignment(data.assignment || null);
      setQuestions(data.questions || []);
      setSubmissions(data.submissions || []);

      // 預設選中第 1 道開放簡答題，若無則選第 1 題
      const firstCR = data.questions?.find((q: any) => q.type === 'constructed_response');
      const defaultQId = firstCR ? firstCR.id : (data.questions?.[0]?.id || '');
      setSelectedQuestionId(defaultQId);

      // 初始化各學生的暫存評分
      initGradesForQuestion(defaultQId, data.submissions);
    } catch (err: any) {
      console.error(err);
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        router.push('/login');
        return;
      }
      setError(err.message || '載入問答題資料失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (testId) {
      fetchData();
    }
  }, [testId, assignmentId]);

  // 當切換題目時，初始化該題各學生的分數與評語
  const initGradesForQuestion = (qId: string, subsList = submissions) => {
    const newGrades: Record<string, number> = {};
    const newComments: Record<string, string> = {};

    subsList.forEach((sub) => {
      const ans = sub.answers.find((a) => a.questionId === qId);
      if (ans) {
        newGrades[sub.id] = ans.teacherScore !== undefined ? ans.teacherScore : ans.score;
        newComments[sub.id] = ans.teacherComment || '';
      }
    });

    setGrades(newGrades);
    setComments(newComments);
    setAiResults({});
  };

  // 切換題目
  const handleSelectQuestion = (qId: string) => {
    setSelectedQuestionId(qId);
    initGradesForQuestion(qId, submissions);
  };

  // 當前選中的題目物件
  const currentQuestion = useMemo(() => {
    return questions.find((q) => q.id === selectedQuestionId) || null;
  }, [questions, selectedQuestionId]);

  // 開放簡答題列表 (優先批改)
  const constructedQuestions = useMemo(() => {
    return questions.filter((q) => q.type === 'constructed_response');
  }, [questions]);

  // 當前題目在問答題列表中的索引
  const currentCrIndex = constructedQuestions.findIndex((q) => q.id === selectedQuestionId);
  const nextCrQuestion = currentCrIndex >= 0 && currentCrIndex < constructedQuestions.length - 1
    ? constructedQuestions[currentCrIndex + 1]
    : null;
  const prevCrQuestion = currentCrIndex > 0
    ? constructedQuestions[currentCrIndex - 1]
    : null;

  // 計算每道問答題的全班批改進度 (已複閱人數)
  const questionReviewStats = useMemo(() => {
    const stats: Record<string, { reviewed: number; total: number; avgScore: number }> = {};
    questions.forEach((q) => {
      let reviewed = 0;
      let totalPts = 0;
      submissions.forEach((sub) => {
        const ans = sub.answers.find((a) => a.questionId === q.id);
        if (ans) {
          if (ans.isTeacherReviewed || ans.teacherScore !== undefined) {
            reviewed++;
          }
          totalPts += ans.teacherScore !== undefined ? ans.teacherScore : ans.score;
        }
      });
      stats[q.id] = {
        reviewed,
        total: submissions.length,
        avgScore: submissions.length > 0 ? Math.round((totalPts / submissions.length) * 10) / 10 : 0,
      };
    });
    return stats;
  }, [questions, submissions]);

  // 修改某位學生的給分
  const handleScoreChange = (submissionId: string, newScore: number) => {
    setGrades((prev) => ({ ...prev, [submissionId]: newScore }));
  };

  // 修改某位學生的評語
  const handleCommentChange = (submissionId: string, comment: string) => {
    setComments((prev) => ({ ...prev, [submissionId]: comment }));
  };

  // 呼叫 Gemini AI 逐生深度再閱
  const handleAiRegrade = async (submissionId: string) => {
    if (!selectedQuestionId) return;
    try {
      setAiLoading((prev) => ({ ...prev, [submissionId]: true }));
      const data = await api.teacher.aiRegradeQuestion(submissionId, selectedQuestionId);
      if (data.results && data.results.length > 0) {
        setAiResults((prev) => ({ ...prev, [submissionId]: data.results[0] }));
      }
    } catch (err: any) {
      console.error(err);
      alert('AI 深度再閱連線異常：' + (err.message || '請確認網路'));
    } finally {
      setAiLoading((prev) => ({ ...prev, [submissionId]: false }));
    }
  };

  // 採用 AI 建議
  const handleAdoptAi = (submissionId: string) => {
    const aiRes = aiResults[submissionId];
    if (aiRes && aiRes.suggestedScore !== undefined) {
      handleScoreChange(submissionId, aiRes.suggestedScore);
      if (aiRes.reason && !comments[submissionId]) {
        handleCommentChange(submissionId, `[AI建議採分] ${aiRes.reason}`);
      }
    }
  };

  // 儲存全班本題成績
  const handleSaveBatch = async (andGoToNext: boolean = false) => {
    if (!selectedQuestionId || !testPaper) return;
    try {
      setSaving(true);
      const updates = submissions.map((sub) => ({
        submissionId: sub.id,
        score: grades[sub.id] !== undefined ? grades[sub.id] : 0,
        teacherComment: comments[sub.id] || '',
      }));

      await api.teacher.saveQuestionBatchGrading(testPaper.id, {
        questionId: selectedQuestionId,
        updates,
      });

      // 更新本機 submissions 狀態標記
      setSubmissions((prev) =>
        prev.map((sub) => {
          const updatedAnswers = sub.answers.map((ans) => {
            if (ans.questionId === selectedQuestionId) {
              const score = grades[sub.id] !== undefined ? grades[sub.id] : ans.score;
              return {
                ...ans,
                score,
                teacherScore: score,
                teacherComment: comments[sub.id] || ans.teacherComment,
                isTeacherReviewed: true,
              };
            }
            return ans;
          });
          return {
            ...sub,
            answers: updatedAnswers,
            isTeacherReviewed: true,
          };
        })
      );

      const qNum = currentQuestion ? currentQuestion.questionNumber : '';
      setToastMsg(`🎉 已成功儲存全班第 ${qNum} 題核定成績！量尺與 PR 值已即時更新。`);
      setTimeout(() => setToastMsg(''), 4000);

      // 若選擇「儲存並改下一題」
      if (andGoToNext && nextCrQuestion) {
        handleSelectQuestion(nextCrQuestion.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      console.error(err);
      alert('儲存過程發生錯誤：' + (err.message || '請確認網路連線'));
    } finally {
      setSaving(false);
    }
  };

  // 全域快捷鍵監聽：Ctrl+S 儲存本題
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveBatch(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedQuestionId, grades, comments, testPaper]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-600">正在準備全班問答題逐題批閱工作台與給分規準...</p>
      </div>
    );
  }

  if (error || !testPaper || !currentQuestion) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200 text-sm font-bold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-600" />
          <span>{error || '找不到試卷或問答題目'}</span>
        </div>
        <Link
          href={`/dashboard/teacher/test-papers/${testId}/results`}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
        >
          返回成績冊
        </Link>
      </div>
    );
  }

  const currentStat = questionReviewStats[currentQuestion.id] || { reviewed: 0, total: submissions.length, avgScore: 0 };

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col justify-between">
      {/* 頂部固定導覽列 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* 左側：返回成績冊與題本資訊 */}
          <div className="flex items-center space-x-3 min-w-0">
            <Link
              href={`/dashboard/teacher/test-papers/${testPaper.id}/results${assignmentId ? `?assignmentId=${encodeURIComponent(assignmentId)}` : ''}`}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition flex-shrink-0"
              title="返回全班成績冊"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <LayoutList className="w-4 h-4" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-bold">
                  問答題全班集中批閱
                </span>
                <span className="text-xs text-slate-400 font-semibold">
                  國小 {testPaper.targetGrade} 年級
                </span>
                {assignment && (
                  <span className="hidden sm:inline-block text-[11px] text-sky-800 bg-sky-50 px-2 py-0.2 rounded-md font-bold border border-sky-100 truncate max-w-[180px]">
                    {assignment.className}
                  </span>
                )}
              </div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                《{testPaper.title}》
              </h1>
            </div>
          </div>

          {/* 中間：題目切換快速導覽列 (特別標注開放簡答題) */}
          <div className="hidden lg:flex items-center space-x-1.5 bg-slate-100/90 p-1 rounded-2xl border border-slate-200 overflow-x-auto max-w-[50vw]">
            {constructedQuestions.map((q) => {
              const isSelected = q.id === selectedQuestionId;
              const stat = questionReviewStats[q.id];
              const isFullyReviewed = stat && stat.reviewed === stat.total && stat.total > 0;

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => handleSelectQuestion(q.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 flex-shrink-0 ${
                    isSelected
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'hover:bg-white text-slate-700'
                  }`}
                >
                  <span>第 {q.questionNumber} 題</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                    isSelected ? 'bg-purple-800/60 text-purple-100' : 'bg-slate-200 text-slate-600'
                  }`}>
                    L{q.processLevelNumber}・{q.points}分
                  </span>
                  {isFullyReviewed && (
                    <span className="text-[11px]" title="全班皆已核定完成">✓</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 右側：原文對照、快捷儲存按鈕 */}
          <div className="flex items-center space-x-2.5 flex-shrink-0">
            {/* 切換文章面板按鈕 */}
            <button
              type="button"
              onClick={() => setShowArticlePanel(!showArticlePanel)}
              className={`p-2 rounded-xl border text-xs font-bold transition flex items-center space-x-1.5 ${
                showArticlePanel
                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              title="切換左側文章原文參照面板"
            >
              <Split className="w-4 h-4" />
              <span className="hidden xl:inline">{showArticlePanel ? '收合課文' : '開啟課文對照'}</span>
            </button>

            {/* 儲存按鈕 */}
            <button
              type="button"
              onClick={() => handleSaveBatch(false)}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm shadow-xs transition disabled:opacity-50 inline-flex items-center space-x-1.5"
              title="儲存本題全班成績 (快捷鍵 Ctrl+S)"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>核定儲存中...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>儲存本題成績</span>
                </>
              )}
            </button>

            {/* 儲存並前往下一題 */}
            {nextCrQuestion && (
              <button
                type="button"
                onClick={() => handleSaveBatch(true)}
                disabled={saving}
                className="hidden sm:inline-flex px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-xs transition disabled:opacity-50 items-center space-x-1"
                title={`儲存並直接批改第 ${nextCrQuestion.questionNumber} 題`}
              >
                <span>儲存並改下一題</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 手機/平板小螢幕問答題切換列 */}
        <div className="lg:hidden border-t border-slate-100 bg-slate-50 px-4 py-2 flex items-center space-x-2 overflow-x-auto">
          <span className="text-xs font-bold text-slate-500 flex-shrink-0">問答題目：</span>
          {constructedQuestions.map((q) => {
            const isSelected = q.id === selectedQuestionId;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => handleSelectQuestion(q.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                  isSelected ? 'bg-purple-600 text-white' : 'bg-white text-slate-700 border border-slate-200'
                }`}
              >
                第 {q.questionNumber} 題 (L{q.processLevelNumber})
              </button>
            );
          })}
        </div>
      </header>

      {/* 主體區塊：雙欄 (左側課文 + 右側全班審題批閱) */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* =========================================================
              左欄 (4 欄)：文章原文對照抽屜 (支援字級調整 A / A+ / A++)
             ========================================================= */}
          {showArticlePanel && (
            <aside className="lg:col-span-4 xl:col-span-4 lg:sticky lg:top-22 space-y-4 max-h-[calc(100vh-7rem)] flex flex-col">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col flex-1 overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-4 py-3">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span>📖 文章原文對照</span>
                  </div>

                  {/* 字級大小切換按鈕 */}
                  <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setArticleFontSize('text-sm')}
                      className={`px-2 py-0.5 rounded-lg text-xs font-black transition ${
                        articleFontSize === 'text-sm' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                      title="標準字體 (14px)"
                    >
                      A
                    </button>
                    <button
                      type="button"
                      onClick={() => setArticleFontSize('text-base')}
                      className={`px-2 py-0.5 rounded-lg text-xs font-black transition ${
                        articleFontSize === 'text-base' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                      title="適中放大 (16px，預設推薦)"
                    >
                      A+
                    </button>
                    <button
                      type="button"
                      onClick={() => setArticleFontSize('text-lg')}
                      className={`px-2 py-0.5 rounded-lg text-xs font-black transition ${
                        articleFontSize === 'text-lg' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                      title="特大字體 (18px)"
                    >
                      A++
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-base font-extrabold text-slate-900 leading-snug">
                      《{testPaper.title}》
                    </h2>
                    <div className="text-xs text-slate-400 mt-1 flex items-center space-x-2">
                      <span>總字數：{testPaper.wordCount} 字</span>
                      <span>•</span>
                      <span>共 {testPaper.paragraphs?.length || 1} 個段落</span>
                    </div>
                  </div>

                  {testPaper.themeSummary && (
                    <div className="p-3.5 bg-amber-50/80 border border-amber-200/70 rounded-xl text-amber-950 text-xs sm:text-sm leading-relaxed">
                      <strong className="block font-bold mb-0.5 text-amber-900">💡 主旨綱要：</strong>
                      {testPaper.themeSummary}
                    </div>
                  )}

                  <div className="pt-1">
                    <ArticleContent
                      paragraphs={testPaper.paragraphs}
                      rawContent={testPaper.articleContent}
                      illustrations={testPaper.illustrations}
                      fontSizeClass={articleFontSize}
                    />
                  </div>
                </div>
              </div>
            </aside>
          )}

          {/* =========================================================
              右欄 (主工作台)：審題區 (一次看懂規準) + 全班學生逐人批閱
             ========================================================= */}
          <section className={`${showArticlePanel ? 'lg:col-span-8 xl:col-span-8' : 'lg:col-span-12'} space-y-6`}>
            {/* 1. 審題置頂大卡片（老師只要看一次題目與官方規準！） */}
            <div className="bg-white rounded-3xl border-2 border-purple-200 shadow-sm p-6 sm:p-7 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-3">
                  <span className="w-9 h-9 rounded-2xl bg-purple-600 text-white font-black text-sm sm:text-base flex items-center justify-center shadow-xs">
                    {currentQuestion.questionNumber}
                  </span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-purple-100 text-purple-800">
                        開放簡答題
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-100">
                        L{currentQuestion.processLevelNumber} {currentQuestion.processLevel}
                      </span>
                      {currentQuestion.rubric?.criteria?.[0]?.code && (
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-semibold">
                          IEA Code: {currentQuestion.rubric.criteria[0].code}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 font-medium">
                      本題滿分配分：<strong className="text-slate-900 font-black">{currentQuestion.points}</strong> 分 • 全班平均：<strong className="text-purple-700 font-black">{currentStat.avgScore}</strong> 分 • 批改進度：<strong className="text-emerald-700 font-black">{currentStat.reviewed}</strong> / {currentStat.total} 人
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setRubricOpen(!rubricOpen)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center space-x-1"
                  >
                    <span>{rubricOpen ? '收合評分規準' : '展開評分規準'}</span>
                    {rubricOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* 題目題幹 (特大字體 18px~20px，清晰易讀) */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400">題目題幹：</span>
                <p className="text-lg sm:text-xl font-bold text-slate-900 leading-relaxed">
                  {currentQuestion.prompt}
                </p>
              </div>

              {/* 官方給分規準 (Rubrics) 與滿分參考答案 */}
              {rubricOpen && currentQuestion.rubric && (
                <div className="space-y-4 pt-2">
                  {/* 滿分示範答案 (大字號) */}
                  {currentQuestion.rubric.sampleFullCreditAnswer && (
                    <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/70 to-indigo-50/70 border border-emerald-200 space-y-2 text-sm sm:text-base">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-950 flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-emerald-600" />
                          ⭐ PIRLS 官方滿分參考答案與採分關鍵點：
                        </span>
                        <span className="text-xs font-black text-emerald-800 bg-emerald-100/90 px-3 py-1 rounded-full border border-emerald-200">
                          滿分 {currentQuestion.points} 分範例
                        </span>
                      </div>
                      <div className="bg-white/95 p-4 rounded-xl border border-emerald-200/80 text-slate-900 font-medium leading-relaxed whitespace-pre-line shadow-xs">
                        {currentQuestion.rubric.sampleFullCreditAnswer}
                      </div>
                      {currentQuestion.rubric.samplePartialCreditAnswer && (
                        <div className="pt-1 text-xs sm:text-sm text-slate-700">
                          <strong className="text-amber-800 font-bold">部分得分範例（得 1 分）：</strong>
                          <span>{currentQuestion.rubric.samplePartialCreditAnswer}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 階梯評分定義 */}
                  {currentQuestion.rubric.criteria && currentQuestion.rubric.criteria.length > 0 && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="font-bold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-600" />
                        <span>各得分階梯定義與必備文本證據：</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {currentQuestion.rubric.criteria.map((c) => (
                          <div
                            key={c.score}
                            className={`p-3.5 rounded-xl border space-y-1.5 ${
                              c.score === currentQuestion.points
                                ? 'bg-emerald-50/60 border-emerald-200'
                                : c.score > 0
                                ? 'bg-amber-50/60 border-amber-200'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-black px-2 py-0.5 rounded ${
                                c.score === currentQuestion.points
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : c.score > 0
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                【{c.score} 分標準】
                              </span>
                              <span className="text-[11px] font-mono text-slate-400 font-semibold">
                                IEA Code {c.code}
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                              {c.description}
                            </p>
                            {c.keyEvidenceNeeded && c.keyEvidenceNeeded.length > 0 && (
                              <div className="text-xs text-indigo-950 pt-1 border-t border-slate-100 font-medium">
                                <span className="font-bold text-indigo-800">必備要素：</span>
                                <span>{c.keyEvidenceNeeded.join('、')}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 指引提醒 */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-sky-50 border border-purple-100 text-xs text-slate-700 flex items-start space-x-3">
              <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <strong className="text-purple-950 font-bold block text-sm">
                  💡 批改技巧：審題一次，全班一路批改到底！
                </strong>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  下方已依全班座號排序（1 號、2 號、3 號...）。學生作答文字已特大顯示。您只需點擊給分按鈕（[0分] [1分] [2分]），若有疑慮可點擊「✨ AI 深度再閱」獲取大模型評析。改完全班後點擊「<strong>儲存並改下一題</strong>」即可！
                </p>
              </div>
            </div>

            {/* 2. 全班學生該題作答垂直串流卡片 */}
            <div className="space-y-6">
              {submissions.map((sub, index) => {
                const ans = sub.answers.find((a) => a.questionId === selectedQuestionId);
                const currentScore = grades[sub.id] !== undefined ? grades[sub.id] : (ans?.score || 0);
                const maxScore = currentQuestion.points;
                const aiRes = aiResults[sub.id];
                const isAiLoading = aiLoading[sub.id];
                const hasAnswer = ans && ans.studentAnswer && ans.studentAnswer.trim().length > 0;

                return (
                  <div
                    key={sub.id}
                    id={`student-card-${sub.id}`}
                    className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm hover:shadow-md transition space-y-4 scroll-mt-24"
                  >
                    {/* 學生頂部資訊列 */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                      <div className="flex items-center space-x-3">
                        <span className="w-10 h-10 rounded-2xl bg-slate-900 text-white font-black text-sm flex items-center justify-center shadow-xs">
                          {sub.seatNumber !== undefined ? (sub.seatNumber < 10 ? `0${sub.seatNumber}` : sub.seatNumber) : index + 1}
                        </span>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-base sm:text-lg font-black text-slate-900">
                              {sub.studentName} 同學
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              ({sub.className || '未分班'} • {sub.seatNumber ? `${sub.seatNumber}號` : '-'})
                            </span>
                            {ans?.isTeacherReviewed ? (
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                                ✓ 已核定
                              </span>
                            ) : (
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                待核定
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            全卷目前總分：<strong className="text-slate-700 font-bold">{sub.totalScore}</strong> / {sub.maxScore} 分 • 量尺：<strong className="text-indigo-600 font-bold">{sub.scaleScore}</strong>
                          </div>
                        </div>
                      </div>

                      {/* 目前給分徽章 */}
                      <div className="flex items-center space-x-3">
                        <span className="text-xs text-slate-400 font-medium">
                          系統初評：{ans?.originalScore !== undefined ? ans.originalScore : ans?.score} 分
                        </span>
                        <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs sm:text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                          <span>教師核定：</span>
                          <strong className="text-purple-700 font-black text-base">{currentScore}</strong>
                          <span>/ {maxScore} 分</span>
                        </div>
                      </div>
                    </div>

                    {/* 學生原始作答內容（特大字體 16px~18px，排版清爽好讀） */}
                    <div className="p-5 sm:p-6 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2.5">
                      <div className="flex items-center justify-between text-amber-950 font-bold">
                        <span className="flex items-center gap-2 text-sm sm:text-base">
                          <FileText className="w-5 h-5 text-amber-700" />
                          學生原始作答內容：
                        </span>
                        <span className="text-xs sm:text-sm text-amber-800 font-semibold bg-amber-100/90 px-2.5 py-0.5 rounded-lg border border-amber-200">
                          {hasAnswer ? `${ans!.studentAnswer!.length} 字` : '未作答'}
                        </span>
                      </div>
                      <div className="p-4 sm:p-5 rounded-xl bg-white border border-amber-200 text-slate-900 font-medium leading-relaxed whitespace-pre-line text-base sm:text-lg shadow-2xs">
                        {hasAnswer ? ans!.studentAnswer : '（⚠️ 此題該生未作答）'}
                      </div>
                    </div>

                    {/* 系統初評回饋 (簡短提示) */}
                    {ans?.aiFeedback && (
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 space-y-1">
                        <p><strong className="text-emerald-700 font-bold">初評亮點：</strong>{ans.aiFeedback.strength}</p>
                        <p><strong className="text-amber-700 font-bold">初評建議：</strong>{ans.aiFeedback.weakness}</p>
                      </div>
                    )}

                    {/* ✨ AI 深度再閱建議 (Gemini 2.0) */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => handleAiRegrade(sub.id)}
                        disabled={isAiLoading}
                        className="px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 transition inline-flex items-center space-x-1.5 disabled:opacity-50"
                      >
                        {isAiLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>AI 深入審題中...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                            <span>{aiRes ? '重新 AI 深度審析' : '✨ 呼叫 AI 深度再閱建議'}</span>
                          </>
                        )}
                      </button>

                      <Link
                        href={`/dashboard/teacher/submissions/${sub.id}?testId=${testPaper.id}`}
                        target="_blank"
                        className="text-xs font-bold text-slate-500 hover:text-indigo-600 inline-flex items-center space-x-1"
                        title="在新分頁開啟該學生之全卷閱卷頁"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>檢視該生全卷</span>
                      </Link>
                    </div>

                    {/* AI 深度再閱結果提示框 */}
                    {aiRes && (
                      <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200 space-y-2 text-xs sm:text-sm animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-purple-950">AI 深度建議：</span>
                            <span className="text-base font-black text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-lg">
                              {aiRes.suggestedScore} 分
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                              (Code {aiRes.scoreCode})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAdoptAi(sub.id)}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition inline-flex items-center space-x-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>採用 AI 建議 ({aiRes.suggestedScore}分)</span>
                          </button>
                        </div>
                        <p className="text-slate-800 leading-relaxed font-medium">
                          <strong className="text-purple-900">評審理由：</strong>{aiRes.reason}
                        </p>
                        {aiRes.keyEvidenceFound && aiRes.keyEvidenceFound.length > 0 && (
                          <div className="text-xs text-slate-600">
                            <strong>辨識出文本證據：</strong>
                            <span className="text-emerald-700 font-medium ml-1">
                              {aiRes.keyEvidenceFound.join('、')}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 教師手動給分按鈕組（按鈕特大、清晰好點，點選瞬間有打勾反饋） */}
                    <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3.5">
                      <div>
                        <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-2">
                          👨‍🏫 核定給分：
                        </label>
                        <div className="flex flex-wrap gap-2.5">
                          {Array.from({ length: maxScore + 1 }, (_, idx) => idx).map((pts) => {
                            const isSelected = currentScore === pts;
                            return (
                              <button
                                key={pts}
                                type="button"
                                onClick={() => handleScoreChange(sub.id, pts)}
                                className={`px-6 py-2.5 rounded-xl font-bold transition flex items-center space-x-2 ${
                                  isSelected
                                    ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400/40'
                                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                                }`}
                              >
                                {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                                <span className="text-base font-black">{pts} 分</span>
                                {pts === maxScore && <span className="text-xs opacity-90 font-medium">(滿分)</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 本題教師個別叮嚀與評語 */}
                      <div>
                        <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
                          給該生的本題評語／勉勵（選填，將呈現在學生診斷報告）：
                        </label>
                        <input
                          type="text"
                          value={comments[sub.id] || ''}
                          onChange={(e) => handleCommentChange(sub.id, e.target.value)}
                          placeholder="例：因果轉折寫得很深刻，老師多加 1 分鼓勵你！"
                          className="w-full text-xs sm:text-sm rounded-xl border border-slate-300 p-3 focus:ring-2 focus:ring-purple-500 text-slate-900 bg-white font-medium shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 底部操作固定欄 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs sm:text-sm text-slate-600">
                核定後系統將自動重新計算每位學生的總分、PIRLS 國際量尺標準分與全班 PR 值。
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                <Link
                  href={`/dashboard/teacher/test-papers/${testPaper.id}/results${assignmentId ? `?assignmentId=${encodeURIComponent(assignmentId)}` : ''}`}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  返回成績冊
                </Link>

                <button
                  type="button"
                  onClick={() => handleSaveBatch(false)}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold shadow-sm transition disabled:opacity-50 inline-flex items-center space-x-1.5"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>正在更新量尺與常模...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>儲存本題成績 (Ctrl+S)</span>
                    </>
                  )}
                </button>

                {nextCrQuestion && (
                  <button
                    type="button"
                    onClick={() => handleSaveBatch(true)}
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-sm transition disabled:opacity-50 inline-flex items-center space-x-1"
                  >
                    <span>儲存並改下一題</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Toast 提示通知 */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 text-xs sm:text-sm font-bold flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 頁尾 */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t bg-white mt-8">
        PIRLS 智慧閱讀素養評量平臺 • 問答題全班集中批閱工作台
      </footer>
    </div>
  );
}
