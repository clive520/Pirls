'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Users, Award, BookOpen, BarChart3,
  CheckCircle2, Clock, Eye, AlertCircle, Trophy,
  Globe2, TrendingUp, ShieldCheck, Printer, FileSpreadsheet,
  Edit3, Sparkles, Check, X, RotateCcw, ChevronDown, ChevronUp,
  FileText, MessageSquare, Loader2, Save, ChevronLeft, ChevronRight,
  Split, LayoutList, Columns, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { BenchmarkKey, ExamSubmission, TestPaper } from '@/lib/types';
import { getBenchmarkInfo } from '@/lib/pirls-norm';
import { ArticleContent } from '@/components/article';
import { ThinkingSkillsRadarCard } from '@/components/analytics';
import { api, ApiClientError } from '@/lib/api-client';

interface SiblingItem {
  id: string;
  studentId: string;
  studentName: string;
  className?: string;
  seatNumber?: number;
  totalScore: number;
  maxScore: number;
  scaleScore: number;
  isTeacherReviewed: boolean;
}

export default function TeacherReviewSubmissionPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const submissionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const [submission, setSubmission] = useState<ExamSubmission | null>(null);
  const [testPaper, setTestPaper] = useState<TestPaper | null>(null);
  const [siblings, setSiblings] = useState<SiblingItem[]>([]);

  // 閱卷狀態
  const [modifiedScores, setModifiedScores] = useState<Record<string, number>>({});
  const [modifiedComments, setModifiedComments] = useState<Record<string, string>>({});
  const [teacherGeneralNote, setTeacherGeneralNote] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  // AI 逐題深度再閱
  const [aiRegradeLoading, setAiRegradeLoading] = useState<Record<string, boolean>>({});
  const [aiRegradeResults, setAiRegradeResults] = useState<Record<string, any>>({});

  // AI 四層次思維落點與改進建議
  const [loadingAiAdvice, setLoadingAiAdvice] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<any>(null);

  // 視野佈局控制：左側文章原文與學生導覽抽屜 (寬螢幕預設展開)
  const [showArticlePanel, setShowArticlePanel] = useState(true);
  const [leftTab, setLeftTab] = useState<'article' | 'students'>('article');
  const [articleFontSize, setArticleFontSize] = useState<'text-sm' | 'text-base' | 'text-lg'>('text-base');

  // 載入資料
  const fetchSubmissionData = async (subId: string) => {
    try {
      setLoading(true);
      setError('');
      const data = await api.teacher.getSubmissionDetail(subId);

      setSubmission(data.submission);
      setTestPaper(data.testPaper);
      setSiblings(data.siblings || []);

      // 初始化各題分數與評語
      const initialScores: Record<string, number> = {};
      const initialComments: Record<string, string> = {};
      data.submission.answers.forEach((ans: any) => {
        initialScores[ans.questionId] = ans.teacherScore !== undefined ? ans.teacherScore : ans.score;
        if (ans.teacherComment) {
          initialComments[ans.questionId] = ans.teacherComment;
        }
      });
      setModifiedScores(initialScores);
      setModifiedComments(initialComments);
      setTeacherGeneralNote(data.submission.teacherGeneralNote || '');
      setAiAdvice(data.submission.aiPedagogicalAdvice || null);
      setAiRegradeResults({});
    } catch (err: any) {
      console.error(err);
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        router.push('/login');
        return;
      }
      setError(err.message || '載入失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (submissionId) {
      fetchSubmissionData(submissionId);
    }
  }, [submissionId]);

  // 計算當前學生在全班清單中的索引與相鄰學生
  const currentIndex = siblings.findIndex((s) => s.id === submissionId);
  const prevStudent = currentIndex > 0 ? siblings[currentIndex - 1] : null;
  const nextStudent = currentIndex >= 0 && currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null;

  // 計算即時核定總分
  const currentEstimatedTotal = submission
    ? submission.answers.reduce((acc, ans) => {
        const score = modifiedScores[ans.questionId] !== undefined ? modifiedScores[ans.questionId] : ans.score;
        return acc + score;
      }, 0)
    : 0;

  // 即時計算四層次思維能力得分與掌握率（隨教師改分動態更新）
  const dynamicProcessScores = React.useMemo(() => {
    if (!submission || !testPaper) {
      return {
        level1: { earned: 0, total: 1, percentage: 0 },
        level2: { earned: 0, total: 1, percentage: 0 },
        level3: { earned: 0, total: 1, percentage: 0 },
        level4: { earned: 0, total: 1, percentage: 0 },
      };
    }

    const levels: Record<'level1' | 'level2' | 'level3' | 'level4', { earned: number; total: number }> = {
      level1: { earned: 0, total: 0 },
      level2: { earned: 0, total: 0 },
      level3: { earned: 0, total: 0 },
      level4: { earned: 0, total: 0 },
    };

    submission.answers.forEach((ans) => {
      const q = testPaper.questions?.find((item) => item.id === ans.questionId);
      const lvlNum = q?.processLevelNumber;
      let targetLevel: 'level1' | 'level2' | 'level3' | 'level4' = 'level1';
      if (lvlNum === 2 || q?.processLevel === 'inference') targetLevel = 'level2';
      else if (lvlNum === 3 || q?.processLevel === 'interpret') targetLevel = 'level3';
      else if (lvlNum === 4 || q?.processLevel === 'evaluate') targetLevel = 'level4';

      const curScore = modifiedScores[ans.questionId] !== undefined ? modifiedScores[ans.questionId] : ans.score;
      levels[targetLevel].earned += curScore;
      levels[targetLevel].total += ans.maxScore;
    });

    return {
      level1: {
        earned: levels.level1.earned,
        total: levels.level1.total,
        percentage: levels.level1.total > 0 ? Math.round((levels.level1.earned / levels.level1.total) * 100) : 0,
        description: '能快速鎖定時間、人物與具體事實。',
      },
      level2: {
        earned: levels.level2.earned,
        total: levels.level2.total,
        percentage: levels.level2.total > 0 ? Math.round((levels.level2.earned / levels.level2.total) * 100) : 0,
        description: '能順利串聯線索，理解隱含的因果關係。',
      },
      level3: {
        earned: levels.level3.earned,
        total: levels.level3.total,
        percentage: levels.level3.total > 0 ? Math.round((levels.level3.earned / levels.level3.total) * 100) : 0,
        description: '能跨越段落歸納文章主旨與人物心態。',
      },
      level4: {
        earned: levels.level4.earned,
        total: levels.level4.total,
        percentage: levels.level4.total > 0 ? Math.round((levels.level4.earned / levels.level4.total) * 100) : 0,
        description: '能客觀反思寫作手法並連結現實經驗。',
      },
    };
  }, [submission, testPaper, modifiedScores]);

  // 切換題目給分
  const handleScoreChange = (qId: string, newScore: number) => {
    setModifiedScores((prev) => ({ ...prev, [qId]: newScore }));
  };

  // 修改個別評語
  const handleCommentChange = (qId: string, comment: string) => {
    setModifiedComments((prev) => ({ ...prev, [qId]: comment }));
  };

  // 呼叫 Gemini AI 逐題深度再閱
  const handleAiRegrade = async (questionId: string) => {
    if (!submission) return;
    try {
      setAiRegradeLoading((prev) => ({ ...prev, [questionId]: true }));
      const data = await api.teacher.aiRegradeQuestion(submission.id, questionId);
      if (data.results && data.results.length > 0) {
        setAiRegradeResults((prev) => ({ ...prev, [questionId]: data.results[0] }));
      }
    } catch (err: any) {
      console.error(err);
      alert('AI 深度再閱連線異常：' + (err.message || '請確認網路'));
    } finally {
      setAiRegradeLoading((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  // 採用 AI 建議分數
  const handleAdoptAi = (questionId: string) => {
    const aiRes = aiRegradeResults[questionId];
    if (aiRes && aiRes.suggestedScore !== undefined) {
      handleScoreChange(questionId, aiRes.suggestedScore);
      if (aiRes.reason && !modifiedComments[questionId]) {
        handleCommentChange(questionId, `[AI建議採分] ${aiRes.reason}`);
      }
    }
  };

  // 呼叫 AI 產生四層次思維能力落點分析與學生具體改進建議
  const handleGenerateAiAdvice = async () => {
    if (!submission) return;
    try {
      setLoadingAiAdvice(true);
      const data = await api.teacher.getAiPedagogicalAdvice(submission.id, modifiedScores);
      if (data.advice) {
        setAiAdvice(data.advice);
        if ((data.advice as any)?.teacherFeedbackDraft && !teacherGeneralNote) {
          setTeacherGeneralNote((data.advice as any).teacherFeedbackDraft);
        }
        setToastMsg('✨ AI 已成功生成四層次思維落點分析與學生改進建議！');
        setTimeout(() => setToastMsg(''), 4000);
      }
    } catch (err: any) {
      console.error(err);
      alert('AI 連線異常：' + (err.message || '生成失敗'));
    } finally {
      setLoadingAiAdvice(false);
    }
  };

  // 儲存核定成果
  const handleSaveReview = async (andGoToNext: boolean = false) => {
    if (!submission) return;
    try {
      setSavingReview(true);
      const answersUpdates = submission.answers.map((ans) => ({
        questionId: ans.questionId,
        newScore: modifiedScores[ans.questionId] !== undefined ? modifiedScores[ans.questionId] : ans.score,
        teacherComment: modifiedComments[ans.questionId] !== undefined ? modifiedComments[ans.questionId] : (ans.teacherComment || ''),
      }));

      await api.teacher.reviewSubmission(submission.id, {
        answersUpdates,
        teacherGeneralNote: teacherGeneralNote.trim(),
        aiPedagogicalAdvice: aiAdvice,
      });

      setToastMsg(`🎉 已核定 ${submission.studentName} 的閱卷成績！常模與 PR 已重新計算。`);
      setTimeout(() => setToastMsg(''), 3500);

      if (andGoToNext && nextStudent) {
        router.push(`/dashboard/teacher/submissions/${nextStudent.id}`);
      } else {
        // 重新整理當前頁面資料
        fetchSubmissionData(submission.id);
      }
    } catch (err: any) {
      console.error(err);
      alert('儲存過程發生錯誤：' + (err.message || '請確認網路狀態'));
    } finally {
      setSavingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-600 font-bold">載入學生作答全卷、原文對照與評分規準中...</p>
      </div>
    );
  }

  if (error || !submission || !testPaper) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200 text-sm font-bold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-600" />
          <span>{error || '找不到試卷或作答紀錄'}</span>
        </div>
        <Link
          href="/dashboard/teacher/test-papers"
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
        >
          返回題庫中心
        </Link>
      </div>
    );
  }

  // PIRLS 基準資訊
  const currentBench = getBenchmarkInfo(submission.scaleScore ?? 500);

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col justify-between">
      {/* 頂部固定導覽列 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* 左側：返回成績冊與試卷標題 */}
          <div className="flex items-center space-x-3 min-w-0">
            <Link
              href={`/dashboard/teacher/test-papers/${testPaper.id}/results`}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition flex-shrink-0"
              title="返回全班成績冊"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <Edit3 className="w-4 h-4" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                  testPaper.textType === 'literary' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {testPaper.textType === 'literary' ? '文學' : '訊息'}
                </span>
                <span className="text-[11px] text-slate-400 font-semibold">國小 {testPaper.targetGrade} 年級</span>
                <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-bold">
                  網頁全景批改模式
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                《{testPaper.title}》
              </h1>
            </div>

            {/* 問答題全班集中批閱模式入口快捷 */}
            <Link
              href={`/dashboard/teacher/test-papers/${testPaper.id}/grade-by-question${searchParams.get('assignmentId') ? `?assignmentId=${searchParams.get('assignmentId')}` : ''}`}
              className="hidden xl:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 transition shadow-2xs"
              title="切換為全班問答題集中批閱模式（審題一次批改全班同一題）"
            >
              <LayoutList className="w-3.5 h-3.5 text-purple-600" />
              <span>問答題全班集中批閱</span>
            </Link>
          </div>

          {/* 中間：學生切換控制器 */}
          <div className="hidden md:flex items-center space-x-2 bg-slate-100/90 p-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              disabled={!prevStudent}
              onClick={() => prevStudent && router.push(`/dashboard/teacher/submissions/${prevStudent.id}`)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent transition flex items-center space-x-1"
              title={prevStudent ? `上一位：${prevStudent.studentName}` : '已是第一位'}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>上一位</span>
            </button>

            <div className="px-3 py-1 bg-white rounded-xl shadow-2xs border border-slate-200/80 text-xs font-bold text-slate-800 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <span>
                {submission.studentName} ({submission.className || '未分班'} • {submission.seatNumber ? `${submission.seatNumber}號` : '-'})
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                [{currentIndex + 1} / {siblings.length}]
              </span>
            </div>

            <button
              type="button"
              disabled={!nextStudent}
              onClick={() => nextStudent && router.push(`/dashboard/teacher/submissions/${nextStudent.id}`)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent transition flex items-center space-x-1"
              title={nextStudent ? `下一位：${nextStudent.studentName}` : '已是最後一位'}
            >
              <span>下一位</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 右側：即時核定總分與儲存按鈕 */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-[10px] text-slate-400 font-medium">核定預估總分</div>
              <div className="flex items-baseline space-x-1.5 justify-end">
                <span className="text-xl font-black text-indigo-700">{currentEstimatedTotal}</span>
                <span className="text-xs text-slate-400">/ {submission.maxScore} 分</span>
                {currentEstimatedTotal !== submission.totalScore && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    currentEstimatedTotal > submission.totalScore
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {currentEstimatedTotal > submission.totalScore ? `+${currentEstimatedTotal - submission.totalScore}` : `${currentEstimatedTotal - submission.totalScore}`}
                  </span>
                )}
              </div>
            </div>

            {/* 原文對照面板切換開關 */}
            <button
              type="button"
              onClick={() => setShowArticlePanel(!showArticlePanel)}
              className={`p-2 rounded-xl border text-xs font-bold transition flex items-center space-x-1.5 ${
                showArticlePanel
                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              title="切換左側原文對照與學生導覽抽屜"
            >
              <Split className="w-4 h-4" />
              <span className="hidden xl:inline">{showArticlePanel ? '收合文章對照' : '開啟文章對照'}</span>
            </button>

            {/* 確認核定按鈕 */}
            <button
              type="button"
              onClick={() => handleSaveReview(false)}
              disabled={savingReview}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-50 inline-flex items-center space-x-1.5"
            >
              {savingReview ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>核定中...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>確認核定成績</span>
                </>
              )}
            </button>

            {nextStudent && (
              <button
                type="button"
                onClick={() => handleSaveReview(true)}
                disabled={savingReview}
                className="hidden lg:inline-flex px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition disabled:opacity-50 items-center space-x-1"
                title="儲存此生核定成績，並直接前往下一位學生"
              >
                <span>儲存並下一位</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 主體區塊：寬景雙欄 / 單欄彈性視野 */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* =========================================================
              左欄 (4 欄)：文章原文參照面板與班級學生名冊導覽
             ========================================================= */}
          {showArticlePanel && (
            <aside className="lg:col-span-4 xl:col-span-4 lg:sticky lg:top-22 space-y-4 max-h-[calc(100vh-7rem)] flex flex-col">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col flex-1 overflow-hidden">
                {/* 頁籤頭：文章原文 vs 班級學生名冊 */}
                <div className="flex items-center border-b border-slate-100 bg-slate-50/80 p-1.5 gap-1">
                  <button
                    type="button"
                    onClick={() => setLeftTab('article')}
                    className={`flex-1 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition ${
                      leftTab === 'article'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                    <span>📖 文章原文對照</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLeftTab('students')}
                    className={`flex-1 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition ${
                      leftTab === 'students'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-sky-600" />
                    <span>👥 全班學生 ({siblings.filter(s => s.isTeacherReviewed).length}/{siblings.length})</span>
                  </button>
                </div>

                {/* 頁籤內容一：文章原文對照 */}
                {leftTab === 'article' && (
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <div className="border-b border-slate-100 pb-3 flex items-start justify-between gap-2">
                      <div>
                        <h2 className="text-base font-extrabold text-slate-900 leading-snug">
                          《{testPaper.title}》
                        </h2>
                        <div className="text-xs text-slate-400 mt-1 flex items-center space-x-2">
                          <span>總字數：{testPaper.wordCount} 字</span>
                          <span>•</span>
                          <span>共 {testPaper.paragraphs?.length || 1} 個段落</span>
                        </div>
                      </div>

                      {/* 字體大小切換開關 */}
                      <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl flex-shrink-0" title="調整文章字級大小">
                        <button
                          type="button"
                          onClick={() => setArticleFontSize('text-sm')}
                          className={`px-2 py-0.5 rounded-lg text-xs font-black transition ${
                            articleFontSize === 'text-sm' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                          }`}
                          title="標準 (14px)"
                        >
                          A
                        </button>
                        <button
                          type="button"
                          onClick={() => setArticleFontSize('text-base')}
                          className={`px-2 py-0.5 rounded-lg text-xs font-black transition ${
                            articleFontSize === 'text-base' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                          }`}
                          title="適中 (16px，預設推薦)"
                        >
                          A+
                        </button>
                        <button
                          type="button"
                          onClick={() => setArticleFontSize('text-lg')}
                          className={`px-2 py-0.5 rounded-lg text-xs font-black transition ${
                            articleFontSize === 'text-lg' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                          }`}
                          title="特大 (18px)"
                        >
                          A++
                        </button>
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
                )}

                {/* 頁籤內容二：全班學生閱卷進度列表 */}
                {leftTab === 'students' && (
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                    {siblings.map((s, idx) => {
                      const isCurrent = s.id === submission.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => router.push(`/dashboard/teacher/submissions/${s.id}`)}
                          className={`w-full p-3 text-left transition flex items-center justify-between ${
                            isCurrent
                              ? 'bg-indigo-50/80 border-l-4 border-indigo-600'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                              {s.seatNumber || idx + 1}
                            </span>
                            <div className="truncate">
                              <span className={`text-xs font-bold block truncate ${isCurrent ? 'text-indigo-950 font-black' : 'text-slate-800'}`}>
                                {s.studentName}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {s.className || '未分班'}
                              </span>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0 space-y-0.5">
                            <div className="text-xs font-bold text-slate-800">
                              {s.totalScore} / {s.maxScore} 分
                            </div>
                            {s.isTeacherReviewed ? (
                              <span className="inline-block text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                                ✓ 已複閱
                              </span>
                            ) : (
                              <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                待複閱
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </aside>
          )}

          {/* =========================================================
              右欄 (主工作台)：大視野逐題閱卷、AI 深入再閱與改進建議
             ========================================================= */}
          <section className={`${showArticlePanel ? 'lg:col-span-8 xl:col-span-8' : 'lg:col-span-12'} space-y-6`}>
            {/* 學生素養概要 Banner */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-sky-500 text-white flex items-center justify-center font-black text-lg shadow-sm">
                    {submission.seatNumber || '學'}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-lg font-black text-slate-900">{submission.studentName} 同學</h2>
                      {submission.isTeacherReviewed ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          👨‍🏫 經教師親自複閱核定
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          ⏳ AI 初閱完成（待教師複核）
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      班級：{submission.className || '未分班'} • 座號：{submission.seatNumber ?? '-'} 號 • 繳卷時間：{new Date(submission.submittedAt).toLocaleString('zh-TW')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/student/result/${submission.id}`}
                    target="_blank"
                    className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold border border-sky-100 inline-flex items-center space-x-1 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>查看完整診斷書</span>
                  </Link>
                </div>
              </div>

              {/* 四大思維能力雷達圖與層次落點解析 (即時連動) */}
              <div className="pt-2">
                <ThinkingSkillsRadarCard
                  title="各層次思維能力落點分析"
                  subtitle="隨教師核定給分即時重新試算四層次掌握率"
                  radarTitle="PIRLS 四個思考能力雷達"
                  data={dynamicProcessScores}
                />
              </div>
            </div>

            {/* 指引說明橫幅 */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-sky-50 border border-indigo-100 text-xs text-slate-700 flex items-start space-x-3">
              <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="text-indigo-950 font-bold block">
                  👨‍🏫 全景網頁閱卷與人機協同核定說明：
                </strong>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  本頁面提供最寬闊的閱卷視野，左側支援隨時展開文章全文對照。對於開放簡答題，您可以點擊「<strong>✨ 呼叫 AI 深度再閱</strong>」獲取大模型評審理由，並直接點選手動給分與撰寫評語。確認核定後，系統將<strong>即時同步重新計算 PIRLS 國際量尺、能力基準與班級 PR 值</strong>！
                </p>
              </div>
            </div>

            {/* 逐題詳細卡片列表 */}
            <div className="space-y-6">
              {submission.answers.map((ans) => {
                const q = testPaper.questions?.find((item) => item.id === ans.questionId);
                const isCR = ans.type === 'constructed_response';
                const currentScore = modifiedScores[ans.questionId] !== undefined ? modifiedScores[ans.questionId] : ans.score;
                const aiRes = aiRegradeResults[ans.questionId];
                const isAiLoading = aiRegradeLoading[ans.questionId];

                return (
                  <div
                    key={ans.questionId}
                    className={`bg-white rounded-3xl border p-6 sm:p-7 shadow-sm transition space-y-5 ${
                      isCR ? 'border-indigo-200 ring-1 ring-indigo-500/10' : 'border-slate-200'
                    }`}
                  >
                    {/* 題幹頂部欄 */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                      <div className="flex items-center space-x-2.5">
                        <span className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                          {ans.questionNumber}
                        </span>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                          {isCR ? '開放簡答題' : '選擇題'}
                        </span>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-100">
                          L{ans.processLevelNumber} {ans.processLevel}
                        </span>
                        {ans.code && (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                            IEA Code: {ans.code}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="text-xs text-slate-500">配分：{ans.maxScore} 分</span>
                        <span className="text-xs font-bold px-3 py-1 rounded-xl bg-slate-100 text-slate-800 border border-slate-200">
                          目前核定：<strong className="text-indigo-600 font-black text-sm">{currentScore}</strong> / {ans.maxScore} 分
                        </span>
                      </div>
                    </div>

                    {/* 題目題幹 (大字好讀) */}
                    <div className="space-y-1">
                      <p className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
                        {q?.prompt || `第 ${ans.questionNumber} 題`}
                      </p>
                    </div>

                    {/* 選擇題簡單檢視 */}
                    {!isCR ? (
                      <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200/80 text-sm sm:text-base space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="space-x-4">
                            <span>學生回答：<strong className={ans.score > 0 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>{ans.studentAnswer || '未作答'}</strong></span>
                            <span>標準正解：<strong className="text-slate-900 font-bold">{q?.correctAnswerLabel}</strong></span>
                          </div>
                          <span className={`text-xs sm:text-sm font-bold px-2.5 py-1 rounded-lg ${ans.score > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            {ans.score > 0 ? '✓ 答對 (得滿分)' : '✗ 答錯 (0分)'}
                          </span>
                        </div>
                        {((q as any)?.explanation || q?.options?.find(o => o.label === q?.correctAnswerLabel)?.explanation) && (
                          <p className="text-slate-600 text-xs sm:text-sm pt-2 border-t border-slate-200/60 leading-relaxed">
                            💡 解析：{(q as any)?.explanation || q?.options?.find(o => o.label === q?.correctAnswerLabel)?.explanation}
                          </p>
                        )}
                      </div>
                    ) : (
                      /* 開放簡答題專屬閱卷區 */
                      <div className="space-y-5 pt-1">
                        {/* 學生原始作答文字區塊 (特大字體 16px~18px) */}
                        <div className="p-5 sm:p-6 rounded-2xl bg-amber-50/70 border border-amber-200 text-sm space-y-2.5">
                          <div className="flex items-center justify-between text-amber-950 font-bold">
                            <span className="flex items-center gap-2 text-sm sm:text-base">
                              <FileText className="w-5 h-5 text-amber-700" />
                              學生原始作答內容：
                            </span>
                            <span className="text-xs sm:text-sm text-amber-800 font-semibold bg-amber-100/90 px-2.5 py-0.5 rounded-lg border border-amber-200">
                              {ans.studentAnswer ? `${ans.studentAnswer.length} 字` : '未作答'}
                            </span>
                          </div>
                          <div className="p-4 sm:p-5 rounded-xl bg-white border border-amber-200 text-slate-900 font-medium leading-relaxed whitespace-pre-line text-base sm:text-lg shadow-2xs">
                            {ans.studentAnswer || '（此題學生未作答）'}
                          </div>
                        </div>

                        {/* 官方滿分示範與給分規準參考 */}
                        {q?.rubric && (
                          <details className="group text-sm bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden" open>
                            <summary className="p-4 font-bold text-slate-800 cursor-pointer flex items-center justify-between hover:bg-slate-100/70 transition">
                              <span className="flex items-center space-x-2 text-sm sm:text-base">
                                <BookOpen className="w-4 h-4 text-indigo-600" />
                                <span>PIRLS 官方給分規準 (Rubrics) 與滿分參考答案</span>
                              </span>
                              <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
                            </summary>
                            <div className="p-5 border-t border-slate-200 bg-white space-y-3.5 text-slate-700 text-xs sm:text-sm">
                              {q.rubric.sampleFullCreditAnswer && (
                                <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 text-sm sm:text-base leading-relaxed">
                                  <strong className="block font-bold text-emerald-900 mb-1.5 flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4 text-emerald-600" />
                                    ⭐ 滿分參考答法與思維要點：
                                  </strong>
                                  <span className="font-medium">{q.rubric.sampleFullCreditAnswer}</span>
                                </div>
                              )}
                              {q.rubric.criteria && (
                                <div className="space-y-2 pt-1">
                                  <div className="font-bold text-sm text-slate-800">各得分階梯定義：</div>
                                  <div className="space-y-1.5">
                                    {q.rubric.criteria.map((c) => (
                                      <div key={c.score} className="text-xs sm:text-sm flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                                        <span className="font-black text-indigo-700 flex-shrink-0 text-sm">【{c.score} 分】：</span>
                                        <span className="text-slate-800 leading-relaxed font-medium">{c.description}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </details>
                        )}

                        {/* 系統初評診斷摘要 */}
                        {ans.aiFeedback && (
                          <div className="p-4 rounded-2xl bg-slate-100/80 text-xs sm:text-sm text-slate-700 space-y-1.5 leading-relaxed">
                            <div className="flex items-center justify-between text-slate-900 font-bold mb-1">
                              <span>🤖 系統初評診斷：</span>
                              <span className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-slate-200">初評分數：{ans.originalScore !== undefined ? ans.originalScore : ans.score} 分</span>
                            </div>
                            <p><strong className="text-emerald-700 font-bold">亮點：</strong>{ans.aiFeedback.strength}</p>
                            <p><strong className="text-amber-700 font-bold">待加強：</strong>{ans.aiFeedback.weakness}</p>
                          </div>
                        )}

                        {/* ✨ AI 深度再閱 (Gemini 2.0) 區塊 */}
                        <div className="p-4 sm:p-5 rounded-2xl border border-purple-200 bg-purple-50/30 text-xs sm:text-sm space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center space-x-2 font-bold text-purple-900 text-sm sm:text-base">
                              <Sparkles className="w-5 h-5 text-purple-600" />
                              <span>AI 深度再閱建議 (Google Gemini 2.0)</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAiRegrade(ans.questionId)}
                              disabled={isAiLoading}
                              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm transition shadow-xs disabled:opacity-50 inline-flex items-center space-x-1.5"
                            >
                              {isAiLoading ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>AI 深入分析中...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-4 h-4" />
                                  <span>{aiRes ? '重新深度分析' : '呼叫 AI 深度再閱'}</span>
                                </>
                              )}
                            </button>
                          </div>

                          {aiRes && (
                            <div className="p-4 sm:p-5 rounded-xl bg-white border border-purple-200 space-y-3 animate-fadeIn">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-slate-800 text-sm">AI 建議核定：</span>
                                  <span className="text-lg font-black text-purple-700 bg-purple-100 px-3 py-0.5 rounded-lg">
                                    {aiRes.suggestedScore} 分
                                  </span>
                                  <span className="text-xs text-slate-400 font-mono">
                                    (Code {aiRes.scoreCode})
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleAdoptAi(ans.questionId)}
                                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-xs transition inline-flex items-center space-x-1.5"
                                >
                                  <Check className="w-4 h-4" />
                                  <span>採用 AI 建議 ({aiRes.suggestedScore}分)</span>
                                </button>
                              </div>
                              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                                <strong className="text-purple-900 font-bold">評審理由：</strong>
                                {aiRes.reason}
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
                        </div>

                        {/* 👨‍🏫 教師手動給分選擇器 (按鈕放大、清晰好點) */}
                        <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-4">
                          <div>
                            <label className="block text-sm sm:text-base font-bold text-slate-900 mb-2.5">
                              👨‍🏫 教師最終核定給分：
                            </label>
                            <div className="flex flex-wrap gap-3">
                              {Array.from({ length: ans.maxScore + 1 }, (_, idx) => idx).map((pts) => {
                                const isSelected = currentScore === pts;
                                return (
                                  <button
                                    key={pts}
                                    type="button"
                                    onClick={() => handleScoreChange(ans.questionId, pts)}
                                    className={`px-6 py-3 rounded-xl font-bold transition flex items-center space-x-2 ${
                                      isSelected
                                        ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/40'
                                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                                    }`}
                                  >
                                    {isSelected && <Check className="w-5 h-5 stroke-[3]" />}
                                    <span className="text-base sm:text-lg font-black">{pts} 分</span>
                                    {pts === ans.maxScore && <span className="text-xs opacity-90 font-medium">(滿分)</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* 教師個別評語 / 批註 */}
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                              給學生的本題評語／勉勵叮嚀（選填，將顯示於診斷書中）：
                            </label>
                            <input
                              type="text"
                              value={modifiedComments[ans.questionId] || ''}
                              onChange={(e) => handleCommentChange(ans.questionId, e.target.value)}
                              placeholder="例：因果轉折寫得很深刻，老師多加 1 分鼓勵你！"
                              className="w-full text-sm sm:text-base rounded-xl border border-slate-300 p-3.5 focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-white shadow-2xs font-medium"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 🤖 AI 閱讀四層次思維能力落點深入診斷與學生改進建議助手 */}
            <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-sky-50 p-6 sm:p-7 rounded-3xl border border-purple-200/90 space-y-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-xs">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-purple-950">
                      AI 四層次思維能力落點分析與學生具體改進建議
                    </h3>
                    <p className="text-xs text-purple-700">
                      依據學生在 L1~L4 四個思考歷程得分與作答表現，由 AI 提煉客觀落點分析與給學生的具體閱讀精進策略
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateAiAdvice}
                  disabled={loadingAiAdvice}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition inline-flex items-center space-x-2 disabled:opacity-50 flex-shrink-0"
                >
                  {loadingAiAdvice ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>AI 專家大腦分析中...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{aiAdvice ? '重新分析與更新建議' : '啟動 AI 智能分析與改進建議'}</span>
                    </>
                  )}
                </button>
              </div>

              {aiAdvice && (
                <div className="bg-white p-5 rounded-2xl border border-purple-200 space-y-4 animate-fadeIn">
                  {/* 落點分析 */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-purple-700" />
                      <span>各層次思維能力落點綜合解析：</span>
                    </span>
                    <p className="text-xs sm:text-sm text-slate-900 leading-relaxed bg-purple-50/60 p-4 rounded-xl border border-purple-100 font-medium">
                      {aiAdvice.levelAnalysis}
                    </p>
                  </div>

                  {/* 改進建議清單 */}
                  <div className="space-y-2">
                    <span className="text-xs sm:text-sm font-bold text-indigo-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-indigo-700" />
                      <span>給學生的具體閱讀策略與改進建議事項：</span>
                    </span>
                    <div className="space-y-2.5">
                      {aiAdvice.improvementSuggestions?.map((item: string, idx: number) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs sm:text-sm text-slate-800 leading-relaxed flex items-start space-x-2.5"
                        >
                          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="flex-1 font-medium">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 具體行動計畫 */}
                  {aiAdvice.actionPlan && (
                    <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs sm:text-sm text-amber-950 flex items-start space-x-2.5">
                      <span className="font-bold flex-shrink-0 text-amber-900">🚀 自主練習行動計畫：</span>
                      <span className="leading-relaxed font-medium">{aiAdvice.actionPlan}</span>
                    </div>
                  )}

                  {/* 導師講評草稿套用 */}
                  {aiAdvice.teacherFeedbackDraft && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-slate-500 italic">
                        AI 已依據四層次落點自動起草綜合評語
                      </span>
                      <button
                        type="button"
                        onClick={() => setTeacherGeneralNote(aiAdvice.teacherFeedbackDraft)}
                        className="text-xs sm:text-sm text-purple-700 hover:text-purple-900 font-bold hover:underline inline-flex items-center space-x-1"
                      >
                        <span>套用草稿至下方【導師總評】</span>
                        <span>↓</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 全卷導師總評語 (大字好讀) */}
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 space-y-3.5 shadow-xs">
              <label className="block text-sm sm:text-base font-bold text-slate-900 flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <span>全卷導師綜合講評（選填，將呈現在學生診斷報告首頁頂部）：</span>
              </label>
              <textarea
                rows={3}
                value={teacherGeneralNote}
                onChange={(e) => setTeacherGeneralNote(e.target.value)}
                placeholder="例：本次測驗在深層推論表現突出，值得肯定！建議持續加強第四層寫作視角的批判性反思。"
                className="w-full text-sm sm:text-base rounded-2xl border border-slate-300 p-4 focus:ring-2 focus:ring-indigo-500 text-slate-900 shadow-2xs font-medium"
              />
            </div>

            {/* 底部操作固定欄 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                核定後系統將自動重新加總、更新 PIRLS 國際量尺標準分與全班同儕 PR 值。
              </div>

              <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
                <Link
                  href={`/dashboard/teacher/test-papers/${testPaper.id}/results`}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  返回成績冊
                </Link>

                <button
                  type="button"
                  onClick={() => handleSaveReview(false)}
                  disabled={savingReview}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50 inline-flex items-center space-x-1.5"
                >
                  {savingReview ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>正在更新量尺與常模...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>確認核定成績</span>
                    </>
                  )}
                </button>

                {nextStudent && (
                  <button
                    type="button"
                    onClick={() => handleSaveReview(true)}
                    disabled={savingReview}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition disabled:opacity-50 inline-flex items-center space-x-1"
                  >
                    <span>儲存並下一位</span>
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
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 text-xs font-bold flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 頁尾 */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t bg-white mt-8">
        PIRLS 智慧閱讀素養評量平臺 • 教師全景閱卷與 AI 協同評量模式
      </footer>
    </div>
  );
}
