'use client';

import React from 'react';
import Link from 'next/link';
import { Settings, Sparkles, Key, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { AIProvider } from '@/lib/ai/types';

interface AiModelSelectorProps {
  provider: AIProvider;
  setProvider: (prov: AIProvider) => void;
  apiKeys: Record<string, string>;
  preferredModels: Record<string, string>;
  onModelChange: (prov: string, val: string) => void;
}

const PROVIDER_NAMES: Record<AIProvider, { name: string; badge: string; color: string }> = {
  gemini: { name: 'Google Gemini', badge: '官方首選', color: 'border-blue-500 text-blue-700 bg-blue-50' },
  claude: { name: 'Anthropic Claude', badge: '文學推薦', color: 'border-amber-500 text-amber-700 bg-amber-50' },
  openai: { name: 'OpenAI 官方', badge: '最普及', color: 'border-emerald-500 text-emerald-700 bg-emerald-50' },
  groq: { name: 'Groq 極速晶片', badge: '3秒出題', color: 'border-rose-500 text-rose-700 bg-rose-50' },
  deepseek: { name: 'DeepSeek 官方', badge: '中文精準', color: 'border-cyan-500 text-cyan-700 bg-cyan-50' },
  openrouter: { name: 'OpenRouter', badge: '聚合網關', color: 'border-violet-500 text-violet-700 bg-violet-50' },
  opencode: { name: '自建端點', badge: '自訂 Base URL', color: 'border-slate-500 text-slate-700 bg-slate-50' },
};

export const AiModelSelector: React.FC<AiModelSelectorProps> = ({
  provider,
  setProvider,
  apiKeys,
  preferredModels,
  onModelChange,
}) => {
  const currentKey = (apiKeys[provider] || '').trim();
  const hasKey = Boolean(currentKey);

  return (
    <div className="bg-gradient-to-br from-slate-50 via-sky-50/30 to-indigo-50/20 p-4 sm:p-5 rounded-2xl border border-sky-100/80 shadow-2xs space-y-3.5">
      {/* 標題與金鑰管理外跳連結 */}
      <div className="flex items-center justify-between pb-2 border-b border-sky-100/60">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            AI
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900">AI 命題大腦選用</h3>
            <p className="text-[10px] text-slate-500">自由挑選欲負責本次文章生成與四層次設題之 AI 模型</p>
          </div>
        </div>

        <Link
          href="/dashboard/teacher/settings/ai?from=create"
          className="text-xs font-bold text-sky-700 hover:text-sky-800 bg-white hover:bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-200 shadow-2xs transition inline-flex items-center space-x-1.5 flex-shrink-0"
          title="前往獨立頁面管理各家 API Key 與連線測試"
        >
          <Settings className="w-3.5 h-3.5 text-sky-600" />
          <span>管理 AI 金鑰設定</span>
          <ExternalLink className="w-3 h-3 text-sky-400" />
        </Link>
      </div>

      {/* 提供商快速切換標籤 */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
        {(Object.keys(PROVIDER_NAMES) as AIProvider[]).map((pKey) => {
          const info = PROVIDER_NAMES[pKey];
          const isSelected = provider === pKey;
          const isConfigured = Boolean((apiKeys[pKey] || '').trim());

          return (
            <button
              key={pKey}
              type="button"
              onClick={() => setProvider(pKey)}
              className={`px-2.5 py-1.5 rounded-xl text-left border transition relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-white border-sky-500 text-slate-900 shadow-xs ring-1 ring-sky-500'
                  : 'bg-white/70 hover:bg-white border-slate-200 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-slate-400">{info.badge}</span>
                {isConfigured ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="已設定金鑰" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" title="尚未設定金鑰" />
                )}
              </div>
              <div className="text-[11px] font-bold truncate mt-0.5">
                {info.name}
              </div>
            </button>
          );
        })}
      </div>

      {/* 模型版本選擇與金鑰狀態橫列 */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* 左側：模型版本下拉選單 */}
        <div className="flex-1 flex items-center space-x-2">
          <label className="text-[11px] font-bold text-slate-600 flex-shrink-0">
            模型版本：
          </label>
          {provider === 'gemini' && (
            <select
              value={preferredModels.gemini || 'auto'}
              onChange={(e) => onModelChange('gemini', e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 py-1 px-2.5 text-xs text-slate-800 bg-slate-50/50 font-medium focus:ring-1 focus:ring-sky-500 focus:outline-none"
            >
              <option value="auto">🤖 智慧自動選擇 (推薦：官方最新 Flash 模型)</option>
              <option value="gemini-3.8-flash">⚡ Gemini 3.8 Flash (新一代主力・複雜任務推薦)</option>
              <option value="gemini-3.7-flash">🧠 Gemini 3.7 Flash (程式開發・多步驟推理)</option>
              <option value="gemini-3.6-flash">🌐 Gemini 3.6 Flash (一般對話・多模態理解)</option>
              <option value="gemini-3.5-flash">🚀 Gemini 3.5 Flash (一般對話・大量請求)</option>
              <option value="gemini-3.5-flash-lite">💰 Gemini 3.5 Flash-Lite (低成本・高頻率請求)</option>
              <option value="gemini-3.1-flash-lite">🍃 Gemini 3.1 Flash-Lite (輕量化・高效率任務)</option>
            </select>
          )}

          {provider === 'claude' && (
            <select
              value={preferredModels.claude || 'claude-sonnet-5-5'}
              onChange={(e) => onModelChange('claude', e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 py-1 px-2.5 text-xs text-slate-800 bg-slate-50/50 font-medium focus:ring-1 focus:ring-sky-500 focus:outline-none"
            >
              <option value="claude-sonnet-5-5">🌟 Claude Sonnet 5.5 (強烈推薦・文學故事首選)</option>
              <option value="claude-opus-5-5">🏛️ Claude Opus 5.5 (頂規深層推理・嚴謹評分規準)</option>
              <option value="claude-haiku-5-5">⚡ Claude Haiku 5.5 (極速回應・隨堂小測驗)</option>
              <option value="claude-fable-5-1">🔬 Claude Fable 5.1 (高難度推理・專題任務)</option>
            </select>
          )}

          {provider === 'openai' && (
            <select
              value={preferredModels.openai || 'gpt-4o-mini'}
              onChange={(e) => onModelChange('openai', e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 py-1 px-2.5 text-xs text-slate-800 bg-slate-50/50 font-medium focus:ring-1 focus:ring-sky-500 focus:outline-none"
            >
              <option value="gpt-4o">🌟 GPT-4o (全能旗艦・說明文標準穩定)</option>
              <option value="gpt-4o-mini">⚡ GPT-4o Mini (強烈推薦・性價比之王)</option>
              <option value="o3-mini">🧠 o3-mini (第四層批判設題嚴謹)</option>
            </select>
          )}

          {provider === 'groq' && (
            <select
              value={preferredModels.groq || 'openai/gpt-oss-120b'}
              onChange={(e) => onModelChange('groq', e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 py-1 px-2.5 text-xs text-slate-800 bg-slate-50/50 font-medium focus:ring-1 focus:ring-sky-500 focus:outline-none"
            >
              <option value="openai/gpt-oss-120b">🏛️ GPT OSS 120B (實測推薦首選・大型推理・繁中最優)</option>
              <option value="llama-3.1-8b-instant">🚀 Llama 3.1 8B Instant (極速輕量・簡單測試)</option>
              <option value="llama-3.3-70b-versatile">🌟 Llama 3.3 70B Versatile (高階旗艦・四層次設題)</option>
              <option value="openai/gpt-oss-20b">⚡ GPT OSS 20B (均衡高吞吐・大量文字處理)</option>
            </select>
          )}

          {provider === 'deepseek' && (
            <select
              value={preferredModels.deepseek || 'deepseek-chat'}
              onChange={(e) => onModelChange('deepseek', e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 py-1 px-2.5 text-xs text-slate-800 bg-slate-50/50 font-medium focus:ring-1 focus:ring-sky-500 focus:outline-none"
            >
              <option value="deepseek-chat">💬 DeepSeek-V3 / Chat (官方標準推薦・高相容・享自癒)</option>
              <option value="deepseek-flash">⚡ DeepSeek V4.1 Flash (新世代極速・支援視覺)</option>
              <option value="deepseek-reasoner">🧠 DeepSeek-R1 / Reasoner (深度推理・批判評斷)</option>
              <option value="deepseek-v4-pro">🏛️ DeepSeek V4 Pro (高階旗艦)</option>
            </select>
          )}

          {provider === 'openrouter' && (
            <select
              value={preferredModels.openrouter || 'deepseek/deepseek-chat'}
              onChange={(e) => onModelChange('openrouter', e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 py-1 px-2.5 text-xs text-slate-800 bg-slate-50/50 font-medium focus:ring-1 focus:ring-sky-500 focus:outline-none"
            >
              <option value="deepseek/deepseek-chat">💬 DeepSeek-V3 (高性價比)</option>
              <option value="openai/gpt-4o-mini">⚡ OpenAI GPT-4o Mini</option>
              <option value="meta-llama/llama-3.3-70b-instruct">🦙 Meta Llama 3.3 70B</option>
            </select>
          )}

          {provider === 'opencode' && (
            <select
              value={preferredModels.opencode || 'deepseek-chat'}
              onChange={(e) => onModelChange('opencode', e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 py-1 px-2.5 text-xs text-slate-800 bg-slate-50/50 font-medium focus:ring-1 focus:ring-sky-500 focus:outline-none"
            >
              <option value="deepseek-chat">💬 DeepSeek-V3</option>
              <option value="gpt-4o">🌟 GPT-4o</option>
              <option value="claude-3-5-sonnet">🏛️ Claude 3.5 Sonnet</option>
            </select>
          )}
        </div>

        {/* 右側：金鑰狀態徽章 */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {hasKey ? (
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>金鑰已就緒 ({currentKey.slice(0, 4)}...{currentKey.slice(-4)})</span>
            </span>
          ) : (
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>未設定金鑰</span>
              </span>
              <Link
                href="/dashboard/teacher/settings/ai?from=create"
                className="text-[11px] font-bold text-sky-600 hover:text-sky-700 hover:underline inline-flex items-center space-x-0.5"
              >
                <span>立即設定 ↗</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
