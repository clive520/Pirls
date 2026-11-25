'use client';

import React, { useEffect, useRef } from 'react';
import { safeSetSvg } from '@/lib/sanitize-svg';

export interface SafeSvgProps {
  svgCode: string;
  className?: string;
}

/**
 * 安全渲染 SVG 圖表的共用元件，確保不直接寫入未經淨化的 HTML 字串至 DOM。
 */
export const SafeSvg: React.FC<SafeSvgProps> = ({ svgCode, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const el = containerRef.current;
    if (!el) return;

    if (!svgCode) {
      el.replaceChildren();
      return;
    }

    safeSetSvg(el, svgCode).catch(() => {
      if (!cancelled && containerRef.current) {
        containerRef.current.replaceChildren();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [svgCode]);

  return <div ref={containerRef} className={className} />;
};
