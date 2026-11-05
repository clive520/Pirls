'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Printer, ArrowLeft, CheckCircle2, BookOpen, FileText } from 'lucide-react';
import { TestPaper } from '@/lib/types';

function PrintTestPaperContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const testId = params.id as string;
  const isAnswerKey = searchParams.get('showAnswers') === 'true';

  const [testPaper, setTestPaper] = useState<TestPaper | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPaper = async () => {
      try {
        setLoading(true);
        // 優先從教師試卷 API 讀取完整題目、選項正解與評分規準 (Rubrics)
        let paper: TestPaper | null = null;
        try {
          const tRes = await fetch(`/api/teacher/test-papers/${testId}`, { cache: 'no-store' });
          if (tRes.ok) {
            const tData = await tRes.json();
            paper = tData.testPaper;
          }
        } catch (e) {
          console.warn('Teacher endpoint fetch note, falling back:', e);
        }

        if (!paper) {
          const sRes = await fetch(`/api/student/exam/${testId}`, { cache: 'no-store' });
          if (sRes.ok) {
            const sData = await sRes.json();
            paper = sData.testPaper;
          }
        }

        if (!paper) throw new Error('載入試卷失敗');
        setTestPaper(paper);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (testId) fetchPaper();
  }, [testId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 font-sans">
        正在準備 A4 試卷排版與題本規準...
      </div>
    );
  }

  if (!testPaper) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
        <div className="text-center space-y-3">
          <p className="text-sm font-bold text-slate-800">找不到該試卷</p>
          <Link href="/dashboard/teacher/test-papers" className="text-xs text-sky-600 underline">
            返回試卷庫
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200 print:bg-white text-slate-900 font-serif antialiased pb-12 print:pb-0">
      {/* 頂部列印控制工具列 (列印時隱藏) */}
      <div className="bg-slate-900 text-white p-4 sticky top-0 z-50 shadow-md print:hidden flex items-center justify-between font-sans">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="返回前頁"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-sm font-bold">A4 實體試卷列印預覽</h1>
            <p className="text-xs text-slate-400">
              當前模式：{isAnswerKey ? '【教師批改與評分規準解答卷 (含答案與 Rubrics)】' : '【學生測驗卷】'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href={`/print/${testId}${isAnswerKey ? '' : '?showAnswers=true'}`}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border inline-flex items-center space-x-1.5 transition ${
              isAnswerKey
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-sm'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isAnswerKey ? '切換為【學生測驗卷】' : '切換為【教師解答卷 (含答案與評分規準)】'}</span>
          </Link>

          <button
            onClick={() => window.print()}
            className="px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black inline-flex items-center space-x-1.5 shadow"
          >
            <Printer className="w-4 h-4" />
            <span>立即列印 A4</span>
          </button>
        </div>
      </div>

      {/* A4 紙張本體 (寬度符合標準 A4: 210mm, 794px, 邊界 1.5cm) */}
      <div className="max-w-[794px] mx-auto bg-white my-6 print:my-0 p-10 print:p-0 shadow-lg print:shadow-none min-h-[1123px] space-y-8">
        {/* 試卷表頭 */}
        <header className="border-b-2 border-slate-900 pb-4 text-center space-y-2">
          <div className="text-xs tracking-widest font-bold text-slate-600 font-sans">
            國際閱讀素養進展研究 (PIRLS) 模擬檢定測驗卷
          </div>
          <h1 className="text-2xl font-black tracking-wide text-slate-900">
            《{testPaper.title}》
          </h1>
          <div className="flex items-center justify-center space-x-6 text-xs text-slate-500 font-sans pt-1">
            <span>文體：{testPaper.textType === 'literary' ? '文學性體驗 (童話故事/散文)' : '訊息性文本 (科普/說明文)'}</span>
            <span>目標年級：國小 {testPaper.targetGrade} 年級</span>
            <span>試卷總分：{testPaper.totalPoints} 分</span>
            {testPaper.timeLimitMinutes > 0 && <span>建議作答時間：{testPaper.timeLimitMinutes} 分鐘</span>}
          </div>

          {/* 學生手寫欄位 (教師解答卷模式標註) */}
          <div className="pt-3 flex items-center justify-between border-t border-dashed border-slate-300 text-xs font-sans px-4">
            <div className="flex space-x-4">
              <span>____ 年 ____ 班</span>
              <span>座號：_______</span>
              <span>姓名：_______________</span>
            </div>
            <div>
              {isAnswerKey ? (
                <span className="font-bold text-rose-700 bg-rose-50 border border-rose-300 px-2.5 py-0.5 rounded text-[11px]">
                  ★ 教師批改標準解答卷（含正解、滿分示範與評卷規準）
                </span>
              ) : (
                <span>評量得分：__________ 分</span>
              )}
            </div>
          </div>
        </header>

        {/* 閱讀文章正文與穿插的情境插圖 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
            <div className="flex items-center space-x-2">
              <span className="bg-slate-900 text-white text-[11px] font-sans font-bold px-2 py-0.5 rounded">
                閱讀材料
              </span>
              <span className="text-xs text-slate-600 font-sans">
                請用心閱讀下方文章後，再回答後續試題 (本文約 {testPaper.wordCount} 字)
              </span>
            </div>
          </div>

          <article className="text-[14.5px] leading-relaxed text-slate-900 space-y-4 pt-2 text-justify">
            {testPaper.paragraphs.map((p, pIdx) => {
              const matchingIlls = (testPaper.illustrations || []).filter(
                (ill) => (ill.paragraphNumber || 1) === p.paragraphNumber
              );
              const isLast = pIdx === testPaper.paragraphs.length - 1;
              const trailingIlls = isLast
                ? (testPaper.illustrations || []).filter(
                    (ill) => (ill.paragraphNumber || 1) > testPaper.paragraphs.length
                  )
                : [];
              const allIllsForThisPara = [...matchingIlls, ...trailingIlls];

              return (
                <div key={p.paragraphNumber} className="space-y-3">
                  <p className="indent-8 leading-relaxed">
                    {p.text}
                  </p>

                  {/* 穿插於本段落後的情境插圖 (A4 紙本列印最佳化) */}
                  {allIllsForThisPara.map((ill) => {
                    if (!ill.imageUrl && !ill.svgCode) return null;
                    return (
                      <div
                        key={ill.id}
                        className="my-3 py-1.5 flex flex-col items-center justify-center break-inside-avoid text-center"
                      >
                        {ill.imageUrl ? (
                          <div className="w-full flex justify-center py-1">
                            <img
                              src={ill.imageUrl}
                              alt={ill.caption || '課文插圖'}
                              className="max-h-48 max-w-md w-auto object-contain rounded border border-slate-300 shadow-sm"
                            />
                          </div>
                        ) : ill.svgCode ? (
                          <div
                            className="w-full max-w-md flex justify-center overflow-hidden"
                            dangerouslySetInnerHTML={{ __html: ill.svgCode }}
                          />
                        ) : null}
                        {ill.caption && (
                          <div className="text-center text-[11px] font-sans font-semibold text-slate-700 mt-1">
                            【圖】{ill.caption}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </article>
        </section>

        {/* 分隔線或分頁 */}
        <div className="border-b-2 border-slate-900 pt-4" />

        {/* 試題區 */}
        <section className="space-y-6 pt-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
            <div className="flex items-center space-x-2">
              <span className="bg-slate-900 text-white text-[11px] font-sans font-bold px-2 py-0.5 rounded">
                試題部分
              </span>
              <span className="text-xs text-slate-600 font-sans">
                共 {testPaper.questions.length} 題，請在卷面上作答
              </span>
            </div>
            {isAnswerKey && (
              <span className="text-xs font-sans font-black text-rose-600">
                ★ 已開啟教師評卷規準與官方代碼模式
              </span>
            )}
          </div>

          <div className="space-y-6">
            {testPaper.questions.map((q) => {
              const correctOpt = q.options?.find((o) => o.isCorrect) || q.options?.find((o) => o.label === q.correctAnswerLabel);
              const correctLabel = correctOpt ? correctOpt.label : (q.correctAnswerLabel || '未標註');

              return (
                <div key={q.id} className="space-y-3 break-inside-avoid border-b border-slate-200 pb-5">
                  {/* 題號與配分資訊 */}
                  <div className="flex items-start justify-between text-xs font-sans">
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-[11px]">
                        {q.questionNumber}
                      </span>
                      <span className="font-bold text-slate-800">
                        【配分：{q.points} 分】
                      </span>
                    </div>

                    <span className="text-slate-500 font-medium">
                      PIRLS 思考歷程：L{q.processLevelNumber} {q.processLevel}
                    </span>
                  </div>

                  {/* 題幹 */}
                  <div className="text-[14.5px] font-bold text-slate-900 leading-snug">
                    {q.prompt}
                  </div>

                  {/* 選擇題選項 */}
                  {q.type === 'multiple_choice' && q.options && (
                    <div className="space-y-2 pt-1 font-sans text-xs">
                      {isAnswerKey && (
                        <div className="p-2 rounded-lg bg-emerald-100/70 border border-emerald-300 text-emerald-950 font-bold flex items-center justify-between">
                          <span>
                            ★【正確解答】：選項 {correctLabel}
                          </span>
                          {correctOpt?.text && (
                            <span className="text-[11px] font-medium text-emerald-900">
                              （{correctOpt.text}）
                            </span>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt) => {
                          const isCorrectOption = Boolean(opt.isCorrect || (q.correctAnswerLabel && opt.label === q.correctAnswerLabel));
                          return (
                            <div
                              key={opt.label}
                              className={`p-2 rounded border flex items-center space-x-2 ${
                                isAnswerKey && isCorrectOption
                                  ? 'bg-emerald-50 border-emerald-500 font-bold text-emerald-900 ring-1 ring-emerald-400'
                                  : 'border-slate-300'
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                  isAnswerKey && isCorrectOption
                                    ? 'bg-emerald-600 text-white'
                                    : 'border border-slate-700'
                                }`}
                              >
                                {opt.label}
                              </span>
                              <span className="flex-1">{opt.text}</span>
                              {isAnswerKey && isCorrectOption && (
                                <span className="ml-auto text-emerald-600 font-bold whitespace-nowrap">✓ 正解</span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {isAnswerKey && correctOpt?.explanation && (
                        <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                          <strong className="text-slate-800">【試題選項解析】：</strong>
                          {correctOpt.explanation}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 簡答題橫線答題欄 */}
                  {q.type === 'constructed_response' && (
                    <div className="pt-1 space-y-3 font-sans">
                      {!isAnswerKey && (
                        <div className="space-y-4 pt-1">
                          <div className="border-b border-slate-400 w-full h-4" />
                          <div className="border-b border-slate-400 w-full h-4" />
                          {q.points >= 2 && <div className="border-b border-slate-400 w-full h-4" />}
                          {q.points >= 3 && <div className="border-b border-slate-400 w-full h-4" />}
                        </div>
                      )}

                      {/* 教師評分解答卷模式：滿分示範答案與 Rubrics 給分標準 */}
                      {isAnswerKey && (
                        <div className="mt-2 bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-xs space-y-3">
                          {/* 滿分示範解答 */}
                          <div className="p-3 rounded-lg bg-emerald-50/80 border border-emerald-300/80 text-emerald-950 space-y-1">
                            <span className="font-bold text-emerald-900 block text-xs flex items-center gap-1">
                              <span>⭐【滿分參考解答與示範答法】：</span>
                            </span>
                            <p className="text-[12px] font-medium text-emerald-950 leading-relaxed indent-2">
                              {q.rubric?.sampleFullCreditAnswer || '請依據題幹問答內容，提出正確觀點並引用課文實際詞句佐證。'}
                            </p>
                          </div>

                          {/* 部分得分示範解答（若有） */}
                          {q.rubric?.samplePartialCreditAnswer && (
                            <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-300/70 text-amber-950 space-y-0.5">
                              <span className="font-bold text-amber-900 block text-[11px]">
                                【部分得分示範（可獲得部分分數）】：
                              </span>
                              <p className="text-[11.5px] text-amber-950 leading-relaxed indent-2">
                                {q.rubric.samplePartialCreditAnswer}
                              </p>
                            </div>
                          )}

                          {/* 官方 Rubrics 給分標準表格 */}
                          {q.rubric?.criteria && q.rubric.criteria.length > 0 ? (
                            <div className="space-y-1.5 pt-1">
                              <div className="font-bold text-slate-800 flex items-center justify-between">
                                <span>【IEA 官方雙位數評卷規準 (Rubrics 指引與給分標準)】</span>
                                <span className="text-[11px] text-slate-500 font-normal">
                                  最高給分：{q.rubric.maxScore || q.points} 分
                                </span>
                              </div>
                              <table className="w-full text-left border-collapse text-[11px]">
                                <thead>
                                  <tr className="border-b border-slate-300 text-slate-700 font-bold bg-slate-100/60">
                                    <th className="py-1.5 px-2 w-20">IEA 代碼</th>
                                    <th className="py-1.5 px-2 w-14">得分</th>
                                    <th className="py-1.5 px-2">評分規準說明與論述要求</th>
                                    <th className="py-1.5 px-2 w-48">必要關鍵文本證據</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white">
                                  {q.rubric.criteria.map((c: any) => (
                                    <tr key={c.code} className="hover:bg-slate-50">
                                      <td className="py-1.5 px-2 font-mono font-bold text-sky-700">Code {c.code}</td>
                                      <td className="py-1.5 px-2 font-black text-slate-900">{c.score} 分</td>
                                      <td className="py-1.5 px-2 leading-relaxed text-slate-800">{c.description}</td>
                                      <td className="py-1.5 px-2 text-[10px] text-slate-600">
                                        {c.keyEvidenceNeeded && c.keyEvidenceNeeded.length > 0 ? (
                                          <span className="bg-slate-100 px-1 py-0.5 rounded text-indigo-900 font-medium">
                                            {c.keyEvidenceNeeded.join('、')}
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">無特殊限制</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-600 italic">
                              【給分提示】：本題滿分為 {q.points} 分，請依學生作答是否切合題意並提出文本佐證酌予給分。
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 試卷底端 */}
        <footer className="text-center pt-8 border-t border-slate-400 text-xs text-slate-500 font-sans">
          --- 全卷作答完畢，請仔細檢查核對 ---
        </footer>
      </div>
    </div>
  );
}

export default function PrintTestPaperPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 font-sans">
          正在準備 A4 試卷排版...
        </div>
      }
    >
      <PrintTestPaperContent />
    </Suspense>
  );
}
