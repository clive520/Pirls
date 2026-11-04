/**
 * PIRLS AI 模組型別定義
 */

export type AIProvider = 'gemini' | 'openrouter' | 'deepseek' | 'opencode';

export interface GenerateParams {
  mode: 'theme' | 'paste';
  theme?: string;
  pastedText?: string;
  pastedTitle?: string;
  targetGrade: number; // 3-6
  textType: 'literary' | 'informational';
  questionCountMode: 'standard' | 'compact'; // standard: 12~14 題, compact: 8 題
  includeDiagram?: boolean;
  provider?: AIProvider;
  apiKey?: string;
  customBaseUrl?: string;
  preferredModel?: string; // 偏好模型
  creatorId: string;
  creatorName: string;
}
