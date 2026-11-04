'use client';

import React from 'react';
import { Sparkles, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export interface AiConfigCardProps {
  provider: 'gemini' | 'openrouter' | 'deepseek' | 'opencode';
  setProvider: (prov: 'gemini' | 'openrouter' | 'deepseek' | 'opencode') => void;
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
  return (
    <div className="bg-gradient-to-br from-slate-50 to-sky-50/40 p-4 sm:p-5 rounded-2xl border border-sky-100 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            AI
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">AI 命題大腦與模型設定</h3>
            <p className="text-[11px] text-slate-500">支援 Google Gemini、DeepSeek、OpenRouter 等多模型</p>
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
              className="text-[11px] text-slate-400 hover:text-red-600 underline transition"
            >
              清除暫存
            </button>
          )}
        </div>
      </div>

      {/* AI 提供商選擇分頁 */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'gemini', label: 'Google Gemini', sub: '官方 3.8 Flash' },
            { id: 'deepseek', label: 'DeepSeek', sub: 'V4.1 Flash / V3' },
            { id: 'openrouter', label: 'OpenRouter', sub: '海量模型免翻牆' },
            { id: 'opencode', label: 'OpenCode GO', sub: '相容轉發網關' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setProvider(tab.id as any)}
              className={`p-2 rounded-xl text-left border transition flex flex-col justify-between ${
                provider === tab.id
                  ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="text-xs font-bold truncate flex items-center space-x-1">
                <span>{tab.label}</span>
              </span>
              <span className={`text-[10px] mt-0.5 ${provider === tab.id ? 'text-sky-100' : 'text-slate-400'}`}>
                {tab.sub}
              </span>
            </button>
          ))}
        </div>

        {/* 提供商專屬金鑰與模型設定欄位 */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
          {/* API Key 輸入列 */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-slate-700">
                {provider === 'gemini' && 'Google Gemini API Key'}
                {provider === 'deepseek' && 'DeepSeek API Key (sk-...)'}
                {provider === 'openrouter' && 'OpenRouter API Key (sk-or-v1-...)'}
                {provider === 'opencode' && 'OpenCode GO API Key'}
              </label>
              <span className="text-[11px] text-slate-400">
                {provider === 'gemini' && '若未填寫，將調用內建離線示範題庫'}
                {provider === 'deepseek' && '前往 platform.deepseek.com 獲取'}
                {provider === 'openrouter' && '前往 openrouter.ai/keys 獲取'}
                {provider === 'opencode' && '前往 opencode.ai 控制台獲取'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="password"
                value={apiKeys[provider] || ''}
                onChange={(e) => onKeyChange(provider, e.target.value)}
                placeholder={
                  provider === 'gemini'
                    ? 'AIzaSy... (貼上 Google AI Studio Key)'
                    : provider === 'openrouter'
                    ? 'sk-or-v1-...'
                    : 'sk-...'
                }
                className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={onVerifyKey}
                disabled={keyChecking || !(apiKeys[provider] || '').trim()}
                className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold inline-flex items-center space-x-1.5 transition disabled:opacity-50 flex-shrink-0"
              >
                {keyChecking ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600" />
                    <span>連線中...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>測試金鑰有效性</span>
                  </>
                )}
              </button>
            </div>
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
              <label className="text-xs font-bold text-slate-700">語言模型選擇</label>
              <span className="text-[10px] text-slate-400">已配置 Google Cloud 原生長效運算防護（180秒）</span>
            </div>

            {provider === 'gemini' && (
              <select
                value={preferredModels.gemini || 'auto'}
                onChange={(e) => onModelChange('gemini', e.target.value)}
                className="block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white text-slate-800 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="auto">
                  🤖 智慧自動選擇（強烈推薦：自動匹配 Google 官方最新活躍的 Flash 模型）
                </option>
                <option value="gemini-3.8-flash">
                  ⚡ Gemini 3.8 Flash（Google 官方目前主力推薦 Flash 模型）
                </option>
                <option value="gemini-3.6-flash">
                  🍃 Gemini 3.6 Flash（極速備援模型，低負載、無塞車）
                </option>
                <option value="gemini-1.5-flash">
                  🏛️ Gemini 1.5 Flash（舊版相容模型）
                </option>
              </select>
            )}

            {provider === 'deepseek' && (
              <select
                value={preferredModels.deepseek || 'deepseek-flash'}
                onChange={(e) => onModelChange('deepseek', e.target.value)}
                className="block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white text-slate-800 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="deepseek-flash">
                  ⚡ DeepSeek V4.1 Flash (deepseek-flash) - 推薦：最新極速小型模型、超低延遲
                </option>
                <option value="deepseek-chat">
                  🌟 DeepSeek Chat / V3 (deepseek-chat) - 通用對話、繁體中文理解力強
                </option>
                <option value="deepseek-v4-pro">
                  🚀 DeepSeek V4 Pro (deepseek-v4-pro) - 高階旗艦專業模型
                </option>
                <option value="deepseek-reasoner">
                  🧠 DeepSeek R1 (deepseek-reasoner) - 深度思考推理大模型
                </option>
                <option value="deepseek-r1">
                  🧠 DeepSeek R1 (deepseek-r1) - 深度推理別名
                </option>
              </select>
            )}

            {provider === 'openrouter' && (
              <select
                value={preferredModels.openrouter || 'deepseek/deepseek-chat'}
                onChange={(e) => onModelChange('openrouter', e.target.value)}
                className="block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white text-slate-800 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="deepseek/deepseek-chat">
                  🌟 DeepSeek Chat / V3 (deepseek/deepseek-chat) - 推薦首選：高性價比、中文命題精準
                </option>
                <option value="deepseek/deepseek-r1">
                  🧠 DeepSeek R1 (deepseek/deepseek-r1) - 深度思考推理
                </option>
                <option value="google/gemini-2.0-flash-001">
                  ⚡ Gemini 2.0 Flash (google/gemini-2.0-flash-001) - 極速推理
                </option>
                <option value="openai/gpt-4o-mini">
                  ✨ OpenAI GPT-4o Mini (openai/gpt-4o-mini) - 輕量平衡
                </option>
                <option value="anthropic/claude-3.5-haiku">
                  🦅 Claude 3.5 Haiku (anthropic/claude-3.5-haiku) - 嚴謹細緻
                </option>
                <option value="meta-llama/llama-3.3-70b-instruct">
                  🦙 Llama 3.3 70B (meta-llama/llama-3.3-70b-instruct) - 開源頂規
                </option>
              </select>
            )}

            {provider === 'opencode' && (
              <select
                value={preferredModels.opencode || 'deepseek-chat'}
                onChange={(e) => onModelChange('opencode', e.target.value)}
                className="block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white text-slate-800 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="deepseek-chat">⚡ DeepSeek-V3 (deepseek-chat)</option>
                <option value="gpt-4o-mini">✨ GPT-4o Mini</option>
                <option value="claude-3-5-haiku">🦅 Claude 3.5 Haiku</option>
              </select>
            )}
          </div>
        </div>

        {/* 驗證狀態反饋 */}
        {keyStatus && (
          <div
            className={`p-2.5 rounded-lg text-xs flex items-start space-x-2 ${
              keyStatus.ok
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {keyStatus.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <span className="break-all leading-relaxed">{keyStatus.message}</span>
          </div>
        )}

        <p className="text-[11px] text-slate-500 leading-relaxed">
          💡 提示：所有 API 金鑰均僅保存在您當前裝置的瀏覽器快顯儲存中，不會跨帳號外流。系統依託 Google Cloud Run 容器長效運算架構，已將生成防護放寬至 180 秒（3 分鐘），充分支援長篇四層次 8~14 題之完整深度推論。
        </p>
      </div>
    </div>
  );
};
