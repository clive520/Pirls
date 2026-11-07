'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Sparkles, CheckCircle2, AlertCircle, RefreshCw,
  ExternalLink, Key, ShieldCheck, Trash2, Cpu, Check, AlertTriangle
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { AIProvider } from '@/lib/ai/types';

const PROVIDER_METADATA: Record<AIProvider, {
  name: string;
  badge: string;
  color: string;
  keyPrefix: string;
  docUrl: string;
  docLabel: string;
  desc: string;
  models: Array<{ id: string; label: string; desc: string }>;
}> = {
  gemini: {
    name: 'Google Gemini',
    badge: '官方首選',
    color: 'from-blue-600 to-sky-600',
    keyPrefix: 'AIzaSy...',
    docUrl: 'https://aistudio.google.com/app/apikey',
    docLabel: 'Google AI Studio 官網',
    desc: 'Google 官方最新旗艦模型，具備優異的繁體中文理解力與百萬 Context，免費額度充足且出題穩定。',
    models: [
      { id: 'auto', label: '🤖 智慧自動選擇', desc: '自動匹配 Google 官方最新活躍的 Flash 模型' },
      { id: 'gemini-3.8-flash', label: '⚡ Gemini 3.8 Flash (推薦首選)', desc: '新一代主力模型・適合複雜任務與四層次設題' },
      { id: 'gemini-3.7-flash', label: '🧠 Gemini 3.7 Flash', desc: '程式開發・多步驟推理・邏輯嚴密' },
      { id: 'gemini-3.6-flash', label: '🌐 Gemini 3.6 Flash', desc: '一般對話・多模態理解・文意流暢' },
      { id: 'gemini-3.5-flash', label: '🚀 Gemini 3.5 Flash', desc: '一般對話・大量請求・穩定性佳' },
      { id: 'gemini-3.5-flash-lite', label: '💰 Gemini 3.5 Flash-Lite', desc: '低成本・高頻率請求・回應迅速' },
      { id: 'gemini-3.1-flash-lite', label: '🍃 Gemini 3.1 Flash-Lite', desc: '輕量化・高效率任務・低延遲' },
    ],
  },
  claude: {
    name: 'Anthropic Claude',
    badge: '文學首選',
    color: 'from-amber-600 to-orange-600',
    keyPrefix: 'sk-ant-...',
    docUrl: 'https://console.anthropic.com/settings/keys',
    docLabel: 'Anthropic Console 官網',
    desc: '業界公認文學組織力、長篇敘事邏輯與深層批判思維（PIRLS L3/L4）最佳首選。',
    models: [
      { id: 'claude-sonnet-5-5', label: '🌟 Claude Sonnet 5.5 (強烈推薦首選)', desc: '智慧與速度平衡・文學故事與四層次題本最佳旗艦' },
      { id: 'claude-opus-5-5', label: '🏛️ Claude Opus 5.5 (頂規深度推理)', desc: '頂尖推理大腦・適合高難度素養題與嚴密評分規準' },
      { id: 'claude-haiku-5-5', label: '⚡ Claude Haiku 5.5 (極速輕巧)', desc: '快速問答・大量文字處理・隨堂小測驗首選' },
      { id: 'claude-fable-5-1', label: '🔬 Claude Fable 5.1 (高難度推理)', desc: '長時間代理任務・複雜專題命題' },
    ],
  },
  openai: {
    name: 'OpenAI 官方',
    badge: '最普及',
    color: 'from-emerald-600 to-teal-600',
    keyPrefix: 'sk-proj-... / sk-...',
    docUrl: 'https://platform.openai.com/api-keys',
    docLabel: 'OpenAI Platform 官網',
    desc: '國際素養評量標準代表，結構化輸出極其穩定，廣為各大教育評量系統所採用。',
    models: [
      { id: 'gpt-4o', label: '🌟 GPT-4o (全能旗艦)', desc: '科普說明文與四層次設題標準穩定' },
      { id: 'gpt-4o-mini', label: '⚡ GPT-4o Mini (強烈推薦)', desc: '性價比之王、極速低成本、出題邏輯強' },
      { id: 'o3-mini', label: '🧠 o3-mini (深度邏輯)', desc: '第四層批判檢驗與評分規準制定嚴謹' },
    ],
  },
  groq: {
    name: 'Groq 極速晶片',
    badge: '3秒出題',
    color: 'from-rose-600 to-orange-500',
    keyPrefix: 'gsk_...',
    docUrl: 'https://console.groq.com/keys',
    docLabel: 'Groq Cloud Console 官網',
    desc: '採用 LPU 晶片架構，3 秒內瞬間完成 1,200 字文章與全套試題，出題速度最快且免費額度充足。',
    models: [
      { id: 'openai/gpt-oss-120b', label: '🏛️ GPT OSS 120B (實測推薦首選・大型推理)', desc: '實測唯一穩定可用！120B 大型推理模型，131k Context，繁中出題品質與第四層批判評斷設題最優' },
      { id: 'llama-3.1-8b-instant', label: '🚀 Llama 3.1 8B Instant (極速輕量)', desc: '體積較小、反應快速，適合簡單文字測試' },
      { id: 'llama-3.3-70b-versatile', label: '🌟 Llama 3.3 70B Versatile (高階旗艦)', desc: 'Meta 最強開源旗艦，文學敘事流暢、四層次設題邏輯嚴密（若遇限制自動備援切換）' },
      { id: 'openai/gpt-oss-20b', label: '⚡ GPT OSS 20B (均衡高吞吐)', desc: '推論速度快，適合大量文字處理，具備良好中文語境' },
    ],
  },
  deepseek: {
    name: 'DeepSeek 官方',
    badge: '中文精準',
    color: 'from-cyan-600 to-blue-700',
    keyPrefix: 'sk-...',
    docUrl: 'https://platform.deepseek.com/api_keys',
    docLabel: 'DeepSeek 開放平台',
    desc: '頂尖中文推論模型，中文成語、俗諺與兒童語境掌握到位，性價比極高（採預儲值收費制）。',
    models: [
      { id: 'deepseek-chat', label: '💬 DeepSeek-V3 / Chat (官方標準推薦・穩定高相容)', desc: '官方全功能主力模型，支援非思考流、成語典故地道、100% 廣泛相容' },
      { id: 'deepseek-flash', label: '⚡ DeepSeek V4.1 Flash (新世代極速)', desc: '新世代架構・支援文字、視覺與推理（享自動降級自癒相容）' },
      { id: 'deepseek-reasoner', label: '🧠 DeepSeek-R1 / Reasoner (深度思維推理)', desc: '專攻思維鏈 CoT 深度推理，適合第四層次批判評斷與客觀評分規準' },
      { id: 'deepseek-v4-pro', label: '🏛️ DeepSeek V4 Pro (高階旗艦)', desc: '高階旗艦推理模型' },
    ],
  },
  openrouter: {
    name: 'OpenRouter 聚合',
    badge: '一鍵通吃',
    color: 'from-violet-600 to-indigo-600',
    keyPrefix: 'sk-or-v1-...',
    docUrl: 'https://openrouter.ai/keys',
    docLabel: 'OpenRouter 官網',
    desc: '全球模型聚合網關，僅需一把 API Key 即可自由切換全球各廠商的最新大模型。',
    models: [
      { id: 'deepseek/deepseek-chat', label: '💬 DeepSeek-V3', desc: '高性價比與優良中文' },
      { id: 'openai/gpt-4o-mini', label: '⚡ OpenAI GPT-4o Mini', desc: '國際標準輕量模型' },
      { id: 'meta-llama/llama-3.3-70b-instruct', label: '🦙 Meta Llama 3.3 70B', desc: '開源頂級旗艦模型' },
    ],
  },
  opencode: {
    name: '自建 / OpenCode GO',
    badge: '自訂端點',
    color: 'from-slate-700 to-zinc-800',
    keyPrefix: '自建伺服器 Key',
    docUrl: 'https://opencode.ai',
    docLabel: 'OpenCode 官網',
    desc: '支援自訂 OpenAI 相容的 API 網關端點（Base URL），適合校園內部私有雲或自建推論伺服器。',
    models: [
      { id: 'deepseek-chat', label: '💬 DeepSeek-V3', desc: '自建或轉發端點預設模型' },
      { id: 'gpt-4o', label: '🌟 GPT-4o', desc: '轉發端點 GPT-4o 模型' },
      { id: 'claude-3-5-sonnet', label: '🏛️ Claude 3.5 Sonnet', desc: '轉發端點 Claude 模型' },
    ],
  },
};

function AiSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from');

  const [provider, setProvider] = useState<AIProvider>('gemini');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    gemini: '',
    claude: '',
    openai: '',
    groq: '',
    deepseek: '',
    openrouter: '',
    opencode: '',
  });
  const [preferredModels, setPreferredModels] = useState<Record<string, string>>({
    gemini: 'auto',
    claude: 'claude-sonnet-5-5',
    openai: 'gpt-4o-mini',
    groq: 'openai/gpt-oss-120b',
    deepseek: 'deepseek-chat',
    openrouter: 'deepseek/deepseek-chat',
    opencode: 'deepseek-chat',
  });
  const [customBaseUrl, setCustomBaseUrl] = useState('https://api.opencode.ai/v1');

  const [keyChecking, setKeyChecking] = useState(false);
  const [keyStatus, setKeyStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [saveToast, setSaveToast] = useState(false);

  // 頁面載入時從 localStorage 讀取
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pirls_ai_vault');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.provider) setProvider(parsed.provider);
        if (parsed.apiKeys) setApiKeys(parsed.apiKeys);
        if (parsed.preferredModels) {
          const models = { ...parsed.preferredModels };
          // 自動清洗錯誤儲存的 TTS / 語音實驗模型
          if (models.gemini && (models.gemini.includes('tts') || models.gemini.includes('audio') || models.gemini.includes('embed'))) {
            models.gemini = 'auto';
          }
          if (models.groq && models.groq !== 'openai/gpt-oss-120b') {
            models.groq = 'openai/gpt-oss-120b';
          }
          if (models.claude && (models.claude.includes('3-5') || models.claude.includes('4-5') || models.claude === 'claude-3-opus-20240229')) {
            models.claude = 'claude-sonnet-5-5';
          }
          setPreferredModels(models);
        }
        if (parsed.customBaseUrl) setCustomBaseUrl(parsed.customBaseUrl);
      }
    } catch (e) {
      console.warn('讀取本地金鑰失敗', e);
    }
  }, []);

  // 持久化儲存
  const persistVault = (
    newProvider: AIProvider,
    newKeys: Record<string, string>,
    newModels: Record<string, string>,
    newBaseUrl: string
  ) => {
    try {
      localStorage.setItem(
        'pirls_ai_vault',
        JSON.stringify({
          provider: newProvider,
          apiKeys: newKeys,
          preferredModels: newModels,
          customBaseUrl: newBaseUrl,
        })
      );
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2000);
    } catch (e) {
      console.warn('寫入本地金鑰失敗', e);
    }
  };

  const handleKeyChange = (prov: AIProvider, val: string) => {
    const trimmed = val.trim();

    // 智慧前綴辨識
    if (trimmed.startsWith('sk-ant-') && prov !== 'claude') {
      const updated = { ...apiKeys, claude: trimmed };
      setApiKeys(updated);
      setProvider('claude');
      setKeyStatus({ ok: true, message: '💡 偵測到 Anthropic Claude 專屬金鑰 (sk-ant-...)，已自動切換至 Claude！' });
      persistVault('claude', updated, preferredModels, customBaseUrl);
      return;
    }
    if (trimmed.startsWith('gsk_') && prov !== 'groq') {
      const updated = { ...apiKeys, groq: trimmed };
      setApiKeys(updated);
      setProvider('groq');
      setKeyStatus({ ok: true, message: '💡 偵測到 Groq 專屬金鑰 (gsk_...)，已自動切換至 Groq 極速晶片！' });
      persistVault('groq', updated, preferredModels, customBaseUrl);
      return;
    }
    if (trimmed.startsWith('sk-proj-') && prov !== 'openai') {
      const updated = { ...apiKeys, openai: trimmed };
      setApiKeys(updated);
      setProvider('openai');
      setKeyStatus({ ok: true, message: '💡 偵測到 OpenAI 專案金鑰 (sk-proj-...)，已自動切換至 OpenAI 官方！' });
      persistVault('openai', updated, preferredModels, customBaseUrl);
      return;
    }
    if (trimmed.startsWith('sk-or-v1-') && prov !== 'openrouter') {
      const updated = { ...apiKeys, openrouter: trimmed };
      setApiKeys(updated);
      setProvider('openrouter');
      setKeyStatus({ ok: true, message: '💡 偵測到 OpenRouter 專屬金鑰 (sk-or-v1-...)，已自動切換至 OpenRouter！' });
      persistVault('openrouter', updated, preferredModels, customBaseUrl);
      return;
    }
    if (trimmed.startsWith('AIzaSy') && prov !== 'gemini') {
      const updated = { ...apiKeys, gemini: trimmed };
      setApiKeys(updated);
      setProvider('gemini');
      setKeyStatus({ ok: true, message: '💡 偵測到 Google AI Studio 金鑰 (AIzaSy...)，已自動切換至 Google Gemini！' });
      persistVault('gemini', updated, preferredModels, customBaseUrl);
      return;
    }

    const updated = { ...apiKeys, [prov]: val };
    setApiKeys(updated);
    setKeyStatus(null);
    persistVault(provider, updated, preferredModels, customBaseUrl);
  };

  const handleModelChange = (prov: string, val: string) => {
    const updated = { ...preferredModels, [prov]: val };
    setPreferredModels(updated);
    setKeyStatus(null);
    persistVault(provider, apiKeys, updated, customBaseUrl);
  };

  const handleBaseUrlChange = (val: string) => {
    setCustomBaseUrl(val);
    setKeyStatus(null);
    persistVault(provider, apiKeys, preferredModels, val);
  };

  const handleSelectProvider = (p: AIProvider) => {
    setProvider(p);
    setKeyStatus(null);
    persistVault(p, apiKeys, preferredModels, customBaseUrl);
  };

  // 驗證金鑰
  const handleVerifyKey = async () => {
    const currentKey = (apiKeys[provider] || '').trim();
    if (!currentKey) {
      setKeyStatus({ ok: false, message: `請先輸入 ${PROVIDER_METADATA[provider].name} API Key` });
      return;
    }

    setKeyChecking(true);
    setKeyStatus(null);

    try {
      const data = await api.ai.verifyKey({
        provider,
        apiKey: currentKey,
        customBaseUrl,
        model: preferredModels[provider] || 'auto',
      });
      setKeyStatus({ ok: data.ok, message: data.message });
    } catch (err: any) {
      setKeyStatus({ ok: false, message: err.message || '連線逾時，無法驗證金鑰' });
    } finally {
      setKeyChecking(false);
    }
  };

  // 清除快取
  const handleClearAllKeys = () => {
    if (confirm('確定要清除此瀏覽器暫存的所有 AI 金鑰嗎？\n清除後若需使用 AI 命題需重新填入。')) {
      const empty: Record<string, string> = {
        gemini: '',
        claude: '',
        openai: '',
        groq: '',
        deepseek: '',
        openrouter: '',
        opencode: '',
      };
      setApiKeys(empty);
      localStorage.removeItem('pirls_ai_vault');
      setKeyStatus(null);
      alert('已成功清空此瀏覽器的所有 AI 金鑰暫存！');
    }
  };

  const currentMeta = PROVIDER_METADATA[provider];
  const configuredCount = Object.values(apiKeys).filter((k) => k && k.trim()).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* 頂部導覽列 */}
      <header className="bg-white border-b sticky top-0 z-20 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => {
                if (from === 'create') router.push('/dashboard/teacher/create');
                else router.push('/dashboard/teacher');
              }}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition inline-flex items-center space-x-1 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{from === 'create' ? '返回出題頁面' : '返回工作台'}</span>
            </button>
            <div className="h-5 w-px bg-slate-200" />
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-xs">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900">AI 命題大腦與 API Key 設定中心</h1>
                <p className="text-[11px] text-slate-500">獨立管理各家 AI 模型憑證，全站自動即時生效</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {saveToast && (
              <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 animate-fade-in flex items-center space-x-1">
                <Check className="w-3.5 h-3.5" />
                <span>已自動儲存至本機</span>
              </span>
            )}
            <Link
              href="/dashboard/teacher/create"
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white text-xs font-bold shadow-sm hover:from-sky-700 hover:to-indigo-700 transition flex items-center space-x-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>前往出題</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 主體設定區 */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* 狀態總覽橫幅 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-md flex-shrink-0">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900">AI 提供商憑證管理</h2>
                <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                  已就緒 {configuredCount} / {Object.keys(PROVIDER_METADATA).length} 家
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                在此設定好的 API Key 會自動記憶於此瀏覽器，前往出題時即可直接挑選使用，無需重複輸入。
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleClearAllKeys}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-3 py-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 transition flex items-center space-x-1"
              title="清除本機瀏覽器所有金鑰"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>清空所有暫存</span>
            </button>
          </div>
        </div>

        {/* 提供商選擇卡片列 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {(Object.keys(PROVIDER_METADATA) as AIProvider[]).map((pKey) => {
            const meta = PROVIDER_METADATA[pKey];
            const isSelected = provider === pKey;
            const hasKey = Boolean((apiKeys[pKey] || '').trim());

            return (
              <button
                key={pKey}
                type="button"
                onClick={() => handleSelectProvider(pKey)}
                className={`p-3 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-white border-sky-500 shadow-md ring-2 ring-sky-500/20'
                    : 'bg-white hover:bg-slate-50 border-slate-200 shadow-2xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {meta.badge}
                    </span>
                    {hasKey ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" title="已設定金鑰" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-300" title="未設定金鑰" />
                    )}
                  </div>
                  <div className="text-xs font-bold text-slate-800 leading-snug">
                    {meta.name}
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-slate-400 font-mono truncate">
                  {hasKey ? '● 已就緒' : '未設定'}
                </div>
              </button>
            );
          })}
        </div>

        {/* 主設定面板 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          {/* 面板標頭 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className={`w-3 h-3 rounded-full bg-gradient-to-r ${currentMeta.color}`} />
                <h3 className="text-base font-bold text-slate-900">{currentMeta.name} 設定</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {currentMeta.badge}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-2xl">
                {currentMeta.desc}
              </p>
            </div>

            <a
              href={currentMeta.docUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold inline-flex items-center space-x-1.5 transition flex-shrink-0 self-start sm:self-auto"
            >
              <span>前往 {currentMeta.docLabel} 申請金鑰</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* API Key 輸入欄位 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5 text-slate-500" />
                <span>{currentMeta.name} API Key</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                前綴格式範例：{currentMeta.keyPrefix}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="password"
                value={apiKeys[provider] || ''}
                onChange={(e) => handleKeyChange(provider, e.target.value)}
                placeholder={`在此貼上您的 ${currentMeta.name} API Key...`}
                className="flex-1 block w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none bg-slate-50/50"
              />
              <button
                type="button"
                onClick={handleVerifyKey}
                disabled={keyChecking || !(apiKeys[provider] || '').trim()}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center space-x-1.5 transition disabled:opacity-50 flex-shrink-0 border border-slate-300 shadow-2xs"
              >
                {keyChecking ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600" />
                    <span>測試連線中...</span>
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

          {/* 自訂 Base URL (OpenCode) */}
          {provider === 'opencode' && (
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700">
                API 網關端點 (Base URL)
              </label>
              <input
                type="text"
                value={customBaseUrl}
                onChange={(e) => handleBaseUrlChange(e.target.value)}
                placeholder="https://api.opencode.ai/v1"
                className="block w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400">
                支援自建 vLLM、Ollama、OneAPI 或校園私有雲轉發網關。
              </p>
            </div>
          )}

          {/* 預設模型偏好 */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700">
              預設偏好模型版本
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {currentMeta.models.map((m) => {
                const isModelSelected = (preferredModels[provider] || currentMeta.models[0].id) === m.id;

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleModelChange(provider, m.id)}
                    className={`p-3 rounded-xl border text-left transition ${
                      isModelSelected
                        ? 'bg-sky-50/70 border-sky-400 shadow-xs ring-1 ring-sky-400'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>{m.label}</span>
                      {isModelSelected && <Check className="w-3.5 h-3.5 text-sky-600" />}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 leading-snug">
                      {m.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 驗證回饋提示 */}
          {keyStatus && (
            <div
              className={`p-4 rounded-xl text-xs flex items-start space-x-2.5 ${
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
              <div className="font-medium leading-relaxed break-all">
                {keyStatus.message}
              </div>
            </div>
          )}

          {/* 各大 AI 官方申請入口與特性速查 */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="font-bold text-xs text-slate-800 flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>各大 AI 官方 API Key 申請入口與特性速查：</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs text-slate-600">
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between hover:bg-sky-50/40 transition">
                <div>
                  <span className="font-bold text-slate-800">• Google Gemini</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">有免費額度・官方首選</span>
                </div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline inline-flex items-center space-x-1 whitespace-nowrap ml-2"
                >
                  <span>AI Studio 官網</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between hover:bg-amber-50/40 transition">
                <div>
                  <span className="font-bold text-slate-800">• Anthropic Claude</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">文學敘事・批判思考首選</span>
                </div>
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline inline-flex items-center space-x-1 whitespace-nowrap ml-2"
                >
                  <span>Anthropic Console</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between hover:bg-emerald-50/40 transition">
                <div>
                  <span className="font-bold text-slate-800">• OpenAI 官方</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">全球普及・標準穩定</span>
                </div>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline inline-flex items-center space-x-1 whitespace-nowrap ml-2"
                >
                  <span>OpenAI Platform</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between hover:bg-rose-50/40 transition">
                <div>
                  <span className="font-bold text-slate-800">• Groq 極速晶片</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">3秒出題・有免費額度</span>
                </div>
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline inline-flex items-center space-x-1 whitespace-nowrap ml-2"
                >
                  <span>Groq Console</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between hover:bg-cyan-50/40 transition">
                <div>
                  <span className="font-bold text-slate-800">• DeepSeek 官方</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">中文精準・高性價比</span>
                </div>
                <a
                  href="https://platform.deepseek.com/api_keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 hover:underline inline-flex items-center space-x-1 whitespace-nowrap ml-2"
                >
                  <span>DeepSeek 開放平台</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between hover:bg-indigo-50/40 transition">
                <div>
                  <span className="font-bold text-slate-800">• OpenRouter 聚合</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">一把 Key 通吃全球百模</span>
                </div>
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline inline-flex items-center space-x-1 whitespace-nowrap ml-2"
                >
                  <span>OpenRouter 官網</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>
            </div>
          </div>

          {/* 隱私與安全說明 */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-start space-x-3 text-xs text-slate-600">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-slate-800">零信任安全隱私架構承諾</div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                本系統嚴格遵循零信任原則：您在此輸入的所有 API Key <strong>100% 僅儲存在您個人的瀏覽器 LocalStorage 記憶庫中</strong>。在出題調用 AI 時，金鑰隨請求經由加密連線轉發至各家官方模型伺服器，後端絕不會將您的金鑰儲存於任何中央資料庫。您可以隨時點擊「清空所有暫存」以移除所有本機憑證。
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-slate-400 border-t bg-white">
        PIRLS 智慧閱讀素養評量平臺 • 教師 AI 設定中心
      </footer>
    </div>
  );
}

export default function AiSettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-500">載入設定中心中...</div>}>
      <AiSettingsContent />
    </Suspense>
  );
}
