import { ArticleIllustration } from '@/lib/types';

/**
 * 智慧 3 幅關鍵場景生圖提示詞構建器：依文章起承轉合情境，構思 3 幅獨立且風格統一之關鍵場景提示詞，並明確指定穿插於各合適段落之後
 */
export function generateSmartImagePrompts(
  title: string,
  summary: string,
  isLiterary: boolean,
  grade: number,
  paragraphsCount: number = 5
): ArticleIllustration[] {
  const styleZh = isLiterary
    ? '溫馨細膩的台灣國小兒童繪本水彩手繪插畫風格、柔和溫暖光影、人物表情生動自然、色彩和諧純淨、富有故事感與童趣'
    : '現代清新教育科普插畫風格、清晰的圖文結構與生動生態/科學細節、色彩明亮鮮活、國家地理少兒版風格';

  const styleEn = isLiterary
    ? 'Warm and charming children storybook illustration, soft watercolor and colored pencil textures, gentle golden morning sunlight, expressive characters, nostalgic Taiwanese countryside storybook style, wholesome, beautiful detailed background, 8k resolution, artstation trending --ar 16:9 --v 6.0'
    : 'Modern educational children science infographic illustration, clean vector aesthetic, clear composition, bright natural daylight, highly detailed and pedagogical, National Geographic Kids style, 8k resolution --ar 16:9';

  const totalParas = Math.max(1, paragraphsCount);
  const p1 = 1;
  const p2 = totalParas <= 2 ? 1 : Math.max(2, Math.round(totalParas / 2));
  const p3 = totalParas <= 2 ? 2 : totalParas;

  const scenes = isLiterary
    ? [
        {
          stage: '起·開端情境',
          para: p1,
          descZh: `故事開端背景：主角初次登場，置身於故事核心環境中，展現生活日常或冒險前夕的期盼氛圍。`,
          descEn: `Scene 1 (Beginning): Introduction of main characters in their peaceful native environment with gentle soft morning atmosphere.`,
        },
        {
          stage: '承轉·衝突高潮',
          para: p2,
          descZh: `情節關鍵轉折與考驗：主角面臨核心挑戰或重大行動時刻，神情專注緊張，充滿動態張力與互動感。`,
          descEn: `Scene 2 (Climax): The climactic turning point and core challenge, dynamic interaction, emotional expression, dramatic lighting and tension.`,
        },
        {
          stage: '合·溫馨結局',
          para: p3,
          descZh: `故事溫暖結局與啟發：問題獲得解決，眾人露出欣慰笑容，迎向晨光或夕陽，洋溢理解與成長的感動。`,
          descEn: `Scene 3 (Ending): Wholesome and touching conclusion, celebrating resolution and growth, warm golden hour glow, smiling faces, heartfelt harmony.`,
        },
      ]
    : [
        {
          stage: '引言·生態全景',
          para: p1,
          descZh: `宏觀全景視野：呈現該科普主題或自然生物棲地的壯麗全景與生存環境。`,
          descEn: `Scene 1 (Overview): Majestic wide panoramic overview of the ecological habitat and natural environment.`,
        },
        {
          stage: '核心·構造運作',
          para: p2,
          descZh: `特寫微觀焦點：生動展示生物特殊構造、習性互動或科學運作的關鍵特徵細節。`,
          descEn: `Scene 2 (Feature): Close-up detailed depiction of distinctive biological traits, adaptations, or scientific processes.`,
        },
        {
          stage: '體悟·人與自然',
          para: p3,
          descZh: `和諧共存啟發：人類保育觀察或生態平衡的永續美好畫面，富有教育啟發性。`,
          descEn: `Scene 3 (Harmony): Harmonious coexistence between human observation and natural conservation, inspiring and educational.`,
        },
      ];

  return scenes.map((s, idx) => ({
    id: `ill_scene_${idx + 1}_${Date.now()}`,
    paragraphNumber: s.para,
    caption: `圖 ${idx + 1}：【${s.stage} / 穿插於第 ${s.para} 段後】《${title}》課文情境插圖`,
    type: 'illustration_url' as const,
    imageUrl: '',
    imagePrompt: `【場景 ${idx + 1}（${s.stage}，建議穿插於文章第 ${s.para} 段之後）中文描述 - 適用 ChatGPT / DALL-E 3 / Bing 繪圖】：
繪製國小 ${grade} 年級課文《${title}》的關鍵插圖（場景 ${idx + 1}：${s.stage}，排版位置：穿插於第 ${s.para} 段後）。
畫面核心：${s.descZh}（主旨：${summary}）。
藝術風格：${styleZh}。構圖橫向 16:9，畫面請勿出現任何文字或水印，呈現高質感純淨兒童繪本畫面。

【英文指令 - 適用 Midjourney / Recraft 複製貼上】：
A masterwork children book illustration for "${title}", Scene ${idx + 1} (${s.stage}, place after paragraph ${s.para}): ${s.descEn}. Key theme: ${summary}. ${styleEn}`,
  }));
}

/**
 * 組合全套場景生圖提示詞（一段結構完整的提示詞，包含所有分開的圖片指示）
 * 讓老師一鍵複製，可直接整段貼給 ChatGPT、Claude 或繪圖 AI 一次產出全套插圖！
 */
export function formatCombinedImagePrompt(illustrations: ArticleIllustration[], title: string): string {
  if (!illustrations || illustrations.length === 0) return '';

  const header = `請幫我依據國小閱讀課文《${title}》，為課文關鍵場景分別生成 ${illustrations.length} 張風格完全統一的「16:9 兒童繪本水彩手繪插畫」（等生成後將分別穿插在文章各對應段落之後）：\n\n`;

  const body = illustrations
    .map((ill, i) => {
      const promptText = ill.imagePrompt
        ? ill.imagePrompt.trim()
        : `請繪製：${ill.caption || `第 ${i + 1} 幅插圖`}`;
      const paraInfo = ill.paragraphNumber ? `建議穿插於第 ${ill.paragraphNumber} 段之後` : '穿插於文章合適段落';
      return `━━━━━━━━━━━━━━━━━━━━━\n【第 ${i + 1} 幅插圖】(${ill.caption || `場景 ${i + 1}`} | ${paraInfo})\n${promptText}`;
    })
    .join('\n\n');

  const footer = `\n\n━━━━━━━━━━━━━━━━━━━━━\n【全套統一視覺要求】：\n1. 藝術風格：溫馨柔和的兒童故事繪本手繪水彩風格，光影柔和溫暖，人物線條生動可愛。\n2. 規格比例：16:9 橫向寬螢幕構圖。\n3. 純淨畫面：畫面中切勿包含任何文字、標題或浮水印。\n4. 排版應用：每張插圖將穿插在對應段落下方配合課文情節閱讀。`;

  return header + body + footer;
}

/**
 * 智慧生圖提示詞構建器（單幅保底相容）
 */
export function generateSmartImagePrompt(
  title: string,
  summary: string,
  isLiterary: boolean,
  grade: number
): string {
  const styleZh = isLiterary
    ? '溫馨細膩的台灣國小兒童繪本水彩手繪插畫風格、柔和溫暖光影、人物表情生動自然、色彩和諧純淨、富有故事感與童趣'
    : '現代清新教育科普插畫風格、清晰的圖文結構與生動生態/科學細節、色彩明亮鮮活、國家地理少兒版風格';

  const styleEn = isLiterary
    ? 'Warm and charming children storybook illustration, soft watercolor and colored pencil textures, gentle golden morning sunlight, expressive characters, nostalgic Taiwanese countryside storybook style, wholesome, beautiful detailed background, 8k resolution, artstation trending --ar 16:9 --v 6.0'
    : 'Modern educational children science infographic illustration, clean vector aesthetic, clear composition, bright natural daylight, highly detailed and pedagogical, National Geographic Kids style, 8k resolution --ar 16:9';

  return `【中文生圖描述 (適合 ChatGPT / DALL-E 3 / Bing 繪圖)】：
繪製國小 ${grade} 年級閱讀課文《${title}》的情境插畫。
畫面主題：${summary}。
畫面風格：${styleZh}。構圖橫向 16:9，畫面請勿包含任何英文或中文字型水印，呈現純淨繪本視覺。

【英文指令 (適合 Midjourney / Stable Diffusion / Recraft 複製貼上)】：
A masterwork children book illustration for "${title}", depicting ${summary}. ${styleEn}`;
}
