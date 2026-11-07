'use client';

import React from 'react';
import { Sparkles, RefreshCw, CheckCircle2, AlertCircle, ExternalLink, Key } from 'lucide-react';
import { AIProvider } from '@/lib/ai/types';

export interface AiConfigCardProps {
  provider: AIProvider;
  setProvider: (prov: AIProvider) => void;
  apiKeys: Record<string, string>;
  onKeyChange: (prov: string, val: string) => void;
  customBaseUrl: string;
  onBaseUrlChange: (val: string) => void;
  preferredModels: Record<string, string>;
  onModelChange: (prov: string, val: string) => void;
  keyChecking: boolean;
  keyStatus: { ok: boolean; message: string } | null;
  onVerifyKey: () => void;
  onClearKeys?: () => void;
}

// 官方金鑰申請網址與說明規格
const PROVIDER_INFO: Record<
  AIProvider,
  {
    name: string;
    badge: string;
    signupUrl: string;
    signupLabel: string;
    placeholder: string;
    pricingNote: string;
    prefixHint: string;
  }
> = {
  gemini: {
    name: 'Google Gemini',
    badge: '官方推薦 • 每日免費',
    signupUrl: 'https://aistudio.google.com/app/apikey',
    signupLabel: '前往 Google AI Studio 申請免費 API Key',
    placeholder: 'AIzaSy... (請貼上 Google AI Studio Key)',
    pricingNote: '提供非常慷慨的每日免費配額，推薦使用 Gemini 2.0 Flash / 1.5 Pro。',
    prefixHint: '通常為 AIzaSy 開頭',
  },
  claude: {
    name: 'Anthropic Claude',
    badge: '文學修辭第一 • 故事最佳',
    signupUrl: 'https://console.anthropic.com/settings/keys',
    signupLabel: '前往 Anthropic Console 申請 Claude API Key',
    placeholder: 'sk-ant-... (請貼上 Anthropic Claude API Key)',
    pricingNote: '文學故事感與修辭最細膩，最少機器人腔調。推薦 Claude 3.5 Sonnet。',
    prefixHint: '通常為 sk-ant- 開頭',
  },
  openai: {
    name: 'OpenAI 官方',
    badge: '全球最普及 • 深度推理',
    signupUrl: 'https://platform.openai.com/api-keys',
    signupLabel: '前往 OpenAI Platform 申請官方 API Key',
    placeholder: 'sk-proj-... 或 sk-... (請貼上 OpenAI 官方 Key)',
    pricingNote: 'GPT-4o Mini 成本極低且精準；o3-mini 具備深度邏輯推理能力。',
    prefixHint: '通常為 sk-proj- 或 sk- 開頭',
  },
  groq: {
    name: 'Groq 極速晶片',
    badge: '3秒瞬間出題 • 零等待',
    signupUrl: 'https://console.groq.com/keys',
    signupLabel: '前往 Groq Cloud Console 免費申請極速 Key',
    placeholder: 'gsk_... (請貼上 Groq API Key)',
    pricingNote: '採用 LPU 專用晶片，每秒生成 300+ 字，數秒內產出整份題本。有免費額度。',
    prefixHint: '通常為 gsk_ 開頭',
  },
  deepseek: {
    name: 'DeepSeek 官方',
    badge: '高性價比 • 中文優化',
    signupUrl: 'https://platform.deepseek.com/api_keys',
    signupLabel: '前往 DeepSeek 開放平台申請 API Key',
    placeholder: 'sk-... (請貼上 DeepSeek API Key)',
    pricingNote: 'V3 與 R1 推理模型，繁體中文理解力強且調用單價實惠。',
    prefixHint: '通常為 sk- 開頭',
  },
  openrouter: {
    name: 'OpenRouter 聚合',
    badge: '一把金鑰 • 海量模型',
    signupUrl: 'https://openrouter.ai/keys',
    signupLabel: '前往 OpenRouter 申請聚合 API Key',
    placeholder: 'sk-or-v1-... (請貼上 OpenRouter Key)',
    pricingNote: '單一帳戶可自由切換 Claude、GPT、DeepSeek、Llama 等全網模型。',
    prefixHint: '通常為 sk-or-v1- 開頭',
  },
  opencode: {
    name: '自訂網關 / OpenCode',
    badge: '相容端點 • 私有部屬',
    signupUrl: 'https://opencode.ai',
    signupLabel: '前往 OpenCode 控制台獲取端點與金鑰',
    placeholder: '請貼上自訂端點之相容金鑰',
    pricingNote: '支援任何自建 vLLM、Ollama 或教育機關專屬之 OpenAI 規格端點。',
    prefixHint: '支援自訂 Base URL',
  },
};

export const AiConfigCard: React.FC<AiConfigCardProps> = ({
  provider,
  setProvider,
  apiKeys,
  onKeyChange,
  customBaseUrl,
  onBaseUrlChange,
  preferredModels,
  onModelChange,
  keyChecking,
  keyStatus,
  onVerifyKey,
  onClearKeys,
}) => {
  const currentInfo = PROVIDER_INFO[provider];
  const hasKey = Boolean((apiKeys[provider] || '').trim());

  return (
    <div className="bg-gradient-to-br from-slate-50 to-sky-50/40 p-4 sm:p-5 rounded-2xl border border-sky-100 space-y-4">
      {/* 頂部標題與防護標籤 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            AI
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">AI 命題大腦與模型設定</h3>
            <p className="text-[11px] text-slate-500">
              支援 Google Gemini、Claude、OpenAI、Groq、DeepSeek 等 6 大提供商
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-bold text-sky-700 bg-sky-100/70 px-2 py-0.5 rounded-full">
            長效防護 180 秒
          </span>
          {onClearKeys && (
            <button
              type="button"
              onClick={onClearKeys}
              className="text-[11px] text-slate-400 hover:text-rose-600 underline transition"
            >
              清除已存金鑰
            </button>
          )}
        </div>
      </div>

      {/* AI 提供商選擇分頁 */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {(
            [
              { id: 'gemini', label: 'Google Gemini', sub: '官方 2.0/1.5 免費' },
              { id: 'claude', label: 'Anthropic Claude', sub: '文學修辭第一' },
              { id: 'openai', label: 'OpenAI 官方', sub: 'GPT-4o / o3-mini' },
              { id: 'groq', label: 'Groq 極速', sub: '3 秒瞬間產出' },
              { id: 'deepseek', label: 'DeepSeek', sub: 'V3 / R1 推理' },
              { id: 'openrouter', label: 'OpenRouter', sub: '全模型聚合免翻牆' },
            ] as const
          ).map((tab) => {
            const tabHasKey = Boolean((apiKeys[tab.id] || '').trim());
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setProvider(tab.id)}
                className={`p-2.5 rounded-xl text-left border transition flex flex-col justify-between relative ${
                  provider === tab.id
                    ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold truncate">{tab.label}</span>
                  {tabHasKey && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        provider === tab.id ? 'bg-emerald-300' : 'bg-emerald-500'
                      }`}
                      title="此提供商已儲存金鑰"
                    />
                  )}
                </div>
                <span
                  className={`text-[10px] mt-1 ${
                    provider === tab.id ? 'text-sky-100' : 'text-slate-400'
                  }`}
                >
                  {tab.sub}
                </span>
              </button>
            );
          })}
        </div>

        {/* 提供商專屬金鑰與模型設定欄位 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3.5">
          {/* 金鑰申請官方入口提示卡片 */}
          <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <Key className="w-4 h-4 text-sky-600 flex-shrink-0" />
              <div>
                <span className="font-bold text-sky-900">{currentInfo.name}</span>
                <span className="text-slate-500 ml-1.5 text-[11px]">{currentInfo.pricingNote}</span>
              </div>
            </div>
            <a
              href={currentInfo.signupUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition flex-shrink-0 self-start sm:self-auto"
              title="開新分頁前往官方網站申請"
            >
              <span>{currentInfo.signupLabel}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* API Key 輸入列 */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                <span>{currentInfo.name} API Key</span>
                <span className="text-rose-500 font-bold">*必填</span>
              </label>
              <span className="text-[11px] text-slate-400">{currentInfo.prefixHint}</span>
            </div>

            <div className="flex items-center space-x-2">
              <input
                id="ai-api-key-input"
                type="password"
                value={apiKeys[provider] || ''}
                onChange={(e) => onKeyChange(provider, e.target.value)}
                placeholder={currentInfo.placeholder}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none ${
                  hasKey ? 'border-slate-300 bg-white' : 'border-amber-300 bg-amber-50/30'
                }`}
              />
              <button
                type="button"
                onClick={onVerifyKey}
                disabled={keyChecking || !hasKey}
                className="px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold inline-flex items-center space-x-1.5 transition disabled:opacity-50 flex-shrink-0"
              >
                {keyChecking ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600" />
                    <span>連線中...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>測試有效性</span>
                  </>
                )}
              </button>
            </div>
            {!hasKey && (
              <p className="text-[11px] text-amber-700 mt-1 flex items-center space-x-1">
                <span>⚠️ 請先填入 API Key 才能啟動 AI 命題生成，點擊上方按鈕可免費申請。</span>
              </p>
            )}
          </div>

          {/* OpenCode GO 自訂端點 Base URL */}
          {provider === 'opencode' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                API 端點 (Base URL)
              </label>
              <input
                type="text"
                value={customBaseUrl}
                onChange={(e) => onBaseUrlChange(e.target.value)}
                placeholder="https://api.opencode.ai/v1"
                className="block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                支援任何 OpenAI 規格相容之轉發網關或自建端點。
              </span>
            </div>
          )}

          {/* 各提供商模型選擇 */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-slate-700">語言模型版本</label>
              <span className="text-[10px] text-slate-400">已啟用 Cloud Run 長效 180 秒防護</span>
            </div>

            {/* Google Gemini */}
            {provider === 'gemini' && (
              <select
                value={preferredModels.gemini || 'auto'}
                onChange={(e) => onModelChange('gemini', e.target.value)}
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white text-slate-800 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="auto">
                  🤖 智慧自動選擇（強烈推薦：自動匹配 Google 官方最新活躍的 Flash 模型）
                </option>
                <option value="gemini-3.8-flash">
                  ⚡ Gemini 3.8 Flash（新一代主力模型・複雜任務與四層次設題推薦）
                </option>
                <option value="gemini-3.7-flash">
                  🧠 Gemini 3.7 Flash（程式開發・多步驟推理・邏輯嚴密）
                </option>
                <option value="gemini-3.6-flash">
                  🌐 Gemini 3.6 Flash（一般對話・多模態理解）
                </option>
                <option value="gemini-3.5-flash">
                  🚀 Gemini 3.5 Flash（一般對話・大量請求）
                </option>
                <option value="gemini-3.5-flash-lite">
                  💰 Gemini 3.5 Flash-Lite（低成本・高頻率請求）
                </option>
                <option value="gemini-3.1-flash-lite">
                  🍃 Gemini 3.1 Flash-Lite（輕量化・高效率任務）
                </option>
              </select>
            )}

            {/* Anthropic Claude */}
            {provider === 'claude' && (
              <select
                value={preferredModels.claude || 'claude-sonnet-5-5'}
                onChange={(e) => onModelChange('claude', e.target.value)}
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white text-slate-800 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="claude-sonnet-5-5">
                  🌟 Claude Sonnet 5.5（強烈推薦：智慧速度平衡、文學故事首選、筆觸細膩）
                </option>
                <option value="claude-opus-5-5">
                  🏛️ Claude Opus 5.5（頂規深層推理：第四層批判評斷、嚴密評分規準）
                </option>
                <option value="claude-haiku-5-5">
                  ⚡ Claude Haiku 5.5（極速出題：快速問答、大量文字、隨堂測驗首選）
                </option>
                <option value="claude-fable-5-1">
                  🔬 Claude Fable 5.1（高難度推理：長時間專題任務）
                </option>
              </select>
            )}

            {/* OpenAI 官方 */}
            {provider === 'openai' && (
              <select
                value={preferredModels.openai || 'gpt-4o'}
                onChange={(e) => onModelChange('openai', e.target.value)}
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white text-slate-800 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="gpt-4o">
                  🌟 GPT-4o (全能旗艦：科普說明文與四層次設題標準穩定)
                </option>
                <option value="gpt-4o-mini">
                  ⚡ GPT-4o Mini (強烈推薦：性價比之王、極速低成本、出題邏輯強)
                </option>
                <option value="o3-mini">
                  🧠 o3-mini (深度邏輯推理：第四層批判檢驗與評分規準制定嚴謹)
                </option>
                <option value="o1">
                  🔬 o1 (頂級思考推理模型)
                </option>
              </select>
            )}

            {/* Groq 極速推理 */}
            {provider === 'groq' && (
              <select
                value={preferredModels.groq || 'llama-3.3-70b-versatile'}
                onChange={(e) => onModelChange('groq', e.target.value)}
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white text-slate-800 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="llama-3.1-8b-instant">
                  🚀 Llama 3.1 8B Instant（推薦首選：20,000 TPM 限額、2秒瞬時出題、免費帳號絕不塞車）
                </option>
                <option value="llama-3.3-70b-versatile">
                  🌟 Llama 3.3 70B Versatile（高階旗艦：Meta 最強開源模型、四層次設題邏輯嚴密）
                </option>
                <option value="openai/gpt-oss-20b">
                  ⚡ GPT OSS 20B（均衡高吞吐：推論速度快、適合大量文字處理）
                </option>
                <option value="openai/gpt-oss-120b">
                  🏛️ GPT OSS 120B（大型推理模型：深度複雜任務與批判評斷設題）
                </option>
              </select>
            )}

            {/* DeepSeek 官方 */}
            {provider === 'deepseek' && (
              <select
                value={preferredModels.deepseek || 'deepseek-chat'}
                onChange={(e) => onModelChange('deepseek', e.target.value)}
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white text-slate-800 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="deepseek-chat">
                  🌟 DeepSeek V3 (deepseek-chat) - 推薦：繁中理解精準、中文命題首選
                </option>
                <option value="deepseek-reasoner">
                  🧠 DeepSeek R1 (deepseek-reasoner) - 深度思維鏈推理
                </option>
              </select>
            )}

            {/* OpenRouter 聚合 */}
            {provider === 'openrouter' && (
              <select
                value={preferredModels.openrouter || 'deepseek/deepseek-chat'}
                onChange={(e) => onModelChange('openrouter', e.target.value)}
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white text-slate-800 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="deepseek/deepseek-chat">
                  🌟 DeepSeek Chat / V3 (deepseek/deepseek-chat) - 推薦首選
                </option>
                <option value="anthropic/claude-3.5-sonnet">
                  👑 Anthropic Claude 3.5 Sonnet
                </option>
                <option value="openai/gpt-4o">
                  ✨ OpenAI GPT-4o
                </option>
                <option value="openai/gpt-4o-mini">
                  ⚡ OpenAI GPT-4o Mini
                </option>
                <option value="meta-llama/llama-3.3-70b-instruct">
                  🦙 Meta Llama 3.3 70B
                </option>
              </select>
            )}

            {/* OpenCode 自訂 */}
            {provider === 'opencode' && (
              <select
                value={preferredModels.opencode || 'deepseek-chat'}
                onChange={(e) => onModelChange('opencode', e.target.value)}
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white text-slate-800 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="deepseek-chat">⚡ DeepSeek-V3</option>
                <option value="gpt-4o">✨ GPT-4o</option>
                <option value="claude-3-5-sonnet">👑 Claude 3.5 Sonnet</option>
              </select>
            )}
          </div>
        </div>

        {/* 驗證狀態反饋 */}
        {keyStatus && (
          <div
            className={`p-3 rounded-xl text-xs flex items-start space-x-2 ${
              keyStatus.ok
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {keyStatus.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            )}
            <span className="break-all leading-relaxed font-medium">{keyStatus.message}</span>
          </div>
        )}
      </div>
    </div>
  );
};
