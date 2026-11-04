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
import { QuestionEditCard, IllustrationStoryboard, AiConfigCard } from './components';

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

  // 客戶端圖片無損等比輕量壓縮（縮小至 900px 以內，產出高品質約 50KB JPEG Data URL，極速載入）
  const compressAndLoadImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxWidth = 900;
          const maxHeight = 900;
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
          const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
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
      testPaper.targetGrade || 4,
      testPaper.paragraphs?.length || 5
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

  const [saving, setSaving] = useState(false);

  // 儲存試卷至題庫
  const handleSaveTestPaper = async () => {
    if (!testPaper || saving) return;
    try {
      setSaving(true);
      const res = await fetch('/api/teacher/test-papers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPaper),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('🎉 試卷已成功寫入資料庫並同步至個人題庫！');
        router.push('/dashboard/teacher/test-papers');
      } else {
        alert(data.error || '儲存失敗，請檢查資料完整度');
      }
    } catch (err: any) {
      console.error(err);
      alert('儲存過程發生錯誤：' + (err.message || '請確認網路狀態'));
    } finally {
      setSaving(false);
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
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:bg-slate-400 text-white text-xs font-bold inline-flex items-center space-x-1.5 shadow-sm transition"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>寫入題庫中...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>儲存至題庫</span>
                  </>
                )}
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
                <AiConfigCard
                  provider={provider}
                  setProvider={handleProviderChange}
                  apiKeys={apiKeys}
                  onKeyChange={handleKeyChange}
                  customBaseUrl={customBaseUrl}
                  onBaseUrlChange={handleBaseUrlChange}
                  preferredModels={preferredModels}
                  onModelChange={handleModelChange}
                  keyChecking={keyChecking}
                  keyStatus={keyStatus}
                  onVerifyKey={handleVerifyKey}
                  onClearKeys={handleClearKeys}
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
                  <IllustrationStoryboard
                    illustrations={testPaper.illustrations || []}
                    paragraphs={testPaper.paragraphs}
                    activeSceneIdx={activeSceneIdx}
                    setActiveSceneIdx={setActiveSceneIdx}
                    copiedCombined={copiedCombined}
                    copiedSingle={copiedSingle}
                    onCopyCombinedPrompt={handleCopyCombinedPrompt}
                    onCopySinglePrompt={handleCopySinglePrompt}
                    onAddScene={handleAddScene}
                    onRemoveScene={handleRemoveScene}
                    onParagraphChange={handleParagraphChange}
                    onCaptionChange={handleCaptionChange}
                    onImageUpload={handleImageUpload}
                    onPasteImage={handlePasteImage}
                    onRemoveImage={handleRemoveImage}
                    onGenerateScenesForPasted={handleGenerateScenesForPasted}
                  />

                  {/* 內文各段落與穿插的情境插圖預覽 */}
                  <div className="space-y-4 text-sm text-slate-700 leading-relaxed font-sans max-h-[650px] overflow-y-auto pr-2">
                    {testPaper.paragraphs.map((p, pIdx) => {
                      const matchingIlls = (testPaper.illustrations || [])
                        .map((ill, illIdx) => ({ ill, illIdx }))
                        .filter(({ ill }) => (ill.paragraphNumber || 1) === p.paragraphNumber);
                      const isLast = pIdx === testPaper.paragraphs.length - 1;
                      const trailingIlls = isLast
                        ? (testPaper.illustrations || [])
                            .map((ill, illIdx) => ({ ill, illIdx }))
                            .filter(({ ill }) => (ill.paragraphNumber || 1) > testPaper.paragraphs.length)
                        : [];
                      const allIllsForThisPara = [...matchingIlls, ...trailingIlls];

                      return (
                        <div key={p.paragraphNumber} className="space-y-3">
                          <p className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                            {p.text}
                          </p>

                          {/* 穿插於本段落後的情境圖預覽卡片 */}
                          {allIllsForThisPara.map(({ ill, illIdx }) => (
                            <div
                              key={ill.id}
                              className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/30 p-3 space-y-2 transition hover:border-indigo-300"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md flex items-center space-x-1">
                                  <span>🖼️ 場景 {illIdx + 1} 穿插於此</span>
                                  <span className="text-slate-500 font-normal">（第 {p.paragraphNumber} 段後）</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveSceneIdx(illIdx);
                                    window.scrollTo({ top: 350, behavior: 'smooth' });
                                  }}
                                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                                >
                                  {ill.imageUrl ? '管理/更換圖片' : '前往複製提示詞/上傳圖片 →'}
                                </button>
                              </div>

                              {ill.imageUrl ? (
                                <div className="flex flex-col items-center pt-1">
                                  <img
                                    src={ill.imageUrl}
                                    alt={ill.caption || '情境圖'}
                                    className="max-h-48 w-auto object-contain rounded-lg border border-slate-200 shadow-sm bg-white"
                                  />
                                  <p className="text-xs text-center text-slate-600 font-medium mt-1.5">
                                    {ill.caption}
                                  </p>
                                </div>
                              ) : ill.svgCode ? (
                                <div className="flex flex-col items-center pt-1">
                                  <div dangerouslySetInnerHTML={{ __html: ill.svgCode }} className="w-full flex justify-center" />
                                  <p className="text-xs text-center text-slate-600 font-medium mt-1.5">
                                    {ill.caption}
                                  </p>
                                </div>
                              ) : (
                                <div className="text-xs text-slate-500 py-1 flex items-center justify-between">
                                  <span className="line-clamp-1 italic text-slate-400">
                                    {ill.caption || '尚未上傳真實圖片，完成出題後可複製上方提示詞生圖'}
                                  </span>
                                  <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex-shrink-0 ml-2">
                                    待生圖上傳
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 右欄：四層次題目微調編輯區 (佔 7 欄) */}
                <div className={`lg:col-span-7 space-y-4 ${activeTab === 'article' ? 'hidden lg:block' : 'block'}`}>
                  {testPaper.questions.map((q, qIdx) => (
                    <QuestionEditCard
                      key={q.id}
                      question={q}
                      index={qIdx}
                      onUpdatePoints={updateQuestionPoints}
                      onUpdatePrompt={updateQuestionPrompt}
                      onUpdateOptionText={updateOptionText}
                      onDeleteQuestion={handleDeleteQuestion}
                    />
                  ))}

                  {/* 底部保存大按鈕 */}
                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={handleSaveTestPaper}
                      disabled={saving}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition flex items-center space-x-2"
                    >
                      {saving ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>寫入題庫與雲端同調中...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>確認完成微調，儲存至題庫</span>
                        </>
                      )}
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
