'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen, Sparkles, FileText, ArrowLeft, CheckCircle2,
  RefreshCw, PlusCircle, Trash2, Save, Send, Image as ImageIcon,
  BarChart, AlertCircle, Copy, Upload, Palette, Settings
} from 'lucide-react';
import { TestPaper, TestQuestion, CognitiveProcess, ArticleIllustration } from '@/lib/types';
import { generateSmartImagePrompts, formatCombinedImagePrompt } from '@/lib/llm-adapter';
import { AIProvider } from '@/lib/ai/types';
import { CreateFormStep, ArticleEditor, QuestionEditorList } from './components';
import { api, ApiClientError } from '@/lib/api-client';

function TeacherCreateTestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  // 步驟控制：'input' | 'editor'
  const [step, setStep] = useState<'input' | 'editor'>('input');
  const [mode, setMode] = useState<'theme' | 'paste'>('theme');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 再度編輯模式狀態
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [editingParaIdx, setEditingParaIdx] = useState<number | null>(null);

  // 若帶有 edit 參數，自動從後端載入既有試卷以供再度編輯
  React.useEffect(() => {
    if (!editId) return;

    const loadExistingPaper = async () => {
      setLoadingEdit(true);
      try {
        const data = await api.teacher.getTestPaper(editId);
        setTestPaper(data.testPaper);
        setIsEditing(true);
        setEditingId(editId);
        setStep('editor');
      } catch (err: any) {
        console.error(err);
        if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
          router.push('/login');
          return;
        }
        alert('載入試卷失敗：' + (err.message || '請確認網路狀態'));
        router.push('/dashboard/teacher/test-papers');
      } finally {
        setLoadingEdit(false);
      }
    };

    loadExistingPaper();
  }, [editId, router]);

  // 模式 A: 主題生成欄位
  const [theme, setTheme] = useState('動物保護與勇氣');
  const [targetGrade, setTargetGrade] = useState(4);
  const [textType, setTextType] = useState<'literary' | 'informational'>('literary');
  const [questionCountMode, setQuestionCountMode] = useState<'standard' | 'compact'>('standard');
  const [includeDiagram, setIncludeDiagram] = useState(true);
  // 多 AI 提供商與金鑰本地記憶庫
  const [provider, setProvider] = useState<AIProvider>('gemini');
  const [apiKeys, setApiKeys] = useState<{ [key: string]: string }>({
    gemini: '',
    claude: '',
    openai: '',
    groq: '',
    deepseek: '',
    openrouter: '',
    opencode: '',
  });
  const [customBaseUrl, setCustomBaseUrl] = useState('https://api.opencode.ai/v1');
  const [preferredModels, setPreferredModels] = useState<{ [key: string]: string }>({
    gemini: 'auto',
    claude: 'claude-3-5-sonnet-20241022',
    openai: 'gpt-4o',
    groq: 'llama-3.3-70b-versatile',
    deepseek: 'deepseek-flash',
    openrouter: 'deepseek/deepseek-chat',
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
    newProvider: AIProvider,
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
    // 智慧金鑰格式辨識與自動切換
    if (trimmed.startsWith('sk-ant-') && prov !== 'claude') {
      const updated = { ...apiKeys, claude: trimmed };
      setApiKeys(updated);
      setProvider('claude');
      setKeyStatus({ ok: true, message: '💡 偵測到 Anthropic Claude 專屬金鑰 (sk-ant-...)，已自動切換至「Claude」提供商！' });
      saveVault('claude', updated, customBaseUrl, preferredModels);
      return;
    }
    if (trimmed.startsWith('gsk_') && prov !== 'groq') {
      const updated = { ...apiKeys, groq: trimmed };
      setApiKeys(updated);
      setProvider('groq');
      setKeyStatus({ ok: true, message: '💡 偵測到 Groq 專屬金鑰 (gsk_...)，已自動切換至「Groq」極速引擎！' });
      saveVault('groq', updated, customBaseUrl, preferredModels);
      return;
    }
    if (trimmed.startsWith('sk-or-v1-') && prov !== 'openrouter') {
      const updated = { ...apiKeys, openrouter: trimmed };
      setApiKeys(updated);
      setProvider('openrouter');
      setKeyStatus({ ok: true, message: '💡 偵測到 OpenRouter 專屬金鑰 (sk-or-v1-...)，已自動切換至「OpenRouter」提供商！' });
      saveVault('openrouter', updated, customBaseUrl, preferredModels);
      return;
    }
    if (trimmed.startsWith('sk-proj-') && prov !== 'openai') {
      const updated = { ...apiKeys, openai: trimmed };
      setApiKeys(updated);
      setProvider('openai');
      setKeyStatus({ ok: true, message: '💡 偵測到 OpenAI 專案金鑰 (sk-proj-...)，已自動切換至「OpenAI 官方」提供商！' });
      saveVault('openai', updated, customBaseUrl, preferredModels);
      return;
    }
    if (trimmed.startsWith('AIzaSy') && prov !== 'gemini') {
      const updated = { ...apiKeys, gemini: trimmed };
      setApiKeys(updated);
      setProvider('gemini');
      setKeyStatus({ ok: true, message: '💡 偵測到 Google AI Studio 金鑰 (AIzaSy...)，已自動切換至「Google Gemini」！' });
      saveVault('gemini', updated, customBaseUrl, preferredModels);
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

  const handleProviderChange = (p: AIProvider) => {
    setProvider(p);
    setKeyStatus(null);
    saveVault(p, apiKeys, customBaseUrl, preferredModels);
  };

  const handleClearKeys = () => {
    if (confirm('確定要清除此瀏覽器暫存的所有 AI 金鑰設定嗎？')) {
      const emptyKeys = {
        gemini: '',
        claude: '',
        openai: '',
        groq: '',
        openrouter: '',
        deepseek: '',
        opencode: '',
      };
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

  // 多幅場景與生圖提示詞控制狀態
  const [activeSceneIdx, setActiveSceneIdx] = useState(0);
  const [copiedCombined, setCopiedCombined] = useState(false);
  const [copiedSingle, setCopiedSingle] = useState(false);

  // 客戶端圖片等比輕量壓縮（縮小至 800px 以內，自動填白底防止透明背景轉黑，產出高品質約 50-80KB JPEG Data URL，極速載入）
  const compressAndLoadImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxWidth = 800;
          const maxHeight = 800;
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
          // 填補白色背景，防止透明 PNG 轉為 JPEG 時變黑底
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.76);
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

  // 上傳與更換圖片 (支援自動補齊場景插圖槽位)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, illIdx = 0) => {
    const file = e.target.files?.[0];
    if (!file || !testPaper) return;

    try {
      const dataUrl = await compressAndLoadImage(file);
      const updatedIllustrations = [...(testPaper.illustrations || [])];
      
      // 若原插圖陣列長度不足，自動補齊
      while (updatedIllustrations.length <= illIdx) {
        const nextIdx = updatedIllustrations.length + 1;
        updatedIllustrations.push({
          id: `ill_scene_${nextIdx}_${Date.now()}`,
          paragraphNumber: Math.min(nextIdx, testPaper.paragraphs?.length || 1),
          caption: `圖 ${nextIdx}：情境插圖`,
          type: 'illustration_url',
          imageUrl: '',
        });
      }

      updatedIllustrations[illIdx] = {
        ...updatedIllustrations[illIdx],
        imageUrl: dataUrl,
        type: 'illustration_url',
      };
      setTestPaper({
        ...testPaper,
        illustrations: updatedIllustrations,
      });
    } catch (err) {
      console.error('圖片處理失敗', err);
      alert('圖片讀取或壓縮失敗，請重新嘗試');
    } finally {
      if (e.target) {
        e.target.value = '';
      }
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
            while (updated.length <= illIdx) {
              const nextIdx = updated.length + 1;
              updated.push({
                id: `ill_scene_${nextIdx}_${Date.now()}`,
                paragraphNumber: Math.min(nextIdx, testPaper.paragraphs?.length || 1),
                caption: `圖 ${nextIdx}：情境插圖`,
                type: 'illustration_url',
                imageUrl: '',
              });
            }
            updated[illIdx] = {
              ...updated[illIdx],
              imageUrl: dataUrl,
              type: 'illustration_url',
            };
            setTestPaper({ ...testPaper, illustrations: updated });
          } catch (err) {
            console.error('貼上圖片失敗', err);
          }
          break;
        }
      }
    }
  };

  // 直接以圖片網址 (URL) 設定或更換插圖
  const handleSetImageUrl = (url: string, illIdx: number) => {
    if (!testPaper) return;
    const trimmed = url.trim();
    if (!trimmed) return;
    const updated = [...(testPaper.illustrations || [])];
    while (updated.length <= illIdx) {
      const nextIdx = updated.length + 1;
      updated.push({
        id: `ill_scene_${nextIdx}_${Date.now()}`,
        paragraphNumber: Math.min(nextIdx, testPaper.paragraphs?.length || 1),
        caption: `圖 ${nextIdx}：情境插圖`,
        type: 'illustration_url',
        imageUrl: '',
      });
    }
    updated[illIdx] = {
      ...updated[illIdx],
      imageUrl: trimmed,
      type: 'illustration_url',
    };
    setTestPaper({ ...testPaper, illustrations: updated });
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
    setErrorMsg('');

    const currentKey = (apiKeys[provider] || '').trim();
    if (!currentKey) {
      const provName =
        provider === 'gemini'
          ? 'Google Gemini'
          : provider === 'claude'
          ? 'Anthropic Claude'
          : provider === 'openai'
          ? 'OpenAI 官方'
          : provider === 'groq'
          ? 'Groq 極速'
          : provider === 'openrouter'
          ? 'OpenRouter'
          : provider === 'deepseek'
          ? 'DeepSeek'
          : '自建端點';
      setErrorMsg(`您尚未設定 ${provName} API Key！請點擊下方「管理 AI 金鑰設定」前往獨立設定頁貼上有效金鑰。為確保素養評量品質，系統需真實金鑰運算，絕不隨意以示範文章混充。`);
      return;
    }

    setLoading(true);

    try {
      const data = await api.ai.generateTest({
        mode,
        theme,
        pastedTitle,
        pastedText,
        targetGrade,
        textType,
        questionCountMode,
        includeDiagram,
        provider,
        apiKey: currentKey,
        customBaseUrl: customBaseUrl.trim() || undefined,
        preferredModel: preferredModels[provider] || 'auto',
      });

      if (!data || !data.testPaper) {
        throw new Error((data as any)?.error || '未能成功生成試卷，請確認 API Key 是否有效或稍後重試');
      }

      setTestPaper(data.testPaper);
      setStep('editor');
    } catch (err: any) {
      setErrorMsg(err.message || '生成試卷失敗，請確認 API Key 是否有效');
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  const [saving, setSaving] = useState(false);

  // 儲存試卷至題庫（支援全新出題 POST 與再度編輯更新 PUT）
  const handleSaveTestPaper = async () => {
    if (!testPaper || saving) return;
    try {
      setSaving(true);
      if (isEditing && editingId) {
        await api.teacher.updateTestPaper(editingId, testPaper);
        alert('🎉 試卷已成功更新並同步至個人題庫！');
      } else {
        await api.teacher.createTestPaper(testPaper);
        alert('🎉 試卷已成功寫入資料庫並同步至個人題庫！');
      }
      router.push('/dashboard/teacher/test-papers');
    } catch (err: any) {
      console.error(err);
      alert('儲存過程發生錯誤：' + (err.message || '請確認網路狀態'));
    } finally {
      setSaving(false);
    }
  };

  // 更新文章標題
  const updateTitle = (newTitle: string) => {
    if (!testPaper) return;
    setTestPaper({ ...testPaper, title: newTitle });
  };

  // 更新段落文字
  const updateParagraphText = (pIndex: number, newText: string) => {
    if (!testPaper) return;
    const updatedParas = [...testPaper.paragraphs];
    if (updatedParas[pIndex]) {
      updatedParas[pIndex] = {
        ...updatedParas[pIndex],
        text: newText,
      };
      const newContent = updatedParas.map((p) => p.text).join('\n\n');
      setTestPaper({
        ...testPaper,
        paragraphs: updatedParas,
        articleContent: newContent,
        wordCount: newContent.replace(/\s+/g, '').length,
      });
    }
  };

  // 新增段落
  const handleAddParagraph = () => {
    if (!testPaper) return;
    const nextNum = testPaper.paragraphs.length + 1;
    const newPara = {
      paragraphNumber: nextNum,
      text: `【請輸入第 ${nextNum} 段內文...】`,
    };
    const updatedParas = [...testPaper.paragraphs, newPara];
    const newContent = updatedParas.map((p) => p.text).join('\n\n');
    setTestPaper({
      ...testPaper,
      paragraphs: updatedParas,
      articleContent: newContent,
      wordCount: newContent.replace(/\s+/g, '').length,
    });
    setEditingParaIdx(updatedParas.length - 1);
  };

  // 刪除段落
  const handleDeleteParagraph = (pIndex: number) => {
    if (!testPaper || testPaper.paragraphs.length <= 1) {
      alert('文章至少需保留一個段落');
      return;
    }
    if (!confirm(`確定要刪除第 ${pIndex + 1} 個段落嗎？`)) return;
    const updatedParas = testPaper.paragraphs
      .filter((_, idx) => idx !== pIndex)
      .map((p, idx) => ({ ...p, paragraphNumber: idx + 1 }));
    const newContent = updatedParas.map((p) => p.text).join('\n\n');
    setTestPaper({
      ...testPaper,
      paragraphs: updatedParas,
      articleContent: newContent,
      wordCount: newContent.replace(/\s+/g, '').length,
    });
    if (editingParaIdx === pIndex) setEditingParaIdx(null);
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

  // 切換選擇題正確答案
  const setCorrectOption = (qIndex: number, optIndex: number) => {
    if (!testPaper) return;
    const updated = { ...testPaper };
    if (updated.questions[qIndex].options) {
      updated.questions[qIndex].options = updated.questions[qIndex].options!.map((opt, i) => ({
        ...opt,
        isCorrect: i === optIndex,
      }));
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


  if (loadingEdit) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-sky-600 animate-spin" />
        <p className="text-sm font-bold text-slate-600">正在從題庫讀取試卷資料、文章與插圖分鏡...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* 導覽列 */}
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard/teacher/test-papers"
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              title="返回題庫管理"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">
                {isEditing ? `✏️ 編輯試卷：《${testPaper?.title || ''}》` : 'PIRLS 智慧出題與人機協同編輯器'}
              </h1>
              <p className="text-xs text-slate-500">
                {isEditing ? '重新編修文章、調整段落、更新繪本分鏡與四層次題本規準' : '國小 3-6 年級四層次官方標準試卷提煉'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/dashboard/teacher/settings/ai?from=create"
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center space-x-1.5 transition border border-slate-200"
              title="前往 AI 金鑰與模型設定"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>⚙️ AI 設定</span>
            </Link>

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
                      <span>{isEditing ? '更新儲存中...' : '寫入題庫中...'}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{isEditing ? '儲存試卷更新' : '儲存至題庫'}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 主體區塊 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {step === 'input' ? (
          <CreateFormStep
            mode={mode}
            setMode={setMode}
            theme={theme}
            setTheme={setTheme}
            textType={textType}
            setTextType={setTextType}
            targetGrade={targetGrade}
            setTargetGrade={setTargetGrade}
            pastedTitle={pastedTitle}
            setPastedTitle={setPastedTitle}
            pastedText={pastedText}
            setPastedText={setPastedText}
            questionCountMode={questionCountMode}
            setQuestionCountMode={setQuestionCountMode}
            includeDiagram={includeDiagram}
            setIncludeDiagram={setIncludeDiagram}
            loading={loading}
            errorMsg={errorMsg}
            onSubmit={handleGenerate}
            provider={provider}
            setProvider={handleProviderChange}
            apiKeys={apiKeys}
            preferredModels={preferredModels}
            onModelChange={handleModelChange}
          />) : (
          /* ==========================================================
             第二步：人機協同試題編輯器 (Human-in-the-Loop Editor)
             ========================================================== */
          testPaper ? (
            <div className="space-y-6">
              {/* 頂部操作列 */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  {isEditing ? (
                    <Link
                      href="/dashboard/teacher/test-papers"
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 inline-flex items-center space-x-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>返回題庫清單</span>
                    </Link>
                  ) : (
                    <button
                      onClick={() => setStep('input')}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 inline-flex items-center space-x-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>重新設定</span>
                    </button>
                  )}
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                      <span>{testPaper.title}</span>
                      {isEditing && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">
                          再度編輯中
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-500">
                      國小 {testPaper.targetGrade} 年級 • {testPaper.textType === 'literary' ? '文學性文本' : '訊息性文本'} • {testPaper.wordCount} 字 • 共 {testPaper.questions.length} 題
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
                {/* 左欄：文章閱讀與圖表呈現 */}
                <ArticleEditor
                  testPaper={testPaper}
                  activeTab={activeTab}
                  editingParaIdx={editingParaIdx}
                  setEditingParaIdx={setEditingParaIdx}
                  onUpdateTitle={updateTitle}
                  onUpdateParagraphText={updateParagraphText}
                  onAddParagraph={handleAddParagraph}
                  onDeleteParagraph={handleDeleteParagraph}
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
                  onSetImageUrl={handleSetImageUrl}
                  onGenerateScenesForPasted={handleGenerateScenesForPasted}
                />

                {/* 右欄：四層次題目微調編輯區 */}
                <QuestionEditorList
                  testPaper={testPaper}
                  activeTab={activeTab}
                  isEditing={isEditing}
                  saving={saving}
                  onSave={handleSaveTestPaper}
                  onUpdatePoints={updateQuestionPoints}
                  onUpdatePrompt={updateQuestionPrompt}
                  onUpdateOptionText={updateOptionText}
                  onSetCorrectOption={setCorrectOption}
                  onDeleteQuestion={handleDeleteQuestion}
                />
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 sm:p-12 rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm max-w-lg mx-auto my-12">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">尚未載入試卷內容</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                系統未檢測到生成的試卷內容，請點擊下方按鈕返回重新檢查 API Key 或出題設定。
              </p>
              <button
                type="button"
                onClick={() => setStep('input')}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold inline-flex items-center space-x-1.5 shadow-sm transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>返回重新設定</span>
              </button>
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

export default function TeacherCreateTestPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-bold">
          載入 PIRLS 智慧編輯器中...
        </div>
      }
    >
      <TeacherCreateTestContent />
    </Suspense>
  );
}
