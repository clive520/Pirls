import { TestPaper } from '@/lib/types';
import { GenerateParams } from './types';
import { callGeminiAPI } from './providers/gemini';
import { callOpenAICompatibleAPI } from './providers/openai-compatible';
import { generateMockAuthenticPIRLSTest } from './fallback-generator';

export * from './types';
export * from './prompts';
export * from './image-prompts';
export * from './fallback-generator';
export * from './format-paper';
export * from './providers/gemini';
export * from './providers/openai-compatible';

/**
 * PIRLS 多模型命題引擎進入點 (LLM Adapter Orchestrator)
 * 支援 Google Gemini API 結構化調用與 OpenAI 相容介面 (OpenRouter, DeepSeek, OpenCode)。
 * 當尚未配置 API Key 時，內建智慧模擬引擎（含 SVG 向量科學流程圖與手繪插圖），
 * 確保系統在任何情況下皆可即時產出 12~14 題符合 PIRLS 官方真實題本規格之試卷。
 */
export async function generatePIRLSTestPaper(params: GenerateParams): Promise<TestPaper> {
  const provider = params.provider || 'gemini';
  const apiKey = (params.apiKey || '').trim() || (provider === 'gemini' ? process.env.GEMINI_API_KEY?.trim() : undefined);

  if (apiKey) {
    if (provider === 'gemini') {
      return await callGeminiAPI(params, apiKey);
    } else {
      return await callOpenAICompatibleAPI(params, provider, apiKey);
    }
  }

  // 若顯式宣告允許模擬備援（僅供離線自動化測試腳本使用）
  if (params.allowMockFallback) {
    return generateMockAuthenticPIRLSTest(params);
  }

  // 未填寫金鑰時嚴格拋出提示異常，絕不悄悄生成範例文章誤導教師
  throw new Error('未檢測到 AI API Key！請先在上方「AI 模型與 API Key 設定」中貼上有效的金鑰，方可開始調用 AI 進行試卷生成。');
}
