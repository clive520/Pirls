const SVG_NS = 'http://www.w3.org/2000/svg';

export const SVG_ALLOWED_TAGS = [
  'svg',
  'g',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'text',
  'tspan',
  'defs',
  'linearGradient',
  'radialGradient',
  'stop',
] as const;

export const SVG_ALLOWED_ATTRS = [
  'viewBox',
  'xmlns',
  'class',
  'id',
  'd',
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-dasharray',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-opacity',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'width',
  'height',
  'points',
  'opacity',
  'transform',
  'font-size',
  'font-weight',
  'font-family',
  'text-anchor',
  'dominant-baseline',
  'offset',
  'stop-color',
  'stop-opacity',
] as const;

type DOMPurifyInstance = typeof import('dompurify').default;
let domPurifyPromise: Promise<DOMPurifyInstance> | null = null;

/**
 * 僅在瀏覽器缺乏原生 Sanitizer API (Element.prototype.setHTML) 時才動態載入 DOMPurify，
 * 避免對原生支援的現代瀏覽器增加額外 bundle 負擔。
 */
function loadDOMPurify(): Promise<DOMPurifyInstance> {
  domPurifyPromise ??= import('dompurify').then((mod) => (mod.default ?? mod) as DOMPurifyInstance);
  return domPurifyPromise;
}

/**
 * 將外部或 AI 生成之 SVG 字串安全寫入指定容器元素：
 * 優先使用瀏覽器原生 Sanitizer API `setHTML()`，不支援時降級使用嚴格白名單的 DOMPurify。
 */
export async function safeSetSvg(el: HTMLElement, svgHtml: string): Promise<void> {
  if (!svgHtml) {
    el.replaceChildren();
    return;
  }

  if (typeof window !== 'undefined' && 'setHTML' in Element.prototype) {
    try {
      const elements = SVG_ALLOWED_TAGS.map((name) => ({ name, namespace: SVG_NS }));
      (el as HTMLElement & { setHTML: (html: string, opts?: unknown) => void }).setHTML(svgHtml, {
        sanitizer: {
          elements,
          attributes: [...SVG_ALLOWED_ATTRS],
        },
      });
      // 若瀏覽器原生 setHTML 接受 SVG 元素且確實成功解析，直接結束
      if (el.querySelector('svg') || !svgHtml.toLowerCase().includes('<svg')) {
        return;
      }
    } catch {
      // 若瀏覽器實作對自訂 SVG namespace 設定不相容，安全降級至 DOMPurify
    }
  }

  const DOMPurify = await loadDOMPurify();
  const sanitized = DOMPurify.sanitize(svgHtml, {
    ALLOWED_TAGS: [...SVG_ALLOWED_TAGS, '#text'],
    ALLOWED_ATTR: [...SVG_ALLOWED_ATTRS],
    ALLOW_ARIA_ATTR: false,
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: false,
  });
  el.innerHTML = sanitized;
}
