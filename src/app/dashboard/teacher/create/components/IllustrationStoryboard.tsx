'use client';

import React from 'react';
import {
  Palette, CheckCircle2, Copy, PlusCircle, Trash2,
  Upload, Sparkles, Link as LinkIcon
} from 'lucide-react';
import { ArticleIllustration } from '@/lib/types';

export interface IllustrationStoryboardProps {
  illustrations: ArticleIllustration[];
  paragraphs: Array<{ paragraphNumber: number; text: string }>;
  activeSceneIdx: number;
  setActiveSceneIdx: (idx: number) => void;
  copiedCombined: boolean;
  copiedSingle: boolean;
  onCopyCombinedPrompt: () => void;
  onCopySinglePrompt: (promptText: string) => void;
  onAddScene: () => void;
  onRemoveScene: (sceneIdx: number) => void;
  onParagraphChange: (paraNum: number, sceneIdx: number) => void;
  onCaptionChange: (caption: string, sceneIdx: number) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>, sceneIdx: number) => void;
  onDropImage?: (file: File, sceneIdx: number) => void;
  onPasteImage: (e: React.ClipboardEvent, sceneIdx: number) => void;
  onRemoveImage: (sceneIdx: number) => void;
  onSetImageUrl?: (url: string, sceneIdx: number) => void;
  onGenerateScenesForPasted: () => void;
}

export const IllustrationStoryboard: React.FC<IllustrationStoryboardProps> = ({
  illustrations: illustrationsList,
  paragraphs,
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
  onDropImage,
  onPasteImage,
  onRemoveImage,
  onSetImageUrl,
  onGenerateScenesForPasted,
}) => {
  const [isDragging, setIsDragging] = React.useState(false);

  const safeSceneIdx = illustrationsList.length > 0
    ? Math.min(activeSceneIdx, illustrationsList.length - 1)
    : 0;
  const currentIll = illustrationsList[safeSceneIdx];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent, sceneIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && onDropImage) {
      onDropImage(file, sceneIdx);
    }
  };

  return (
    <div
      onPaste={(e) => onPasteImage(e, safeSceneIdx)}
      className="border border-indigo-100 rounded-2xl bg-gradient-to-b from-indigo-50/50 via-white to-white p-4 space-y-3.5 shadow-sm my-3"
    >
      {/* 頂部標題與總操作按鈕 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2.5 border-b border-indigo-100/70">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm flex-shrink-0">
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
              <span>課文關鍵場景配圖 ({illustrationsList.length}幅)</span>
              {illustrationsList.length > 0 && (
                <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  {illustrationsList.filter(i => i.imageUrl).length} / {illustrationsList.length} 已就緒
                </span>
              )}
            </h4>
            <p className="text-[10px] text-slate-500">文章擷取 3 個重要場景（起、轉、合），可複製提示詞生圖後上傳，亦可增減場景</p>
          </div>
        </div>

        {/* 頂部操作按鈕組 */}
        {illustrationsList.length > 0 && (
          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              type="button"
              onClick={onCopyCombinedPrompt}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold transition flex items-center space-x-1.5 shadow-sm ${
                copiedCombined
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-400 hover:bg-amber-300 text-slate-950 hover:shadow'
              }`}
              title="複製一段包含全部 3 張分開圖片的整合提示詞，可直接貼給 ChatGPT 或 AI 一次產出全套插圖！"
            >
              {copiedCombined ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>已複製全套提示詞！</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>複製全套 ({illustrationsList.length}幅) 提示詞</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onAddScene}
              className="text-xs px-2.5 py-1.5 rounded-xl font-bold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-indigo-600 transition flex items-center space-x-1"
              title="新增一幅插圖場景"
            >
              <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
              <span>加幅</span>
            </button>
          </div>
        )}
      </div>

      {/* 場景分頁切換列 (Scene Tabs) */}
      {illustrationsList.length > 0 ? (
        <>
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
            {illustrationsList.map((ill, idx) => {
              const isSelected = idx === safeSceneIdx;
              const isDone = Boolean(ill.imageUrl);
              return (
                <button
                  key={ill.id}
                  type="button"
                  onClick={() => setActiveSceneIdx(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 flex-shrink-0 border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : isDone
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>場景 {idx + 1}</span>
                  <span className={`text-[10px] font-normal ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                    (第 {ill.paragraphNumber || 1} 段後)
                  </span>
                  {isDone ? (
                    <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${isSelected ? 'bg-indigo-700 text-white' : 'bg-emerald-200 text-emerald-900'}`}>✓</span>
                  ) : (
                    <span className={`text-[10px] ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>⏳</span>
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={onAddScene}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-dashed border-slate-300 hover:border-indigo-300 transition flex items-center space-x-1 flex-shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>新增場景</span>
            </button>
          </div>

          {/* 當前選定場景的操作卡片 */}
          {currentIll && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3.5 shadow-sm">
              {/* 場景設定標頭：場景編號、關聯段落、刪除按鈕 */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold flex items-center justify-center">
                    {safeSceneIdx + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    第 {safeSceneIdx + 1} 幅場景設定
                  </span>
                  <div className="flex items-center space-x-1 pl-2 border-l border-slate-200">
                    <span className="text-[11px] text-indigo-700 font-bold">穿插位置：</span>
                    <select
                      value={currentIll.paragraphNumber || 1}
                      onChange={(e) => onParagraphChange(parseInt(e.target.value, 10), safeSceneIdx)}
                      className="text-xs rounded-md border border-indigo-200 py-0.5 px-2 bg-indigo-50/50 text-indigo-900 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {(paragraphs || []).map((p) => (
                        <option key={p.paragraphNumber} value={p.paragraphNumber}>
                          穿插於 第 {p.paragraphNumber} 段 之後
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 刪除此場景按鈕 */}
                <button
                  type="button"
                  onClick={() => onRemoveScene(safeSceneIdx)}
                  className="text-[11px] text-slate-400 hover:text-red-600 transition flex items-center space-x-1 px-1.5 py-0.5 rounded hover:bg-red-50"
                  title="刪除此幅場景"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>刪除此場景</span>
                </button>
              </div>

              {/* 狀態 1：已有圖片 */}
              {currentIll.imageUrl ? (
                <div className="space-y-3">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, safeSceneIdx)}
                    className={`relative rounded-xl overflow-hidden border transition-all duration-200 flex justify-center p-2 shadow-inner group ${
                      isDragging
                        ? 'border-indigo-600 bg-indigo-50/90 ring-4 ring-indigo-200/70 scale-[1.01]'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <img
                      src={currentIll.imageUrl}
                      alt={currentIll.caption || `場景 ${safeSceneIdx + 1}`}
                      className={`max-h-64 w-full object-contain rounded-lg shadow-sm bg-white transition duration-200 ${
                        isDragging ? 'opacity-30 blur-[1px]' : ''
                      }`}
                    />
                    {isDragging && (
                      <div className="absolute inset-0 bg-indigo-600/75 backdrop-blur-xs flex flex-col items-center justify-center text-white rounded-xl z-10 transition animate-in fade-in">
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-1.5 animate-bounce">
                          <Upload className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-sm font-bold">✨ 放開滑鼠以立即替換此圖片！</span>
                        <span className="text-xs text-indigo-100 mt-1">系統將自動壓縮並更新情境插圖</span>
                      </div>
                    )}
                  </div>

                  {/* 圖說標題編輯 */}
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-bold text-slate-500 flex-shrink-0">圖說標題：</span>
                    <input
                      type="text"
                      value={currentIll.caption}
                      onChange={(e) => onCaptionChange(e.target.value, safeSceneIdx)}
                      placeholder={`圖 ${safeSceneIdx + 1}：情境圖說說明`}
                      className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:ring-1 focus:ring-sky-500 focus:outline-none bg-white"
                    />
                  </div>

                  {/* 換圖 / 提示詞查看 / 刪圖操作列 */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center space-x-2">
                      <label className="cursor-pointer text-[11px] font-semibold text-sky-600 hover:text-sky-700 inline-flex items-center space-x-1 px-2.5 py-1 bg-sky-50 hover:bg-sky-100 rounded-lg transition border border-sky-200" title="點擊選取檔案，或直接將圖片拖曳至上方圖片區">
                        <Upload className="w-3 h-3" />
                        <span>更換圖片（可拖曳或點選）</span>
                        <input
                          type="file"
                          accept="image/*"
                          onClick={(e) => {
                            (e.target as HTMLInputElement).value = '';
                          }}
                          onChange={(e) => onImageUpload(e, safeSceneIdx)}
                          className="hidden"
                        />
                      </label>
                      {onSetImageUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            const url = window.prompt('請輸入外部圖片網址 (URL)：', currentIll.imageUrl || '');
                            if (url && url.trim()) {
                              onSetImageUrl(url.trim(), safeSceneIdx);
                            }
                          }}
                          className="text-[11px] font-semibold text-slate-600 hover:text-slate-800 inline-flex items-center space-x-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition border border-slate-200"
                          title="手動指定圖片網址"
                        >
                          <LinkIcon className="w-3 h-3" />
                          <span>輸入網址</span>
                        </button>
                      )}
                      {currentIll.imagePrompt && (
                        <button
                          type="button"
                          onClick={() => onCopySinglePrompt(currentIll.imagePrompt!)}
                          className="text-[11px] font-medium text-slate-600 hover:text-slate-800 inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedSingle ? '已複製！' : '複製此幅提示詞'}</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveImage(safeSceneIdx)}
                      className="text-[11px] font-semibold text-red-600 hover:text-red-700 inline-flex items-center space-x-1 px-2.5 py-1 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>移除圖片</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* 狀態 2：尚未上傳圖片 (展示該場景提示詞 + 圖片上傳框) */
                <div className="space-y-3">
                  {/* 單幅場景專屬提示詞卡片 */}
                  {currentIll.imagePrompt ? (
                    <div className="bg-slate-900 text-slate-200 rounded-xl p-3.5 space-y-2.5 shadow-sm border border-slate-800">
                      <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                        <span className="text-[11px] font-bold text-amber-300 flex items-center space-x-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>場景 {safeSceneIdx + 1} 專屬提示詞</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => onCopySinglePrompt(currentIll.imagePrompt!)}
                          className={`text-[11px] px-2.5 py-1 rounded-md font-bold transition flex items-center space-x-1 ${
                            copiedSingle
                              ? 'bg-emerald-500 text-white'
                              : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-sm'
                          }`}
                        >
                          {copiedSingle ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>已複製！</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>複製此場景提示詞</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] leading-relaxed font-mono whitespace-pre-wrap text-slate-300 max-h-32 overflow-y-auto pr-1">
                        {currentIll.imagePrompt}
                      </p>
                    </div>
                  ) : null}

                  {/* 上傳圖片區塊 (支援拖曳/點擊/貼上) */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, safeSceneIdx)}
                    className="space-y-2"
                  >
                    <label
                      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center space-y-2 group ${
                        isDragging
                          ? 'border-indigo-600 bg-indigo-50/90 ring-4 ring-indigo-200/70 scale-[1.01] shadow-md'
                          : 'border-sky-300 hover:border-sky-500 bg-sky-50/50 hover:bg-sky-50/90'
                      }`}
                    >
                      <div
                        className={`w-11 h-11 rounded-full flex items-center justify-center transition shadow-sm ${
                          isDragging
                            ? 'bg-indigo-600 text-white scale-110 animate-bounce'
                            : 'bg-sky-100 group-hover:bg-sky-200 text-sky-600'
                        }`}
                      >
                        <Upload className="w-5 h-5" />
                      </div>
                      <span
                        className={`text-sm font-bold block ${
                          isDragging ? 'text-indigo-900' : 'text-sky-800'
                        }`}
                      >
                        {isDragging
                          ? '✨ 放開滑鼠立即上傳圖片！'
                          : `上傳【場景 ${safeSceneIdx + 1}】生好的圖片`}
                      </span>
                      <span
                        className={`text-[11px] block ${
                          isDragging ? 'text-indigo-700 font-medium' : 'text-slate-500'
                        }`}
                      >
                        {isDragging
                          ? '已偵測到拖曳檔案，放開即可自動完成高品質壓縮並置入文章'
                          : '直接拖曳圖片檔案至此、點擊選取或按 Ctrl+V 貼上'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onClick={(e) => {
                          (e.target as HTMLInputElement).value = '';
                        }}
                        onChange={(e) => onImageUpload(e, safeSceneIdx)}
                        className="hidden"
                      />
                    </label>

                    {onSetImageUrl && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            const url = window.prompt('請輸入外部圖片網址 (URL)：');
                            if (url && url.trim()) {
                              onSetImageUrl(url.trim(), safeSceneIdx);
                            }
                          }}
                          className="text-[11px] font-semibold text-sky-600 hover:text-sky-800 inline-flex items-center space-x-1 hover:underline"
                        >
                          <LinkIcon className="w-3 h-3" />
                          <span>或以圖片網址 (URL) 設定</span>
                        </button>
                      </div>
                    )}

                    {/* 圖說輸入框 */}
                    <div className="flex items-center space-x-1.5 pt-1">
                      <span className="text-[11px] font-bold text-slate-500 flex-shrink-0">圖說標題：</span>
                      <input
                        type="text"
                        value={currentIll.caption}
                        onChange={(e) => onCaptionChange(e.target.value, safeSceneIdx)}
                        placeholder={`輸入圖說，如：圖 ${safeSceneIdx + 1}：主角登場`}
                        className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:ring-1 focus:ring-sky-500 focus:outline-none bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 底部全套 3 幅縮圖藝廊 (Gallery Overview Strip) */}
          <div className="pt-2 border-t border-indigo-100/60">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-600">全套場景預覽概況：</span>
              <span className="text-[10px] text-slate-400">點擊縮圖可切換至該場景</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {illustrationsList.map((ill, idx) => (
                <div
                  key={ill.id}
                  onClick={() => setActiveSceneIdx(idx)}
                  className={`cursor-pointer rounded-lg border p-1 transition flex flex-col items-center justify-center text-center ${
                    idx === safeSceneIdx
                      ? 'border-indigo-500 bg-indigo-50/70 ring-1 ring-indigo-500'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  {ill.imageUrl ? (
                    <img
                      src={ill.imageUrl}
                      alt={ill.caption}
                      className="w-full h-14 object-cover rounded shadow-xs mb-1"
                    />
                  ) : (
                    <div className="w-full h-14 bg-slate-200/70 rounded flex flex-col items-center justify-center text-[10px] text-slate-400 mb-1">
                      <span>場景 {idx + 1}</span>
                      <span className="text-[9px]">待上傳</span>
                    </div>
                  )}
                  <span className="text-[10px] font-medium text-slate-700 truncate w-full px-0.5">
                    {ill.caption || `圖 ${idx + 1}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* 若完全沒有任何插圖場景（自選文章時） */
        <div className="p-4 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/30 text-center space-y-2.5">
          <p className="text-xs font-bold text-slate-700">本篇課文目前尚未配置多模態插圖場景</p>
          <p className="text-[11px] text-slate-500">可一鍵讓 AI 分析課文【起、承轉、合】脈絡，自動構思 3 組關鍵場景提示詞</p>
          <button
            type="button"
            onClick={onGenerateScenesForPasted}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm inline-flex items-center space-x-1.5 transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>一鍵為本課文分析並生成 3 幅場景提示詞</span>
          </button>
        </div>
      )}
    </div>
  );
};
