'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HelpCircle,
  X,
  ExternalLink,
  Search,
  BookOpen,
  Sparkles,
  Printer,
  BarChart3,
  Users,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  FileText,
  KeyRound,
  ShieldAlert,
  Flame,
} from 'lucide-react';

interface QuickHelpItem {
  id: string;
  title: string;
  category: string;
  summary: string;
  anchor: string;
  keywords: string[];
}

const QUICK_HELP_ITEMS: QuickHelpItem[] = [
  {
    id: 'ai-create',
    title: 'AI 智慧出題與生圖置換',
    category: '命題作業',
    summary: '支援「主題自動生成」與「自備課文貼入」雙模式，自動產出 800~1,200 字適齡長文與四層次試題，並提供配圖 Prompt。',
    anchor: 'ch-04-ai-create',
    keywords: ['出題', '生圖', 'Prompt', '課文', '主題', '插圖', '難度', '年級', '換圖', '命題'],
  },
  {
    id: 'class-students',
    title: '建立班級與學生帳密卡',
    category: '班級管理',
    summary: '輸入人數一鍵批次生成學生帳號，支援「流水號排號」與「匯入真實姓名」，可一鍵列印帶裁切線的帳密小卡。',
    anchor: 'ch-02-class-students',
    keywords: ['班級', '學生', '帳號', '密碼', '名冊', '座號', '帳密卡', '列印卡片', '重設密碼'],
  },
  {
    id: 'ai-key',
    title: 'Google Gemini API 免費金鑰設定',
    category: '系統設定',
    summary: '進入 Google AI Studio 免費申請 Gemini API Key，貼入平臺並點擊「測試連線」即可啟用 AI 命題與自動批改。',
    anchor: 'ch-03-ai-settings',
    keywords: ['API', 'Key', '金鑰', 'Gemini', 'Google', '免費', '連線', '測試', '額度'],
  },
  {
    id: 'assign-print',
    title: '試卷指派與 A4 紙筆雙面列印',
    category: '派卷施測',
    summary: '勾選班級派卷並可設定測驗安全碼。無電腦教室時可直接列印 A4 學生實體卷（含橫線）與教師 IEA 雙位數規準解答卷。',
    anchor: 'ch-05-assign-and-print',
    keywords: ['派卷', '安全碼', 'A4', '列印', '解答卷', '規準', '紙筆', '實體考試', '自學區公開'],
  },
  {
    id: 'grading-rubric',
    title: '學生作答審查與 AI 重新評分',
    category: '閱卷評分',
    summary: 'AI 依據 IEA PIRLS Rubrics 規準初評判分，教師可手動微調給分並一鍵產出「肯定+盲點+鷹架」三明治正向回饋。',
    anchor: 'ch-06-grading-and-feedback',
    keywords: ['批改', '審核', '改卷', 'AI 評分', 'Rubrics', '規準', '三明治回饋', '簡答題', '改分'],
  },
  {
    id: 'analytics-excel',
    title: '五大基準常模落點與 Excel 匯出',
    category: '學力分析',
    summary: '分析全班量尺分佈（平均 500、標準差 100）與高級/高/中等/低基準，支援雙班比較雷達圖，一鍵匯出 UTF-8 BOM 防亂碼 Excel。',
    anchor: 'ch-07-analytics-and-export',
    keywords: ['統計', '成績', '量尺分數', '基準', 'PR', '雷達圖', '比較', 'Excel', '匯出', '亂碼'],
  },
];

const FAQS = [
  {
    q: '學生打錯密碼或遺失密碼卡，如何快速處理？',
    a: '請在教師工作台「學生名冊」中找到該學生，點擊「編輯」即可即時查看或修改其登入密碼；亦可點擊「重新列印帳密卡」單獨印製發放。',
  },
  {
    q: 'AI 命題時顯示連線超時或額度不足怎麼辦？',
    a: '請至「AI 設定」確認 API Key 是否有效。Google AI Studio 提供免費額度，若短期內頻繁出題達限額，稍候 1~2 分鐘後重試，或更換新的免費 Key 即可。',
  },
  {
    q: '學生線上測驗中途瀏覽器不小心關閉，答案會消失嗎？',
    a: '不會！系統具備本地 Auto-save 暫存機制，每 10 秒自動備份。學生重新登入並進入該測驗即可無縫接續先前的作答進度。',
  },
  {
    q: '匯出之 Excel 報表在舊版 Windows Office 顯示亂碼？',
    a: '本平臺匯出之 CSV 檔案已預設加入 UTF-8 BOM 識別碼。若仍有異常，請以 Excel 內建的「資料」->「從文字/CSV」載入並選取 UTF-8 編碼即可 100% 正常顯示。',
  },
];

export function TeacherHelpFAB() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // 根據目前所在路由決定情境推薦
  const getContextualItem = (): QuickHelpItem => {
    if (pathname.includes('/create')) return QUICK_HELP_ITEMS[0]; // AI 出題
    if (pathname.includes('/test-papers')) return QUICK_HELP_ITEMS[3]; // 派卷列印
    if (pathname.includes('/submissions')) return QUICK_HELP_ITEMS[4]; // 閱卷批改
    if (pathname.includes('/analytics')) return QUICK_HELP_ITEMS[5]; // 學力統計
    if (pathname.includes('/settings')) return QUICK_HELP_ITEMS[2]; // AI 設定
    return QUICK_HELP_ITEMS[1]; // 班級建立
  };

  const contextualItem = getContextualItem();

  // 搜尋過濾
  const filteredItems = searchQuery.trim()
    ? QUICK_HELP_ITEMS.filter((item) => {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.keywords.some((k) => k.toLowerCase().includes(q))
        );
      })
    : QUICK_HELP_ITEMS;

  // 監聽鍵盤 ESC 關閉
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {/* 浮動按鈕 (FAB) */}
      <div className="fixed bottom-6 right-6 z-40 print:hidden">
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold text-sm rounded-full shadow-xl shadow-sky-600/30 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200"
          title="中途有疑問？點此開啟操作手冊速查"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-200 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
          <HelpCircle className="w-5 h-5" />
          <span className="hidden sm:inline">使用說明與求助</span>
        </button>
      </div>

      {/* 側邊抽屜 Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity"
        />
      )}

      {/* 側邊抽屜主體 */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-full sm:w-[460px] bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-out print:hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* 抽屜頂部標題列 */}
        <div className="p-4 sm:p-5 border-b bg-gradient-to-r from-sky-50 to-indigo-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">操作指引與快速救急</h3>
              <p className="text-xs text-slate-500">教師工作台專屬即時救援手冊</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-lg hover:bg-slate-200/60 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 搜尋列 */}
        <div className="p-4 border-b bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋關鍵字（如：忘記密碼、A4列印、Gemini...）"
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
            />
          </div>
        </div>

        {/* 內容滾動區 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* 當前頁面情境推薦 (若無搜尋時顯示) */}
          {!searchQuery.trim() && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 via-sky-50 to-white border border-indigo-100/80 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-600 text-white text-[11px] font-bold">
                  <Sparkles className="w-3 h-3" />
                  目前頁面推薦指引
                </span>
                <span className="text-[11px] text-slate-400 font-medium">{contextualItem.category}</span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm">{contextualItem.title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{contextualItem.summary}</p>
              <div className="pt-1 flex items-center justify-between">
                <Link
                  href={`/guide/manual#${contextualItem.anchor}`}
                  target="_blank"
                  className="text-xs font-bold text-sky-700 hover:text-sky-800 inline-flex items-center gap-1"
                >
                  <span>檢視完整實機截圖步驟</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* 功能模組速查清單 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                {searchQuery.trim() ? `搜尋結果 (${filteredItems.length})` : '常用主題導覽'}
              </h4>
            </div>

            {filteredItems.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                查無相關主題，請嘗試更換關鍵字或點擊下方查看完整說明書。
              </div>
            ) : (
              <div className="space-y-2">
                {filteredItems.map((item) => (
                  <Link
                    key={item.id}
                    href={`/guide/manual#${item.anchor}`}
                    target="_blank"
                    className="p-3 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl block transition group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-sky-600 transition">
                        {item.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{item.summary}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 教學現場 FAQ 折疊區 */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>課堂常見突發狀況 FAQ</span>
            </h4>
            <div className="space-y-2">
              {FAQS.map((faq, idx) => (
                <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <button
                    onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                    className="w-full text-left p-3 text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center justify-between gap-2 transition"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        activeFaq === idx ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {activeFaq === idx && (
                    <div className="px-3 pb-3 pt-1 text-xs text-slate-600 bg-slate-50 border-t border-slate-100 leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 抽屜底部動作按鈕 */}
        <div className="p-4 border-t bg-slate-50 flex items-center justify-between">
          <Link
            href="/guide/score-metrics"
            target="_blank"
            className="text-xs font-semibold text-slate-600 hover:text-sky-600 inline-flex items-center gap-1 transition"
          >
            <span>常模與量尺指標計算</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
          <Link
            href="/guide/manual"
            target="_blank"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-sky-600/20 inline-flex items-center gap-1.5 transition"
          >
            <span>打開完整手冊全覽</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </>
  );
}
