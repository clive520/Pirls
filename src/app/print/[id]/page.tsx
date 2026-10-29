'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Printer, ArrowLeft, CheckCircle2, BookOpen, FileText } from 'lucide-react';
import { TestPaper } from '@/lib/types';

export default function PrintTestPaperPage() {
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
        const res = await fetch(`/api/student/exam/${testId}`);
        if (!res.ok) throw new Error('載入失敗');
        const data = await res.json();
        setTestPaper(data.testPaper);
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">
        正在準備 A4 試卷排版...
      </div>
    );
  }

  if (!testPaper) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
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
      <div className="bg-slate-900 text-white p-4 sticky top-0 z-50 shadow-md print:hidden flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-sm font-bold">A4 實體試卷列印預覽</h1>
            <p className="text-xs text-slate-400">
              當前模式：{isAnswerKey ? '【教師批改與評分規準解答卷】' : '【學生測驗卷】'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href={`/print/${testId}${isAnswerKey ? '' : '?showAnswers=true'}`}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-sky-400 border border-slate-700 inline-flex items-center space-x-1"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>切換為{isAnswerKey ? '學生卷' : '教師解答卷'}</span>
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
          <div className="text-xs tracking-widest font-bold text-slate-600">
            國際閱讀素養進展研究 (PIRLS) 模擬檢定測驗卷
          </div>
          <h1 className="text-2xl font-black tracking-wider text-slate-950">
            《{testPaper.title}》
          </h1>
          <div className="text-xs text-slate-600 flex justify-center items-center space-x-4 pt-1 font-sans">
            <span>適用年級：國小 {testPaper.targetGrade} 年級</span>
            <span>•</span>
            <span>文體：{testPaper.textType === 'literary' ? '文學性文本' : '訊息性文本'}</span>
            <span>•</span>
            <span>全卷滿分：{testPaper.totalPoints} 分</span>
          </div>

          {/* 學生作答資訊簽名欄 */}
          <div className="pt-4 grid grid-cols-4 gap-2 text-xs font-sans text-left border-t border-dashed border-slate-300 mt-2">
            <div>
              班級：<span className="border-b border-slate-800 inline-block w-20">&nbsp;</span>
            </div>
            <div>
              座號：<span className="border-b border-slate-800 inline-block w-16">&nbsp;</span>
            </div>
            <div>
              姓名：<span className="border-b border-slate-800 inline-block w-24">&nbsp;</span>
            </div>
            <div className="text-right">
              實得分數：<span className="border-b-2 border-slate-900 font-bold inline-block w-16 text-center text-sm">&nbsp;</span>
            </div>
          </div>
        </header>

        {/* 文本閱讀區 */}
        <section className="space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-1">
            <span className="bg-slate-900 text-white text-[11px] font-sans font-bold px-2 py-0.5 rounded">
              閱讀文本
            </span>
            <span className="text-xs text-slate-600 font-sans">
              請先仔細閱讀下列文章（約 {testPaper.wordCount} 字），再回答後續題目：
            </span>
          </div>

          {/* 非連續性科學插圖 / 流程圖 */}
          {testPaper.illustrations && testPaper.illustrations.length > 0 && (
            <div className="my-4 border border-slate-300 rounded p-4 break-inside-avoid">
              {testPaper.illustrations.map((ill) => (
                <div key={ill.id} className="space-y-2">
                  {ill.imageUrl ? (
                    <div className="w-full flex justify-center py-2">
                      <img
                        src={ill.imageUrl}
                        alt={ill.caption || '課文插圖'}
                        className="max-w-[85%] max-h-72 object-contain rounded"
                      />
                    </div>
                  ) : ill.svgCode ? (
                    <div
                      className="w-full flex justify-center overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: ill.svgCode }}
                    />
                  ) : null}
                  {ill.caption && (
                    <div className="text-center text-xs font-sans font-semibold text-slate-700">
                      【圖】{ill.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 文章段落 */}
          <article className="space-y-3.5 text-[15px] leading-relaxed text-justify text-slate-900">
            {testPaper.paragraphs.map((p) => (
              <p key={p.paragraphNumber} className="indent-8">
                {p.text}
              </p>
            ))}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-sans text-xs">
                      {q.options.map((opt) => {
                        const isCorrect = isAnswerKey && opt.label === q.correctAnswerLabel;
                        return (
                          <div
                            key={opt.label}
                            className={`p-2 rounded border flex items-center space-x-2 ${
                              isCorrect
                                ? 'bg-emerald-50 border-emerald-500 font-bold text-emerald-900'
                                : 'border-slate-300'
                            }`}
                          >
                            <span className="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center text-[10px] font-bold">
                              {opt.label}
                            </span>
                            <span>{opt.text}</span>
                            {isCorrect && <span className="ml-auto text-emerald-600 font-bold">（正解）</span>}
                          </div>
                        );
                      })}
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

                      {/* 教師評分解答卷模式下的 Rubrics 規準表格 */}
                      {isAnswerKey && q.rubric && (
                        <div className="mt-2 bg-slate-50 border border-slate-300 rounded p-3 text-xs space-y-2">
                          <div className="font-bold text-slate-800 flex items-center justify-between">
                            <span>【IEA 官方雙位數評卷規準 (Rubric)】</span>
                            <span className="text-[11px] text-slate-500">最高得分：{q.rubric.maxScore || q.points} 分</span>
                          </div>
                          <table className="w-full text-left border-collapse text-[11px]">
                            <thead>
                              <tr className="border-b border-slate-300 text-slate-600 font-bold">
                                <th className="py-1 w-12">代碼</th>
                                <th className="py-1 w-12">得分</th>
                                <th className="py-1">給分標準與關鍵文本證據要求</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {q.rubric.criteria?.map((c: any) => (
                                <tr key={c.code} className="hover:bg-slate-100">
                                  <td className="py-1 font-mono font-bold text-sky-700">Code {c.code}</td>
                                  <td className="py-1 font-bold text-slate-900">{c.score} 分</td>
                                  <td className="py-1 leading-relaxed">
                                    <div>{c.description}</div>
                                    {c.keyEvidenceNeeded && c.keyEvidenceNeeded.length > 0 && (
                                      <div className="text-[10px] text-slate-500 mt-0.5">
                                        關鍵線索：{c.keyEvidenceNeeded.join(' / ')}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
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
