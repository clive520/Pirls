'use client';

import React from 'react';
import { ArticleIllustration } from '@/lib/types';

export interface ArticleContentProps {
  paragraphs?: Array<{ paragraphNumber: number; text?: string; content?: string }>;
  rawContent?: string;
  illustrations?: ArticleIllustration[];
  fontSizeClass?: string;
  badgeTheme?: 'indigo' | 'sky';
}

export const ArticleContent: React.FC<ArticleContentProps> = ({
  paragraphs = [],
  rawContent,
  illustrations = [],
  fontSizeClass = 'text-sm sm:text-base leading-relaxed',
  badgeTheme = 'indigo',
}) => {
  const badgeColors =
    badgeTheme === 'sky'
      ? 'text-sky-700 bg-sky-50 border-sky-200/60'
      : 'text-indigo-700 bg-indigo-50 border-indigo-200/60';

  if (!paragraphs || paragraphs.length === 0) {
    if (!rawContent) return null;
    return (
      <div className={`space-y-4 text-slate-800 font-serif ${fontSizeClass}`}>
        <p className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-100 text-justify leading-relaxed whitespace-pre-line">
          {rawContent}
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 text-slate-800 font-serif ${fontSizeClass}`}>
      {paragraphs.map((p, pIdx) => {
        const matchingIlls = illustrations.filter(
          (ill) => (ill.paragraphNumber || 1) === p.paragraphNumber
        );
        const isLast = pIdx === paragraphs.length - 1;
        const trailingIlls = isLast
          ? illustrations.filter((ill) => (ill.paragraphNumber || 1) > paragraphs.length)
          : [];
        const allIllsForThisPara = [...matchingIlls, ...trailingIlls];
        const paraText = p.text || (p as any).content || '';

        return (
          <div key={p.paragraphNumber} className="space-y-4">
            <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-100 text-justify relative group">
              <span
                className={`inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded mr-2.5 align-middle select-none border ${badgeColors}`}
              >
                P{p.paragraphNumber}
              </span>
              <span className="leading-relaxed">{paraText}</span>
            </div>

            {/* 穿插於本段落後的情境插圖 */}
            {allIllsForThisPara.map((ill) => {
              if (!ill.imageUrl && !ill.svgCode) return null;
              return (
                <figure
                  key={ill.id}
                  className="my-4 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 shadow-sm flex flex-col items-center justify-between mx-auto max-w-xl"
                >
                  {ill.imageUrl ? (
                    <div className="flex justify-center p-1 bg-white rounded-xl w-full">
                      <img
                        src={ill.imageUrl}
                        alt={ill.caption || '課文情境插圖'}
                        className="w-full max-h-80 object-contain rounded-lg shadow-sm"
                      />
                    </div>
                  ) : ill.svgCode ? (
                    <div
                      className="w-full flex justify-center py-2 overflow-x-auto"
                      dangerouslySetInnerHTML={{ __html: ill.svgCode }}
                    />
                  ) : null}
                  {ill.caption && (
                    <figcaption className="text-xs text-center text-slate-600 font-semibold mt-2.5 px-2 leading-relaxed">
                      {ill.caption}
                    </figcaption>
                  )}
                </figure>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
