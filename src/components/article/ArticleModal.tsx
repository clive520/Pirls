'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, X, ZoomIn, ZoomOut } from 'lucide-react';
import { ArticleIllustration } from '@/lib/types';
import { ArticleContent } from './ArticleContent';

export interface ArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  wordCount?: number;
  themeSummary?: string;
  paragraphs: Array<{ paragraphNumber: number; text: string }>;
  illustrations?: ArticleIllustration[];
  accentColor?: 'indigo' | 'sky';
}

export const ArticleModal: React.FC<ArticleModalProps> = ({
  isOpen,
  onClose,
  title,
  wordCount,
  themeSummary,
  paragraphs,
  illustrations = [],
  accentColor = 'indigo',
}) => {
  const [fontSizeLevel, setFontSizeLevel] = useState<number>(0);

  // 鍵盤 Esc 關閉支援
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 開啟時鎖定頁面背景捲軸
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getFontSizeClass = () => {
    if (fontSizeLevel === 1) return 'text-base sm:text-lg leading-relaxed';
    if (fontSizeLevel === 2) return 'text-lg sm:text-xl leading-loose';
    return 'text-sm sm:text-base leading-relaxed';
  };

  const isSky = accentColor === 'sky';
  const iconBg = isSky ? 'bg-sky-600' : 'bg-indigo-600';
  const buttonBg = isSky
    ? 'bg-sky-600 hover:bg-sky-700'
    : 'bg-indigo-600 hover:bg-indigo-700';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 彈窗標頭 */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center space-x-2.5">
            <div className={`w-8 h-8 rounded-xl ${iconBg} text-white flex items-center justify-center flex-shrink-0`}>
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base line-clamp-1">
                {title}
              </h3>
              <div className="text-[11px] text-slate-400 font-mono">
                {wordCount ? `約 ${wordCount} 字 • ` : ''}共 {paragraphs.length} 段
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* 字級縮放 */}
            <div className="flex items-center space-x-1 bg-white p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setFontSizeLevel(Math.max(0, fontSizeLevel - 1))}
                className="p-1 rounded hover:bg-slate-100 text-slate-600 transition"
                title="縮小字體"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-bold px-1 text-slate-600">字級</span>
              <button
                onClick={() => setFontSizeLevel(Math.min(2, fontSizeLevel + 1))}
                className="p-1 rounded hover:bg-slate-100 text-slate-600 transition"
                title="放大字體"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 關閉按鈕 */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
              title="關閉彈窗 (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 彈窗內文章正文 (可滾動) */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-4">
          {themeSummary && (
            <div className="text-xs sm:text-sm text-slate-600 italic bg-slate-50 p-3.5 rounded-xl border border-slate-100 leading-relaxed mb-4">
              💡 導讀：{themeSummary}
            </div>
          )}
          <ArticleContent
            paragraphs={paragraphs}
            illustrations={illustrations}
            fontSizeClass={getFontSizeClass()}
            badgeTheme={accentColor}
          />
        </div>

        {/* 彈窗底部操作列 */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 hidden sm:inline">
            💡 提示：隨時可滾動查閱各段落與插圖，已作答的所有內容均完整保留。
          </span>
          <button
            onClick={onClose}
            className={`w-full sm:w-auto px-6 py-2 rounded-xl ${buttonBg} text-white font-bold text-xs shadow transition ml-auto`}
          >
            關閉，返回繼續作答
          </button>
        </div>
      </div>
    </div>
  );
};
