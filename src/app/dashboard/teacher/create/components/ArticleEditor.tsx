import React from 'react';
import { BookOpen, PlusCircle, Trash2, Upload } from 'lucide-react';
import { TestPaper, ArticleIllustration } from '@/lib/types';
import { IllustrationStoryboard } from './IllustrationStoryboard';

interface ArticleEditorProps {
  testPaper: TestPaper;
  activeTab?: 'article' | 'questions';
  editingParaIdx: number | null;
  setEditingParaIdx: (idx: number | null) => void;
  onUpdateTitle: (title: string) => void;
  onUpdateParagraphText: (idx: number, text: string) => void;
  onAddParagraph: () => void;
  onDeleteParagraph: (idx: number) => void;
  // Storyboard Props
  activeSceneIdx: number;
  setActiveSceneIdx: (idx: number) => void;
  copiedCombined: boolean;
  copiedSingle: boolean;
  onCopyCombinedPrompt: () => void;
  onCopySinglePrompt: (text: string) => void;
  onAddScene: () => void;
  onRemoveScene: (idx: number) => void;
  onParagraphChange: (pNum: number, illIdx: number) => void;
  onCaptionChange: (caption: string, illIdx: number) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>, illIdx: number) => void;
  onPasteImage: (e: React.ClipboardEvent, illIdx: number) => void;
  onRemoveImage: (illIdx: number) => void;
  onSetImageUrl?: (url: string, illIdx: number) => void;
  onGenerateScenesForPasted: () => void;
}

export const ArticleEditor: React.FC<ArticleEditorProps> = ({
  testPaper,
  activeTab,
  editingParaIdx,
  setEditingParaIdx,
  onUpdateTitle,
  onUpdateParagraphText,
  onAddParagraph,
  onDeleteParagraph,
  activeSceneIdx,
  setActiveSceneIdx,
  copiedCombined,
  copiedSingle,
  onCopyCombinedPrompt,
  onCopySinglePrompt,
  onAddScene,
  onRemoveScene,
  onParagraphChange,
  onCaptionChange,
  onImageUpload,
  onPasteImage,
  onRemoveImage,
  onSetImageUrl,
  onGenerateScenesForPasted,
}) => {
  return (
    <div className="w-full bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <span className="font-bold text-sm sm:text-base text-slate-900 flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center font-bold shadow-xs">
            <BookOpen className="w-4 h-4" />
          </div>
          <span>閱讀文本正文與分段編輯</span>
        </span>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-mono">{testPaper.wordCount} 字</span>
          <button
            type="button"
            onClick={onAddParagraph}
            className="text-xs text-sky-600 hover:text-sky-800 font-bold px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-200 hover:bg-sky-100 transition flex items-center space-x-1"
            title="在文末增加一個新段落"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>新增段落</span>
          </button>
        </div>
      </div>

      {/* 文章標題編輯欄位 */}
      <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 space-y-1">
        <label className="text-[11px] font-bold text-slate-500 block">文章標題 (可直接修改)</label>
        <input
          type="text"
          value={testPaper.title}
          onChange={(e) => onUpdateTitle(e.target.value)}
          className="w-full text-sm font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-sky-500 focus:outline-none"
        />
      </div>

      {/* PIRLS 多模態課文繪本配圖與 3 幅關鍵場景生圖助手 */}
      <div id="storyboard-container">
        <IllustrationStoryboard
          illustrations={testPaper.illustrations || []}
          paragraphs={testPaper.paragraphs || []}
          activeSceneIdx={activeSceneIdx}
          setActiveSceneIdx={setActiveSceneIdx}
          copiedCombined={copiedCombined}
          copiedSingle={copiedSingle}
          onCopyCombinedPrompt={onCopyCombinedPrompt}
          onCopySinglePrompt={onCopySinglePrompt}
          onAddScene={onAddScene}
          onRemoveScene={onRemoveScene}
          onParagraphChange={onParagraphChange}
          onCaptionChange={onCaptionChange}
          onImageUpload={onImageUpload}
          onPasteImage={onPasteImage}
          onRemoveImage={onRemoveImage}
          onSetImageUrl={onSetImageUrl}
          onGenerateScenesForPasted={onGenerateScenesForPasted}
        />
      </div>

      {/* 內文各段落與穿插的情境插圖預覽（全欄自然開展，無內部侷限滾動軸） */}
      <div className="space-y-4 text-sm text-slate-700 leading-relaxed font-sans">
        {(testPaper.paragraphs || []).map((p, pIdx) => {
          const matchingIlls = (testPaper.illustrations || [])
            .map((ill, illIdx) => ({ ill, illIdx }))
            .filter(({ ill }) => (ill.paragraphNumber || 1) === p.paragraphNumber);
          const isLast = pIdx === (testPaper.paragraphs || []).length - 1;
          const trailingIlls = isLast
            ? (testPaper.illustrations || [])
                .map((ill, illIdx) => ({ ill, illIdx }))
                .filter(({ ill }) => (ill.paragraphNumber || 1) > (testPaper.paragraphs || []).length)
            : [];
          const allIllsForThisPara = [...matchingIlls, ...trailingIlls];

          return (
            <div key={p.paragraphNumber} className="space-y-3">
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded">
                    第 {p.paragraphNumber} 段
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingParaIdx(editingParaIdx === pIdx ? null : pIdx)}
                      className="text-[11px] text-sky-600 hover:text-sky-800 font-bold px-2 py-0.5 rounded bg-white border border-slate-200 hover:bg-sky-50 transition"
                    >
                      {editingParaIdx === pIdx ? '收合編輯' : '✏️ 編輯文字'}
                    </button>
                    {testPaper.paragraphs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeleteParagraph(pIdx)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                        title="刪除此段落"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {editingParaIdx === pIdx ? (
                  <div className="space-y-2 pt-1">
                    <textarea
                      rows={5}
                      value={p.text}
                      onChange={(e) => onUpdateParagraphText(pIdx, e.target.value)}
                      className="w-full text-sm font-normal text-slate-800 bg-white border border-sky-300 rounded-lg p-2.5 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setEditingParaIdx(null)}
                        className="text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 px-3 py-1 rounded-lg"
                      >
                        完成段落修訂
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-800 leading-relaxed whitespace-pre-line text-sm">
                    {p.text}
                  </p>
                )}
              </div>

              {/* 穿插於本段落後的情境圖預覽卡片 */}
              {allIllsForThisPara.map(({ ill, illIdx }) => (
                <div
                  key={ill.id}
                  className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/30 p-3 space-y-2 transition hover:border-indigo-300"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md flex items-center space-x-1">
                      <span>🖼️ 場景 {illIdx + 1} 穿插於此</span>
                      <span className="text-slate-500 font-normal">（第 {p.paragraphNumber} 段後）</span>
                    </span>
                    <div className="flex items-center space-x-2">
                      <label className="cursor-pointer text-[11px] text-sky-700 hover:text-sky-800 font-bold px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 hover:bg-sky-100 transition inline-flex items-center space-x-1 shadow-xs">
                        <Upload className="w-3 h-3 text-sky-600" />
                        <span>{ill.imageUrl ? '直接更換圖片' : '上傳此場景圖片'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onClick={(e) => {
                            (e.target as HTMLInputElement).value = '';
                          }}
                          onChange={(e) => onImageUpload(e, illIdx)}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSceneIdx(illIdx);
                          const el = document.getElementById('storyboard-container');
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          } else {
                            window.scrollTo({ top: 350, behavior: 'smooth' });
                          }
                        }}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                        title="查看/編輯此幅場景生圖提示詞"
                      >
                        提示詞設定 ↑
                      </button>
                    </div>
                  </div>

                  {ill.imageUrl ? (
                    <div className="flex flex-col items-center pt-1">
                      <img
                        src={ill.imageUrl}
                        alt={ill.caption || '情境圖'}
                        className="max-h-48 w-auto object-contain rounded-lg border border-slate-200 shadow-sm bg-white"
                      />
                      <p className="text-xs text-center text-slate-600 font-medium mt-1.5">
                        {ill.caption}
                      </p>
                    </div>
                  ) : ill.svgCode ? (
                    <div className="flex flex-col items-center pt-1">
                      <div dangerouslySetInnerHTML={{ __html: ill.svgCode }} className="w-full flex justify-center" />
                      <p className="text-xs text-center text-slate-600 font-medium mt-1.5">
                        {ill.caption}
                      </p>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 py-1 flex items-center justify-between">
                      <span className="line-clamp-1 italic text-slate-400">
                        {ill.caption || '尚未上傳真實圖片，完成出題後可複製上方提示詞生圖'}
                      </span>
                      <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex-shrink-0 ml-2">
                        待生圖上傳
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
