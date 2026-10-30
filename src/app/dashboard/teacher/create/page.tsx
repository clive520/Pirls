'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen, Sparkles, FileText, ArrowLeft, CheckCircle2,
  RefreshCw, PlusCircle, Trash2, Save, Send, Image as ImageIcon,
  BarChart, AlertCircle, Copy, Upload, Palette
} from 'lucide-react';
import { TestPaper, TestQuestion, CognitiveProcess, ArticleIllustration } from '@/lib/types';
import { generateSmartImagePrompts, formatCombinedImagePrompt } from '@/lib/llm-adapter';

export default function TeacherCreateTestPage() {
  const router = useRouter();

  // 步驟控制：'input' | 'editor'
  const [step, setStep] = useState<'input' | 'editor'>('input');
  const [mode, setMode] = useState<'theme' | 'paste'>('theme');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 模式 A: 主題生成欄位
  const [theme, setTheme] = useState('動物保護與勇氣');
  const [targetGrade, setTargetGrade] = useState(4);
  const [textType, setTextType] = useState<'literary' | 'informational'>('literary');
  const [questionCountMode, setQuestionCountMode] = useState<'standard' | 'compact'>('standard');
  const [includeDiagram, setIncludeDiagram] = useState(true);
  // 多 AI 提供商與金鑰本地記憶庫
  const [provider, setProvider] = useState<'gemini' | 'openrouter' | 'deepseek' | 'opencode'>('gemini');
  const [apiKeys, setApiKeys] = useState<{ [key: string]: string }>({
    gemini: '',
    openrouter: '',
    deepseek: '',
    opencode: '',
  });
  const [customBaseUrl, setCustomBaseUrl] = useState('https://api.opencode.ai/v1');
  const [preferredModels, setPreferredModels] = useState<{ [key: string]: string }>({
    gemini: 'auto',
    openrouter: 'deepseek/deepseek-chat',
    deepseek: 'deepseek-flash',
    opencode: 'deepseek-chat',
  });
  const [keyChecking, setKeyChecking] = useState(false);
  const [keyStatus, setKeyStatus] = useState<{ ok: boolean; message: string } | null>(null);

  // 頁面載入時自動從 localStorage 讀取已存金鑰
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('pirls_ai_vault');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.provider) setProvider(parsed.provider);
        if (parsed.apiKeys) setApiKeys(parsed.apiKeys);
        if (parsed.customBaseUrl) setCustomBaseUrl(parsed.customBaseUrl);
        if (parsed.preferredModels) setPreferredModels(parsed.preferredModels);
      }
    } catch (e) {
      console.warn('讀取本地金鑰失敗', e);
    }
  }, []);

  // 更新設定並持久化儲存至瀏覽器 localStorage
  const saveVault = (
    newProvider: 'gemini' | 'openrouter' | 'deepseek' | 'opencode',
    newKeys: { [key: string]: string },
    newBaseUrl: string,
    newModels: { [key: string]: string }
  ) => {
    try {
      localStorage.setItem(
        'pirls_ai_vault',
        JSON.stringify({
          provider: newProvider,
          apiKeys: newKeys,
          customBaseUrl: newBaseUrl,
          preferredModels: newModels,
        })
      );
    } catch (e) {
      console.warn('寫入本地金鑰失敗', e);
    }
  };

  const handleKeyChange = (prov: string, val: string) => {
    const trimmed = val.trim();
    // 智慧金鑰格式辨識與自動切換（若非 openrouter 標籤貼入 sk-or-v1- 開頭，自動切換至 openrouter）
    if (trimmed.startsWith('sk-or-v1-') && prov !== 'openrouter') {
      const updated = { ...apiKeys, openrouter: trimmed };
      setApiKeys(updated);
      setProvider('openrouter');
      setKeyStatus({ ok: true, message: '💡 偵測到 OpenRouter 專屬金鑰 (sk-or-v1-...)，已自動切換至「OpenRouter」提供商！' });
      saveVault('openrouter', updated, customBaseUrl, preferredModels);
      return;
    }

    const updated = { ...apiKeys, [prov]: val };
    setApiKeys(updated);
    setKeyStatus(null);
    saveVault(provider, updated, customBaseUrl, preferredModels);
  };

  const handleModelChange = (prov: string, val: string) => {
    const updated = { ...preferredModels, [prov]: val };
    setPreferredModels(updated);
    setKeyStatus(null);
    saveVault(provider, apiKeys, customBaseUrl, updated);
  };

  const handleBaseUrlChange = (val: string) => {
    setCustomBaseUrl(val);
    setKeyStatus(null);
    saveVault(provider, apiKeys, val, preferredModels);
  };

  const handleProviderChange = (p: 'gemini' | 'openrouter' | 'deepseek' | 'opencode') => {
    setProvider(p);
    setKeyStatus(null);
    saveVault(p, apiKeys, customBaseUrl, preferredModels);
  };

  const handleClearKeys = () => {
    if (confirm('確定要清除此瀏覽器暫存的所有 AI 金鑰設定嗎？')) {
      const emptyKeys = { gemini: '', openrouter: '', deepseek: '', opencode: '' };
      setApiKeys(emptyKeys);
      localStorage.removeItem('pirls_ai_vault');
      setKeyStatus(null);
      alert('已成功清除瀏覽器金鑰暫存');
    }
  };

  // 驗證當前提供商的 API Key
  const handleVerifyKey = async () => {
    const currentKey = (apiKeys[provider] || '').trim();
    if (!currentKey) {
      setKeyStatus({ ok: false, message: `請先輸入 ${provider.toUpperCase()} API Key` });
      return;
    }
    setKeyChecking(true);
    setKeyStatus(null);
    try {
      const res = await fetch('/api/ai/verify-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey: currentKey,
          customBaseUrl,
          preferredModel: preferredModels[provider] || 'auto',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setKeyStatus({ ok: true, message: data.message });
      } else {
        setKeyStatus({ ok: false, message: data.error || '金鑰驗證失敗' });
      }
    } catch (err: any) {
      setKeyStatus({ ok: false, message: err.message || '連線逾時，無法驗證金鑰' });
    } finally {
      setKeyChecking(false);
    }
  };

  // 多幅場景與生圖提示詞控制狀態
  const [activeSceneIdx, setActiveSceneIdx] = useState(0);
  const [copiedCombined, setCopiedCombined] = useState(false);
  const [copiedSingle, setCopiedSingle] = useState(false);

  // 客戶端圖片無損等比輕量壓縮（縮小至 1000px 以內，產出高品質約 80KB JPEG Data URL）
  const compressAndLoadImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxWidth = 1000;
          const maxHeight = 1000;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 一鍵複製全套整合提示詞（一段提示詞包含所有分開的圖片指令）
  const handleCopyCombinedPrompt = () => {
    if (!testPaper || !testPaper.illustrations || testPaper.illustrations.length === 0) return;
    const combined = formatCombinedImagePrompt(testPaper.illustrations, testPaper.title);
    navigator.clipboard.writeText(combined);
    setCopiedCombined(true);
    setTimeout(() => setCopiedCombined(false), 2500);
  };

  // 單獨複製某一幅場景之提示詞
  const handleCopySinglePrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSingle(true);
    setTimeout(() => setCopiedSingle(false), 2500);
  };

  // 老師手動增加一幅插圖場景
  const handleAddScene = () => {
    if (!testPaper) return;
    const currentList = testPaper.illustrations || [];
    const newIdx = currentList.length + 1;
    const isLit = testPaper.textType === 'literary';
    const newIll: ArticleIllustration = {
      id: `ill_scene_${newIdx}_${Date.now()}`,
      paragraphNumber: Math.min(newIdx, testPaper.paragraphs?.length || 1),
      caption: `圖 ${newIdx}：【自訂場景 ${newIdx}】《${testPaper.title}》插圖`,
      type: 'illustration_url',
      imageUrl: '',
      imagePrompt: `【自訂場景 ${newIdx} 中文生圖描述 - 適用 ChatGPT / DALL-E 3 / Bing 繪圖】：
繪製國小 ${testPaper.targetGrade || 4} 年級課文《${testPaper.title}》的補充情境插圖。
畫面描述：請在此描述故事精彩情節或場景特徵。
畫面風格：溫馨細膩的台灣國小兒童繪本水彩手繪插畫風格、柔和溫暖光影、橫向 16:9 構圖，畫面無任何文字或浮水印。

【英文指令 - 適用 Midjourney / Recraft 複製貼上】：
A masterwork children storybook watercolor illustration for "${testPaper.title}", Scene ${newIdx}. Wholesome, gentle warm lighting, highly detailed storybook art style --ar 16:9`,
    };
    const updated = [...currentList, newIll];
    setTestPaper({
      ...testPaper,
      illustrations: updated,
    });
    setActiveSceneIdx(updated.length - 1);
  };

  // 老師刪除指定場景
  const handleRemoveScene = (idxToRemove: number) => {
    if (!testPaper || !testPaper.illustrations) return;
    if (testPaper.illustrations.length <= 1) {
      if (!confirm('這是目前唯一的插圖場景，確定要移除嗎？')) return;
    } else {
      if (!confirm(`確定要刪除「第 ${idxToRemove + 1} 幅插圖場景」嗎？`)) return;
    }
    const updated = testPaper.illustrations.filter((_, idx) => idx !== idxToRemove);
    setTestPaper({
      ...testPaper,
      illustrations: updated,
    });
    setActiveSceneIdx((prev) => Math.max(0, Math.min(prev, updated.length - 1)));
  };

  // 調整插圖關聯之段落
  const handleParagraphChange = (pNum: number, illIdx: number) => {
    if (!testPaper || !testPaper.illustrations) return;
    const updated = [...testPaper.illustrations];
    if (updated[illIdx]) {
      updated[illIdx] = {
        ...updated[illIdx],
        paragraphNumber: pNum,
      };
      setTestPaper({
        ...testPaper,
        illustrations: updated,
      });
    }
  };

  // 上傳圖片
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, illIdx = 0) => {
    const file = e.target.files?.[0];
    if (!file || !testPaper) return;

    try {
      const dataUrl = await compressAndLoadImage(file);
      const updatedIllustrations = [...(testPaper.illustrations || [])];
      if (updatedIllustrations[illIdx]) {
        updatedIllustrations[illIdx] = {
          ...updatedIllustrations[illIdx],
          imageUrl: dataUrl,
          type: 'illustration_url',
        };
      }
      setTestPaper({
        ...testPaper,
        illustrations: updatedIllustrations,
      });
    } catch (err) {
      console.error('圖片處理失敗', err);
      alert('圖片讀取或壓縮失敗，請重新嘗試');
    }
  };

  // 剪貼簿 Ctrl+V 直接貼上圖片支援
  const handlePasteImage = async (e: React.ClipboardEvent, illIdx: number) => {
    const items = e.clipboardData?.items;
    if (!items || !testPaper) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          try {
            const dataUrl = await compressAndLoadImage(file);
            const updated = [...(testPaper.illustrations || [])];
            if (updated[illIdx]) {
              updated[illIdx] = {
                ...updated[illIdx],
                imageUrl: dataUrl,
                type: 'illustration_url',
              };
              setTestPaper({ ...testPaper, illustrations: updated });
            }
          } catch (err) {
            console.error('貼上圖片失敗', err);
          }
          break;
        }
      }
    }
  };

  // 移除圖片 (保留場景與提示詞，僅清空圖檔)
  const handleRemoveImage = (illIdx = 0) => {
    if (!testPaper) return;
    const updatedIllustrations = [...(testPaper.illustrations || [])];
    if (updatedIllustrations[illIdx]) {
      updatedIllustrations[illIdx] = {
        ...updatedIllustrations[illIdx],
        imageUrl: '',
      };
      setTestPaper({
        ...testPaper,
        illustrations: updatedIllustrations,
      });
    }
  };

  // 修改圖說標題
  const handleCaptionChange = (val: string, illIdx = 0) => {
    if (!testPaper) return;
    const updatedIllustrations = [...(testPaper.illustrations || [])];
    if (updatedIllustrations[illIdx]) {
      updatedIllustrations[illIdx] = {
        ...updatedIllustrations[illIdx],
        caption: val,
      };
      setTestPaper({
        ...testPaper,
        illustrations: updatedIllustrations,
      });
    }
  };

  // 為貼入文章一鍵生成 3 幅標準場景生圖提示詞
  const handleGenerateScenesForPasted = () => {
    if (!testPaper) return;
    const isLit = testPaper.textType === 'literary';
    const defaultScenes = generateSmartImagePrompts(
      testPaper.title || '自選閱讀材料',
      testPaper.themeSummary || '課文情境與核心素養',
      isLit,
      testPaper.targetGrade || 4
    );
    setTestPaper({
      ...testPaper,
      illustrations: defaultScenes,
    });
    setActiveSceneIdx(0);
  };

  // 模式 B: 貼入文本欄位
  const [pastedTitle, setPastedTitle] = useState('');
  const [pastedText, setPastedText] = useState('');

  // 產出試卷狀態 (供人機協同微調)
  const [testPaper, setTestPaper] = useState<TestPaper | null>(null);
  const [activeTab, setActiveTab] = useState<'article' | 'questions'>('questions');

  // 送出生成
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const currentKey = (apiKeys[provider] || '').trim();
      const res = await fetch('/api/ai/generate-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          theme,
          pastedTitle,
          pastedText,
          targetGrade,
          textType,
          questionCountMode,
          includeDiagram,
          provider,
          apiKey: currentKey || undefined,
          customBaseUrl: customBaseUrl.trim() || undefined,
          preferredModel: preferredModels[provider] || 'auto',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || '生成試卷失敗');

      setTestPaper(data.testPaper);
      setStep('editor');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 儲存試卷至題庫
  const handleSaveTestPaper = async () => {
    if (!testPaper) return;
    try {
      const res = await fetch('/api/teacher/test-papers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPaper),
      });
      const data = await res.json();
      if (res.ok) {
        alert('🎉 試卷已成功儲存至個人題庫！');
        router.push('/dashboard/teacher/test-papers');
      } else {
        alert(data.error || '儲存失敗');
      }
    } catch (err) {
      console.error(err);
      alert('儲存過程發生錯誤');
    }
  };

  // 更新題目文字
  const updateQuestionPrompt = (qIndex: number, newPrompt: string) => {
    if (!testPaper) return;
    const updated = { ...testPaper };
    updated.questions[qIndex].prompt = newPrompt;
    setTestPaper(updated);
  };

  // 更新選擇題選項文字
  const updateOptionText = (qIndex: number, optIndex: number, newText: string) => {
    if (!testPaper) return;
    const updated = { ...testPaper };
    if (updated.questions[qIndex].options) {
      updated.questions[qIndex].options![optIndex].text = newText;
      setTestPaper(updated);
    }
  };

  // 更新配分
  const updateQuestionPoints = (qIndex: number, newPoints: number) => {
    if (!testPaper) return;
    const updated = { ...testPaper };
    updated.questions[qIndex].points = newPoints;
    updated.totalPoints = updated.questions.reduce((sum, q) => sum + q.points, 0);
    setTestPaper(updated);
  };

  // 刪除題目
  const handleDeleteQuestion = (qIndex: number) => {
    if (!testPaper) return;
    if (confirm(`確定要刪除第 ${qIndex + 1} 題嗎？`)) {
      const updated = { ...testPaper };
      updated.questions.splice(qIndex, 1);
      // 重新編號
      updated.questions.forEach((q, i) => (q.questionNumber = i + 1));
      updated.totalPoints = updated.questions.reduce((sum, q) => sum + q.points, 0);
      setTestPaper(updated);
    }
  };

  // 顏色輔助標籤
  const getLevelBadge = (level: number) => {
    switch (level) {
      case 1:
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">L1 直接提取</span>;
      case 2:
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">L2 直接推論</span>;
      case 3:
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">L3 詮釋整合</span>;
      case 4:
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800">L4 檢驗評估</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* 導覽列 */}
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard/teacher"
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">PIRLS 智慧出題與人機協同編輯器</h1>
              <p className="text-xs text-slate-500">國小 3-6 年級四層次官方標準試卷提煉</p>
            </div>
          </div>

          {step === 'editor' && testPaper && (
            <div className="flex items-center space-x-3">
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                共 {testPaper.questions.length} 題 • 總分 {testPaper.totalPoints} 分
              </span>
              <button
                onClick={handleSaveTestPaper}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold inline-flex items-center space-x-1.5 shadow-sm transition"
              >
                <Save className="w-4 h-4" />
                <span>儲存至題庫</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 主體區塊 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {step === 'input' ? (
          /* ==========================================================
             第一步：出題設定與輸入介面
             ========================================================== */
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
                    💡 建議：請確認所填寫的 {provider === 'deepseek' ? 'DeepSeek' : provider === 'openrouter' ? 'OpenRouter' : provider === 'opencode' ? '自訂' : 'Google'} API Key 是否有效，或點擊下方「測試金鑰有效性」確認權限與額度。若暫無可用金鑰，可將金鑰欄位清空體驗內建的高品質示範題本。
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

            <form onSubmit={handleGenerate} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
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
                      <span className="ml-2 text-xs font-bold text-slate-700">🎨 生成多模態配圖需求（AI 自動為文章構思中英文生圖提示詞，供複製生圖並上傳）</span>
                    </label>
                  </div>
                </div>

                {/* 多 AI 介面與金鑰記憶設定區 */}
                <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                        <Sparkles className="w-4 h-4 text-sky-600" />
                        <span>AI 命題引擎與 API Key 設定</span>
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        支援多模型介面，API Key 自動加密保存在此瀏覽器，免除每次重新輸入的繁瑣。
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-flex items-center space-x-1">
                        <span>💾 已啟用瀏覽器本機記憶</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleClearKeys}
                        className="text-[11px] text-slate-400 hover:text-red-600 underline transition"
                      >
                        清除暫存
                      </button>
                    </div>
                  </div>

                  {/* 4 大提供商切換 Tabs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'gemini', label: 'Google Gemini', sub: '免費額度高 / 官方 Flash' },
                      { id: 'deepseek', label: 'DeepSeek', sub: '超低成本 / 中文極強' },
                      { id: 'openrouter', label: 'OpenRouter', sub: '全能聚合 / 支援多模型' },
                      { id: 'opencode', label: 'OpenCode GO', sub: 'OpenAI 相容網關' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => handleProviderChange(tab.id as any)}
                        className={`p-2.5 rounded-xl text-left border transition flex flex-col justify-between ${
                          provider === tab.id
                            ? 'bg-sky-50/80 border-sky-400 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span className={`text-xs font-bold ${provider === tab.id ? 'text-sky-800' : 'text-slate-700'}`}>
                          {tab.label}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">{tab.sub}</span>
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
                          onChange={(e) => handleKeyChange(provider, e.target.value)}
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
                          onClick={handleVerifyKey}
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
                          onChange={(e) => handleBaseUrlChange(e.target.value)}
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
                          onChange={(e) => handleModelChange('gemini', e.target.value)}
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
                          onChange={(e) => handleModelChange('deepseek', e.target.value)}
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
                          onChange={(e) => handleModelChange('openrouter', e.target.value)}
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
                          onChange={(e) => handleModelChange('opencode', e.target.value)}
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
        ) : (
          /* ==========================================================
             第二步：人機協同試題編輯器 (Human-in-the-Loop Editor)
             ========================================================== */
          testPaper && (
            <div className="space-y-6">
              {/* 頂部操作列 */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setStep('input')}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 inline-flex items-center space-x-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>重新設定</span>
                  </button>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{testPaper.title}</h2>
                    <p className="text-xs text-slate-500">
                      國小 {testPaper.targetGrade} 年級 • {testPaper.textType === 'literary' ? '文學性文本' : '訊息性文本'} • {testPaper.wordCount} 字
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setActiveTab('article')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                      activeTab === 'article' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    檢視/編輯文章 ({testPaper.wordCount}字)
                  </button>
                  <button
                    onClick={() => setActiveTab('questions')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                      activeTab === 'questions' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    檢視/微調題目 ({testPaper.questions.length}題)
                  </button>
                </div>
              </div>

              {/* 雙欄主視圖 */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* 左欄：文章閱讀與圖表呈現 (佔 5 欄) */}
                <div className={`lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 ${activeTab === 'questions' ? 'hidden lg:block' : 'block'}`}>
                  <div className="flex items-center justify-between border-b pb-3">
                    <span className="font-bold text-sm text-slate-900 flex items-center space-x-1.5">
                      <BookOpen className="w-4 h-4 text-sky-600" />
                      <span>閱讀文本正文</span>
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{testPaper.wordCount} 字</span>
                  </div>

                  {/* PIRLS 多模態課文繪本配圖與 3 幅關鍵場景生圖助手 */}
                  {(() => {
                    const illustrationsList = testPaper.illustrations || [];
                    const safeSceneIdx = illustrationsList.length > 0
                      ? Math.min(activeSceneIdx, illustrationsList.length - 1)
                      : 0;
                    const currentIll = illustrationsList[safeSceneIdx];

                    return (
                      <div
                        onPaste={(e) => handlePasteImage(e, safeSceneIdx)}
                        className="border border-indigo-100 rounded-2xl bg-gradient-to-b from-indigo-50/50 via-white to-white p-4 space-y-3.5 shadow-sm my-3"
                      >
                        {/* 頂部標題與總操作按鈕 */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2.5 border-b border-indigo-100/70">
                          <div className="flex items-center space-x-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm flex-shrink-0">
                              <Palette className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                                <span>課文關鍵場景配圖 ({illustrationsList.length}幅)</span>
                                {illustrationsList.length > 0 && (
                                  <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                                    {illustrationsList.filter(i => i.imageUrl).length} / {illustrationsList.length} 已就緒
                                  </span>
                                )}
                              </h4>
                              <p className="text-[10px] text-slate-500">文章擷取 3 個重要場景（起、轉、合），可複製提示詞生圖後上傳，亦可增減場景</p>
                            </div>
                          </div>

                          {/* 頂部操作按鈕組 */}
                          {illustrationsList.length > 0 && (
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              <button
                                type="button"
                                onClick={handleCopyCombinedPrompt}
                                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition flex items-center space-x-1.5 shadow-sm ${
                                  copiedCombined
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-amber-400 hover:bg-amber-300 text-slate-950 hover:shadow'
                                }`}
                                title="複製一段包含全部 3 張分開圖片的整合提示詞，可直接貼給 ChatGPT 或 AI 一次產出全套插圖！"
                              >
                                {copiedCombined ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>已複製全套提示詞！</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>複製全套 ({illustrationsList.length}幅) 提示詞</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={handleAddScene}
                                className="text-xs px-2.5 py-1.5 rounded-xl font-bold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-indigo-600 transition flex items-center space-x-1"
                                title="新增一幅插圖場景"
                              >
                                <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
                                <span>加幅</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* 場景分頁切換列 (Scene Tabs) */}
                        {illustrationsList.length > 0 ? (
                          <>
                            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
                              {illustrationsList.map((ill, idx) => {
                                const isSelected = idx === safeSceneIdx;
                                const isDone = Boolean(ill.imageUrl);
                                return (
                                  <button
                                    key={ill.id}
                                    type="button"
                                    onClick={() => setActiveSceneIdx(idx)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 flex-shrink-0 border ${
                                      isSelected
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                        : isDone
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    <span>場景 {idx + 1}</span>
                                    {isDone ? (
                                      <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${isSelected ? 'bg-indigo-700 text-white' : 'bg-emerald-200 text-emerald-900'}`}>✓</span>
                                    ) : (
                                      <span className={`text-[10px] ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>⏳</span>
                                    )}
                                  </button>
                                );
                              })}
                              <button
                                type="button"
                                onClick={handleAddScene}
                                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-dashed border-slate-300 hover:border-indigo-300 transition flex items-center space-x-1 flex-shrink-0"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                                <span>新增場景</span>
                              </button>
                            </div>

                            {/* 當前選定場景的操作卡片 */}
                            {currentIll && (
                              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3.5 shadow-sm">
                                {/* 場景設定標頭：場景編號、關聯段落、刪除按鈕 */}
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                  <div className="flex items-center space-x-2">
                                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold flex items-center justify-center">
                                      {safeSceneIdx + 1}
                                    </span>
                                    <span className="text-xs font-bold text-slate-800">
                                      第 {safeSceneIdx + 1} 幅場景設定
                                    </span>
                                    <div className="flex items-center space-x-1 pl-2 border-l border-slate-200">
                                      <span className="text-[11px] text-slate-500 font-medium">置於：</span>
                                      <select
                                        value={currentIll.paragraphNumber || 1}
                                        onChange={(e) => handleParagraphChange(parseInt(e.target.value, 10), safeSceneIdx)}
                                        className="text-xs rounded-md border border-slate-200 py-0.5 px-1.5 bg-slate-50 text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                      >
                                        {testPaper.paragraphs.map((p) => (
                                          <option key={p.paragraphNumber} value={p.paragraphNumber}>
                                            第 {p.paragraphNumber} 段
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>

                                  {/* 刪除此場景按鈕 */}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveScene(safeSceneIdx)}
                                    className="text-[11px] text-slate-400 hover:text-red-600 transition flex items-center space-x-1 px-1.5 py-0.5 rounded hover:bg-red-50"
                                    title="刪除此幅場景"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>刪除此場景</span>
                                  </button>
                                </div>

                                {/* 狀態 1：已有圖片 */}
                                {currentIll.imageUrl ? (
                                  <div className="space-y-3">
                                    <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex justify-center p-2 shadow-inner group">
                                      <img
                                        src={currentIll.imageUrl}
                                        alt={currentIll.caption || `場景 ${safeSceneIdx + 1}`}
                                        className="max-h-64 w-full object-contain rounded-lg shadow-sm bg-white"
                                      />
                                    </div>

                                    {/* 圖說標題編輯 */}
                                    <div className="flex items-center space-x-2">
                                      <span className="text-[11px] font-bold text-slate-500 flex-shrink-0">圖說標題：</span>
                                      <input
                                        type="text"
                                        value={currentIll.caption}
                                        onChange={(e) => handleCaptionChange(e.target.value, safeSceneIdx)}
                                        placeholder={`圖 ${safeSceneIdx + 1}：情境圖說說明`}
                                        className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:ring-1 focus:ring-sky-500 focus:outline-none bg-white"
                                      />
                                    </div>

                                    {/* 換圖 / 提示詞查看 / 刪圖操作列 */}
                                    <div className="flex items-center justify-between pt-1">
                                      <div className="flex items-center space-x-2">
                                        <label className="cursor-pointer text-[11px] font-semibold text-sky-600 hover:text-sky-700 inline-flex items-center space-x-1 px-2.5 py-1 bg-sky-50 hover:bg-sky-100 rounded-lg transition border border-sky-200">
                                          <Upload className="w-3 h-3" />
                                          <span>更換圖片</span>
                                          <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleImageUpload(e, safeSceneIdx)}
                                            className="hidden"
                                          />
                                        </label>
                                        {currentIll.imagePrompt && (
                                          <button
                                            type="button"
                                            onClick={() => handleCopySinglePrompt(currentIll.imagePrompt!)}
                                            className="text-[11px] font-medium text-slate-600 hover:text-slate-800 inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                                          >
                                            <Copy className="w-3 h-3" />
                                            <span>{copiedSingle ? '已複製！' : '複製此幅提示詞'}</span>
                                          </button>
                                        )}
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => handleRemoveImage(safeSceneIdx)}
                                        className="text-[11px] font-semibold text-red-600 hover:text-red-700 inline-flex items-center space-x-1 px-2.5 py-1 hover:bg-red-50 rounded-lg transition"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        <span>移除圖片</span>
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  /* 狀態 2：尚未上傳圖片 (展示該場景提示詞 + 圖片上傳框) */
                                  <div className="space-y-3">
                                    {/* 單幅場景專屬提示詞卡片 */}
                                    {currentIll.imagePrompt ? (
                                      <div className="bg-slate-900 text-slate-200 rounded-xl p-3.5 space-y-2.5 shadow-sm border border-slate-800">
                                        <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                                          <span className="text-[11px] font-bold text-amber-300 flex items-center space-x-1">
                                            <Sparkles className="w-3.5 h-3.5" />
                                            <span>場景 {safeSceneIdx + 1} 專屬提示詞</span>
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => handleCopySinglePrompt(currentIll.imagePrompt!)}
                                            className={`text-[11px] px-2.5 py-1 rounded-md font-bold transition flex items-center space-x-1 ${
                                              copiedSingle
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-sm'
                                            }`}
                                          >
                                            {copiedSingle ? (
                                              <>
                                                <CheckCircle2 className="w-3 h-3" />
                                                <span>已複製！</span>
                                              </>
                                            ) : (
                                              <>
                                                <Copy className="w-3 h-3" />
                                                <span>複製此場景提示詞</span>
                                              </>
                                            )}
                                          </button>
                                        </div>
                                        <p className="text-[11px] leading-relaxed font-mono whitespace-pre-wrap text-slate-300 max-h-32 overflow-y-auto pr-1">
                                          {currentIll.imagePrompt}
                                        </p>
                                      </div>
                                    ) : null}

                                    {/* 上傳圖片區塊 (支援拖曳/點擊/貼上) */}
                                    <div className="space-y-2">
                                      <label className="border-2 border-dashed border-sky-300 hover:border-sky-500 bg-sky-50/50 hover:bg-sky-50/90 rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-1.5 group">
                                        <div className="w-9 h-9 rounded-full bg-sky-100 group-hover:bg-sky-200 flex items-center justify-center text-sky-600 transition shadow-sm">
                                          <Upload className="w-4 h-4" />
                                        </div>
                                        <span className="text-xs font-bold text-sky-800 block">
                                          上傳【場景 {safeSceneIdx + 1}】生好的圖片
                                        </span>
                                        <span className="text-[10px] text-slate-500 block">
                                          點擊選取、拖曳檔案或直接按 Ctrl+V 貼上
                                        </span>
                                        <input
                                          type="file"
                                          accept="image/*"
                                          onChange={(e) => handleImageUpload(e, safeSceneIdx)}
                                          className="hidden"
                                        />
                                      </label>

                                      {/* 圖說輸入框 */}
                                      <div className="flex items-center space-x-1.5 pt-1">
                                        <span className="text-[11px] font-bold text-slate-500 flex-shrink-0">圖說標題：</span>
                                        <input
                                          type="text"
                                          value={currentIll.caption}
                                          onChange={(e) => handleCaptionChange(e.target.value, safeSceneIdx)}
                                          placeholder={`輸入圖說，如：圖 ${safeSceneIdx + 1}：主角登場`}
                                          className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium focus:ring-1 focus:ring-sky-500 focus:outline-none bg-white"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 底部全套 3 幅縮圖藝廊 (Gallery Overview Strip) */}
                            <div className="pt-2 border-t border-indigo-100/60">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[11px] font-bold text-slate-600">全套場景預覽概況：</span>
                                <span className="text-[10px] text-slate-400">點擊縮圖可切換至該場景</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                {illustrationsList.map((ill, idx) => (
                                  <div
                                    key={ill.id}
                                    onClick={() => setActiveSceneIdx(idx)}
                                    className={`cursor-pointer rounded-lg border p-1 transition flex flex-col items-center justify-center text-center ${
                                      idx === safeSceneIdx
                                        ? 'border-indigo-500 bg-indigo-50/70 ring-1 ring-indigo-500'
                                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                                    }`}
                                  >
                                    {ill.imageUrl ? (
                                      <img
                                        src={ill.imageUrl}
                                        alt={ill.caption}
                                        className="w-full h-14 object-cover rounded shadow-xs mb-1"
                                      />
                                    ) : (
                                      <div className="w-full h-14 bg-slate-200/70 rounded flex flex-col items-center justify-center text-[10px] text-slate-400 mb-1">
                                        <span>場景 {idx + 1}</span>
                                        <span className="text-[9px]">待上傳</span>
                                      </div>
                                    )}
                                    <span className="text-[10px] font-medium text-slate-700 truncate w-full px-0.5">
                                      {ill.caption || `圖 ${idx + 1}`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        ) : (
                          /* 若完全沒有任何插圖場景（自選文章時） */
                          <div className="p-4 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/30 text-center space-y-2.5">
                            <p className="text-xs font-bold text-slate-700">本篇課文目前尚未配置多模態插圖場景</p>
                            <p className="text-[11px] text-slate-500">可一鍵讓 AI 分析課文【起、承轉、合】脈絡，自動構思 3 組關鍵場景提示詞</p>
                            <button
                              type="button"
                              onClick={handleGenerateScenesForPasted}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm inline-flex items-center space-x-1.5 transition"
                            >
                              <Sparkles className="w-4 h-4" />
                              <span>一鍵為本課文分析並生成 3 幅場景提示詞</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* 內文各段落 */}
                  <div className="space-y-4 text-sm text-slate-700 leading-relaxed font-sans max-h-[650px] overflow-y-auto pr-2">
                    {testPaper.paragraphs.map((p) => (
                      <p key={p.paragraphNumber} className="bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                        {p.text}
                      </p>
                    ))}
                  </div>
                </div>

                {/* 右欄：四層次題目微調編輯區 (佔 7 欄) */}
                <div className={`lg:col-span-7 space-y-4 ${activeTab === 'article' ? 'hidden lg:block' : 'block'}`}>
                  {testPaper.questions.map((q, qIdx) => (
                    <div key={q.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:border-sky-300 transition">
                      {/* 題目標頭列 */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center space-x-2">
                          <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                            {q.questionNumber}
                          </span>
                          {getLevelBadge(q.processLevelNumber)}
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                            {q.type === 'multiple_choice' ? '選擇題' : '開放簡答題'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            <label className="text-xs text-slate-500 font-bold">配分:</label>
                            <input
                              type="number"
                              min={1}
                              max={5}
                              value={q.points}
                              onChange={(e) => updateQuestionPoints(qIdx, parseInt(e.target.value, 10))}
                              className="w-12 text-center rounded border border-slate-200 py-0.5 text-xs font-bold"
                            />
                            <span className="text-xs text-slate-400">分</span>
                          </div>

                          <button
                            onClick={() => handleDeleteQuestion(qIdx)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 transition"
                            title="刪除此題"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* 題幹編輯 */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          題目題幹 (Prompt)
                        </label>
                        <textarea
                          rows={2}
                          value={q.prompt}
                          onChange={(e) => updateQuestionPrompt(qIdx, e.target.value)}
                          className="w-full text-sm font-semibold text-slate-800 rounded-lg border border-slate-200 p-2.5 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                        />
                      </div>

                      {/* 選擇題選項 */}
                      {q.type === 'multiple_choice' && q.options && (
                        <div className="space-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                          <label className="block text-[11px] font-bold text-slate-500 mb-1">四選一選項與正確答案</label>
                          <div className="grid grid-cols-1 gap-2">
                            {q.options.map((opt, optIdx) => (
                              <div key={opt.label} className="flex items-center space-x-2">
                                <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                                  opt.isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {opt.label}
                                </span>
                                <input
                                  type="text"
                                  value={opt.text}
                                  onChange={(e) => updateOptionText(qIdx, optIdx, e.target.value)}
                                  className="flex-1 text-xs rounded-lg border border-slate-200 px-2.5 py-1.5 bg-white"
                                />
                                {opt.isCorrect && (
                                  <span className="text-[11px] text-emerald-600 font-bold whitespace-nowrap">✓ 正確解答</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 簡答題給分規準 (Rubrics) */}
                      {q.type === 'constructed_response' && q.rubric && (
                        <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200/60 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-800 flex items-center space-x-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>IEA 官方給分規準 (Rubrics 指引)</span>
                            </span>
                            <span className="text-[11px] text-amber-700 font-semibold">最高得分：{q.rubric.maxScore} 分</span>
                          </div>

                          <div className="space-y-1.5 text-xs">
                            {q.rubric.criteria.map((c) => (
                              <div key={c.score} className="p-2 bg-white rounded-lg border border-amber-100">
                                <div className="font-bold text-slate-800">
                                  【{c.score} 分】(代碼 {c.code})：{c.description}
                                </div>
                                {c.keyEvidenceNeeded && c.keyEvidenceNeeded.length > 0 && (
                                  <div className="text-[11px] text-slate-500 mt-1">
                                    • 必要文本線索：{c.keyEvidenceNeeded.join('、')}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {q.rubric.sampleFullCreditAnswer && (
                            <div className="text-[11px] text-slate-600 mt-2 bg-white/80 p-2 rounded border border-amber-100">
                              <strong className="text-amber-900">滿分示範答案：</strong>
                              {q.rubric.sampleFullCreditAnswer}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* 底部保存大按鈕 */}
                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={handleSaveTestPaper}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md transition flex items-center space-x-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>確認完成微調，儲存至題庫</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </main>

      <footer className="py-4 text-center text-xs text-slate-400 border-t bg-white">
        PIRLS 智慧閱讀素養評量平臺 • 人機協同出題編輯器
      </footer>
    </div>
  );
}
