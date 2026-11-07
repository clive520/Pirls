import React from 'react';
import { Sparkles, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { AiConfigCard } from './AiConfigCard';

interface CreateFormStepProps {
  mode: 'theme' | 'paste';
  setMode: (m: 'theme' | 'paste') => void;
  theme: string;
  setTheme: (t: string) => void;
  textType: 'literary' | 'informational';
  setTextType: (t: 'literary' | 'informational') => void;
  targetGrade: number;
  setTargetGrade: (g: number) => void;
  pastedTitle: string;
  setPastedTitle: (t: string) => void;
  pastedText: string;
  setPastedText: (t: string) => void;
  questionCountMode: 'standard' | 'compact';
  setQuestionCountMode: (m: 'standard' | 'compact') => void;
  includeDiagram: boolean;
  setIncludeDiagram: (b: boolean) => void;
  loading: boolean;
  errorMsg: string;
  onSubmit: (e: React.FormEvent) => void;
  // AI Config
  provider: 'gemini' | 'openrouter' | 'deepseek' | 'opencode';
  setProvider: (p: 'gemini' | 'openrouter' | 'deepseek' | 'opencode') => void;
  apiKeys: { [key: string]: string };
  onKeyChange: (prov: string, val: string) => void;
  customBaseUrl: string;
  onBaseUrlChange: (val: string) => void;
  preferredModels: { [key: string]: string };
  onModelChange: (prov: string, val: string) => void;
  keyChecking: boolean;
  keyStatus: { ok: boolean; message: string } | null;
  onVerifyKey: () => void;
  onClearKeys: () => void;
}

export const CreateFormStep: React.FC<CreateFormStepProps> = ({
  mode,
  setMode,
  theme,
  setTheme,
  textType,
  setTextType,
  targetGrade,
  setTargetGrade,
  pastedTitle,
  setPastedTitle,
  pastedText,
  setPastedText,
  questionCountMode,
  setQuestionCountMode,
  includeDiagram,
  setIncludeDiagram,
  loading,
  errorMsg,
  onSubmit,
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
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-slate-900">打造高品質 PIRLS 素養考卷</h2>
        <p className="text-sm text-slate-600">
          可選擇「AI 主題自動寫文出題」或「貼上既有課文/科普文章」，系統將提煉完整題本與給分規準。
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start space-x-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-red-900">AI 命題生成未成功</p>
            <p className="text-xs text-red-700 leading-relaxed break-all">{errorMsg}</p>
            <p className="text-[11px] text-red-600">
              💡 提醒：請在下方「AI 模型與 API Key 設定」中貼上您的金鑰，並可點擊「測試金鑰有效性」確認額度與連線狀態。
            </p>
          </div>
        </div>
      )}

      {/* 模式切換 Tabs */}
      <div className="grid grid-cols-2 p-1.5 bg-slate-200/70 rounded-2xl">
        <button
          type="button"
          onClick={() => setMode('theme')}
          className={`py-3 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition ${
            mode === 'theme' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>模式 A：AI 主題自動生文出題</span>
        </button>
        <button
          type="button"
          onClick={() => setMode('paste')}
          className={`py-3 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition ${
            mode === 'paste' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>模式 B：貼上自選課文/文章</span>
        </button>
      </div>

      <form onSubmit={onSubmit} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        {mode === 'theme' ? (
          /* 模式 A 欄位 */
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700">文章主題或核心思想</label>
              <input
                type="text"
                required
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="例：台灣黑熊保育、面對挫折的勇氣、友誼與理解"
                className="mt-1 block w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">文體類別</label>
                <select
                  value={textType}
                  onChange={(e) => setTextType(e.target.value as any)}
                  className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-sky-500 bg-white"
                >
                  <option value="literary">文學性體驗（故事敘事、童話冒險、寓言）</option>
                  <option value="informational">訊息性文本（自然科普、生態、實用說明文）</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">目標年級</label>
                <select
                  value={targetGrade}
                  onChange={(e) => setTargetGrade(parseInt(e.target.value, 10))}
                  className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-sky-500 bg-white"
                >
                  <option value={3}>國小三年級</option>
                  <option value={4}>國小四年級 (PIRLS 國際官方基準)</option>
                  <option value={5}>國小五年級</option>
                  <option value={6}>國小六年級</option>
                </select>
              </div>
            </div>
          </div>
        ) : (
          /* 模式 B 欄位 */
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700">文章標題</label>
              <input
                type="text"
                required
                value={pastedTitle}
                onChange={(e) => setPastedTitle(e.target.value)}
                placeholder="例：國語課文第十課《落花生》"
                className="mt-1 block w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-slate-700">自選文章正文 (建議 800~1,200 字)</label>
                <span className="text-xs text-slate-400">目前字數：{pastedText.length} 字</span>
              </div>
              <textarea
                required
                rows={8}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="請直接貼上文章內文..."
                className="mt-1 block w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">文體類別</label>
                <select
                  value={textType}
                  onChange={(e) => setTextType(e.target.value as any)}
                  className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-sky-500 bg-white"
                >
                  <option value="literary">文學性文本</option>
                  <option value="informational">訊息性文本</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">適用年級</label>
                <select
                  value={targetGrade}
                  onChange={(e) => setTargetGrade(parseInt(e.target.value, 10))}
                  className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-sky-500 bg-white"
                >
                  <option value={3}>國小三年級</option>
                  <option value={4}>國小四年級</option>
                  <option value={5}>國小五年級</option>
                  <option value={6}>國小六年級</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* 題量與圖文高階選項 */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700">題本規模規格</label>
              <select
                value={questionCountMode}
                onChange={(e) => setQuestionCountMode(e.target.value as any)}
                className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-sky-500 bg-white"
              >
                <option value="standard">PIRLS 官方正式題本規格 (12~14 題，含多題型與 1/2/3 階梯配分)</option>
                <option value="compact">課堂隨堂快測規格 (8 題，適合 15 分鐘小測)</option>
              </select>
            </div>

            <div className="flex items-center pt-5">
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDiagram}
                  onChange={(e) => setIncludeDiagram(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-4 h-4"
                />
                <span className="ml-2 text-xs font-bold text-slate-700">
                  🎨 生成多模態配圖需求（AI 自動為文章構思生圖提示詞，供複製生圖並上傳）
                </span>
              </label>
            </div>
          </div>

          {/* 多 AI 介面與金鑰記憶設定區 */}
          <AiConfigCard
            provider={provider}
            setProvider={setProvider}
            apiKeys={apiKeys}
            onKeyChange={onKeyChange}
            customBaseUrl={customBaseUrl}
            onBaseUrlChange={onBaseUrlChange}
            preferredModels={preferredModels}
            onModelChange={onModelChange}
            keyChecking={keyChecking}
            keyStatus={keyStatus}
            onVerifyKey={onVerifyKey}
            onClearKeys={onClearKeys}
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold text-base shadow-lg shadow-sky-500/20 transition flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>PIRLS 專家大腦正在提煉文章與四層次試題中...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>開始生成 PIRLS 題本</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
