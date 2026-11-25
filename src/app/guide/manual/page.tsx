'use client';

import React, { useState, useMemo, useId } from 'react';
import Link from 'next/link';
import { ModalDialog } from '@/components/ui/ModalDialog';
import {
  BookOpen,
  Users,
  Sparkles,
  Printer,
  ChevronRight,
  Search,
  X,
  ExternalLink,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Flame,
  Award,
  Layers,
  GraduationCap,
  Maximize2,
  ChevronLeft,
  Filter,
  Calculator,
  Target,
  Compass,
} from 'lucide-react';

interface ManualStep {
  stepText: string;
  title: string;
  image: string;
  actionGuide: string;
  proTip: string;
}

interface ManualChapter {
  id: string;
  number: string;
  title: string;
  summary: string;
  category: 'teacher' | 'student';
  steps: ManualStep[];
}

const TEACHER_CHAPTERS: ManualChapter[] = [
  {
    id: 'ch-01-teacher-register',
    number: '01',
    title: '教師帳號申請與審核',
    summary: '進入首頁點選「教師帳號申請」，填寫基本教職資料送出，等待系統管理員審核開通。',
    category: 'teacher',
    steps: [
      {
        stepText: '步驟 01 / 03',
        title: '進入首頁，點選「教師帳號申請」',
        image: '/截圖/01教師帳號申請/01_進入網頁，點選教師帳號申請.png',
        actionGuide: '前往平臺首頁，點擊右上角「教師帳號申請」藍色按鈕進入註冊流程。',
        proTip: '初次使用系統之國小授課教師或閱讀推動教師，皆需先登記申請專屬帳號。',
      },
      {
        stepText: '步驟 02 / 03',
        title: '身分選擇：點選「我是新教師」',
        image: '/截圖/01教師帳號申請/02_點選「我是新教師」.png',
        actionGuide: '在身分選擇頁點選「我是新教師」開始建立全新教師個人帳號。',
        proTip: '若學校此前已統一向閱卷中心申請並獲配發帳密，直接回首頁點選「系統登入」即可。',
      },
      {
        stepText: '步驟 03 / 03',
        title: '填寫資料，點擊「提交申請」',
        image: '/截圖/01教師帳號申請/03_填完資料，按提交申請.png',
        actionGuide: '依序填入真實姓名、登入帳號、密碼、電子郵件以及任教學校資訊。',
        proTip: '確認資料填寫無誤後按「提交申請」，經由管理員後台核准後方可正式登入啟用。',
      },
    ],
  },
  {
    id: 'ch-02-class-students',
    number: '02',
    title: '班級建立與學生帳密卡批次列印',
    summary: '新增授課班級，一鍵批次產生學生帳號密碼，並可直接輸出帶裁切線的「學生帳密卡」。',
    category: 'teacher',
    steps: [
      {
        stepText: '步驟 01 / 07',
        title: '帳號審核開通後，以教師身分登入',
        image: '/截圖/02班級學生建立/01_以教師的身份登入.png',
        actionGuide: '於登入頁面（/login）輸入教師帳號與密碼，點選登入進入專屬教師工作台。',
        proTip: '登入後右上角將顯示教師姓名與所屬學校。',
      },
      {
        stepText: '步驟 02 / 07',
        title: '建立新的授課班級',
        image: '/截圖/02班級學生建立/02_先建立新的班級.png',
        actionGuide: '點擊工作台左上方「新增班級」按鈕。',
        proTip: '支援一位教師同時管理多個年級與班級（例如：四年一班、四年二班）。',
      },
      {
        stepText: '步驟 03 / 07',
        title: '填入班級名稱與適用年級',
        image: '/截圖/02班級學生建立/03_按說明填入班級相關資料.png',
        actionGuide: '輸入班級名稱（如：四年一班）並指定年級（國小 3～6 年級）。',
        proTip: '年級設定將連動後續 AI 自動適配相應的閱讀文本字數與四層次題型難易度。',
      },
      {
        stepText: '步驟 04 / 07',
        title: '進入學生帳號批次建立面板',
        image: '/截圖/02班級學生建立/04_建立學生帳號.png',
        actionGuide: '在已建立的班級卡片上點擊「建立學生帳號」。',
        proTip: '系統提供兩種模式：流水號自動排號 vs 匯入真實姓名名單。',
      },
      {
        stepText: '步驟 05 / 07',
        title: '模式一：系統流水號快速排號',
        image: '/截圖/02班級學生建立/05_學生帳號建立：第一種模式由系統來排，你只要給前面的帳號即可.png',
        actionGuide: '輸入自訂帳號字首（如 s401）與預計建立的學生人數（如 25人）。',
        proTip: '系統會自動依座號產生連續帳號（s401_01 ~ s401_25），非常適合電腦教室匿名施測。',
      },
      {
        stepText: '步驟 06 / 07',
        title: '模式二：貼入學生姓名名單建立',
        image: '/截圖/02班級學生建立/06_學生帳號建立的第二種模式：給姓名，然後由系統來排.png',
        actionGuide: '可直接自 Excel 複製全班學生姓名貼上（一行一人），由系統依序對應座號。',
        proTip: '姓名模式便於後續查看個別學生的閱讀成長診斷書。',
      },
      {
        stepText: '步驟 07 / 07',
        title: '生成成功與一鍵列印帳密卡',
        image: '/截圖/02班級學生建立/07_兩者都可以很快速地建立學生帳號.png',
        actionGuide: '點擊確認後，系統瞬間生成全體學生帳號與安全隨機密碼清單。',
        proTip: '點選「列印學生帳密卡」可直接輸出裁切小卡，發給學生登入時對照使用。',
      },
    ],
  },
  {
    id: 'ch-03-ai-settings',
    number: '03',
    title: 'AI 服務金鑰設定（Gemini 免費金鑰）',
    summary: '至 Google AI Studio 申請免費的 Gemini API Key，貼回平臺並通過連線測試即可啟用 AI 出題。',
    category: 'teacher',
    steps: [
      {
        stepText: '步驟 01 / 06',
        title: '瀏覽支援的多款 AI 模型服務',
        image: '/截圖/03AI設定/01_這邊列出多個 AI，大部分都有一些免費額度可以使用，裡面都附有連結，我們可以過去申請。.png',
        actionGuide: '進入教師工作台右上角「AI 設定」，檢視系統相容之各大主流大型語言模型。',
        proTip: '平臺支援 Google Gemini、OpenAI 等主流服務，大部分皆提供充裕的免費調用額度。',
      },
      {
        stepText: '步驟 02 / 06',
        title: '以 Google Gemini 為例前往申請',
        image: '/截圖/03AI設定/02_我們用 Google Gemini API key 來申請，以這個為範例.png',
        actionGuide: '推薦優先使用 Google Gemini，點擊卡片中的「前往申請」開啟 Google AI Studio。',
        proTip: '只要使用一般個人 Google Gmail 帳號即可登入申請，無需綁定信用卡。',
      },
      {
        stepText: '步驟 03 / 06',
        title: '在 Google AI Studio 建立新金鑰',
        image: '/截圖/03AI設定/03_建立一個新的 API Key.png',
        actionGuide: '在 Google AI Studio 介面中點擊藍色「Create API key」按鈕。',
        proTip: '可選擇現有的 Google Cloud 專案或點選快速新建專案。',
      },
      {
        stepText: '步驟 04 / 06',
        title: '複製產生的 API Key 字串',
        image: '/截圖/03AI設定/04_將 API Key 複製下來.png',
        actionGuide: '點擊金鑰旁的 Copy 按鈕，完整複製產生的金鑰代碼（以 AIzaSy 開頭）。',
        proTip: 'API Key 為您的專屬存取金鑰，請妥善保管，勿公開於社交平台。',
      },
      {
        stepText: '步驟 05 / 06',
        title: '確認金鑰清單狀態為 Active',
        image: '/截圖/03AI設定/05_建立完成後，你會在系統上看到多出一列你剛才建立的 API Key 的資訊.png',
        actionGuide: '返回金鑰列表，確認清單中多出一列剛建立的 API Key 且狀態正常。',
        proTip: '確認後即可返回 PIRLS 閱讀評量系統貼上。',
      },
      {
        stepText: '步驟 06 / 06',
        title: '貼入金鑰並點選「測試連線」',
        image: '/截圖/03AI設定/06_我們把 API Key 貼到我們的閱讀系統，並檢查看看它是否能用.png',
        actionGuide: '將金鑰貼入平臺輸入框中儲存，並點選「測試連線」進行驗證。',
        proTip: '出現綠色「連線正常」提示，即代表 AI 協同命題與智慧評卷引擎已正式啟用！',
      },
    ],
  },
  {
    id: 'ch-04-ai-create',
    number: '04',
    title: 'AI 智慧出題與圖片置換',
    summary: '提供「主題生文」與「貼上課文」雙模式出題，自動產出四層次素養題目、非連續性圖表與配圖 Prompt。',
    category: 'teacher',
    steps: [
      {
        stepText: '步驟 01 / 09',
        title: '出題模式一：僅給主題，自動出文出題',
        image: '/截圖/04AI出題/01AI 出題：你只給題目，讓它自動出文章、自動出題.png',
        actionGuide: '輸入想測驗的主題（例如：海洋生態、台灣黑熊保育），AI 將自動撰寫 800~1,200 字長文並生成試題。',
        proTip: '適合課外閱讀推展、跨學科主題閱讀與國際常模模擬測驗。',
      },
      {
        stepText: '步驟 02 / 09',
        title: '出題模式二：自備課本內容貼上出題',
        image: '/截圖/04AI出題/02AI 出題第二種模式：您給文章內容，由它來出題，適合於像國語課的課文.png',
        actionGuide: '可直接貼上國語課本課文、校本教材或精選散文，由 AI 嚴格依據指定文本進行四層次素養命題。',
        proTip: '貼上課文時建議保留自然段落分行，方便系統自動為段落編號。',
      },
      {
        stepText: '步驟 03 / 09',
        title: '設定適用年級與非連續性圖表',
        image: '/截圖/04AI出題/03給完文章之後.png',
        actionGuide: '確認適用年級（3～6年級），並可勾選「生成非連續性科學圖表」。',
        proTip: '勾選圖表後，AI 會自動產生與文章相輔相成的 SVG 流程圖或結構圖，強化圖表判讀能力。',
      },
      {
        stepText: '步驟 04 / 09',
        title: 'AI 智慧運算，耐心等待 15~30 秒',
        image: '/截圖/04AI出題/04耐心等待出題完成.png',
        actionGuide: '點擊「開始 AI 出題」，系統正呼叫大模型運算 PIRLS 四大理解層次與配分規準。',
        proTip: '出題完成後將自動跳轉至雙欄預覽與微調編輯器。',
      },
      {
        stepText: '步驟 05 / 09',
        title: '依序複製生圖提示詞 (Prompts)',
        image: '/截圖/04AI出題/05_依序複製圖片的提示詞，去AI產生圖片.png',
        actionGuide: '系統已自動為文章段落產出專業英文繪圖 Prompt，點擊提示詞旁的「複製」圖示。',
        proTip: '提示詞已優化畫面視角、藝術風格與國小學生適齡意境。',
      },
      {
        stepText: '步驟 06 / 09',
        title: '將提示詞交由生圖 AI 產出配圖',
        image: '/截圖/04AI出題/06_將圖片提示詞交由 AI 來產生圖片.png',
        actionGuide: '將複製的 Prompt 貼入外部免費生圖工具（推薦 Recraft.ai、Bing Image Creator、Midjourney 等）。',
        proTip: '在 Recraft 中可選擇 Digital Illustration 風格，生成效果清晰亮麗。',
      },
      {
        stepText: '步驟 07 / 09',
        title: '下載圖片後，上傳至閱讀系統替換',
        image: '/截圖/04AI出題/07_下載圖片之後，再上傳到我們的閱讀系統.png',
        actionGuide: '將生成好的插圖存至電腦，在平臺上點選「上傳圖片」替換文章插圖。',
        proTip: '系統支援 PNG/JPG 格式，並會自動自適應雙欄版面。',
      },
      {
        stepText: '步驟 08 / 09',
        title: '逐題審閱題目品質，支援在線微調',
        image: '/截圖/04AI出題/08_檢視題目是否符合我們需求.png',
        actionGuide: '逐題審查題幹描述、四個選項與簡答題 Rubrics 評卷規準。',
        proTip: '教師可直接在線上修改任何文字、增減選項或微調關鍵給分線索。',
      },
      {
        stepText: '步驟 09 / 09',
        title: '題庫建立完成，隨時指派測驗',
        image: '/截圖/04AI出題/09_題庫建立完成.png',
        actionGuide: '確認題目無誤後點擊「儲存至題庫」，試卷即正式收錄於教師題庫中。',
        proTip: '已收錄之試卷可隨時重編、匯出 A4 或指派給班級施測。',
      },
    ],
  },
  {
    id: 'ch-05-assign-and-print',
    number: '05',
    title: '試卷指派與 A4 紙筆測驗雙面列印',
    summary: '支援班級線上派卷、設定測驗安全碼；無電腦教室時可直接列印 A4 雙面學生卷與教師解答卷。',
    category: 'teacher',
    steps: [
      {
        stepText: '步驟 01 / 04',
        title: '試卷指派設定與測驗安全碼',
        image: '/截圖/05試卷指派與A4列印/01_試卷指派設定與題庫總覽.png',
        actionGuide: '在「我的題庫」點擊「指派」按鈕，勾選受測班級；可選填安全碼（如 PIRLS2026）防非班級學生誤入。',
        proTip: '勾選「同時公開至開放自學區」可讓全校其他學生也能於首頁自由練習。',
      },
      {
        stepText: '步驟 02 / 04',
        title: 'A4 學生實體卷雙面列印排版',
        image: '/截圖/05試卷指派與A4列印/02_A4實體學生卷雙面排版.png',
        actionGuide: '在試卷卡片點擊「A4 學生卷」，系統自動排版為標準雙面 A4 規格，包含自然段標號與簡答橫線作答區。',
        proTip: '按 Ctrl + P（Mac 為 Cmd + P）即可直接列印，邊距已設為 1.5cm，不跑版。',
      },
      {
        stepText: '步驟 03 / 04',
        title: 'A4 教師解答卷與 IEA 雙位數規準表',
        image: '/截圖/05試卷指派與A4列印/03_A4教師解答卷與IEA雙位數代碼規準表.png',
        actionGuide: '點擊「A4 解答卷」，簡答題將完整展開 IEA 官方雙位數評卷規準（Code 30/20/10/11/79/99）。',
        proTip: '適合提供給閱卷小組或授課教師作為客觀評分的準則參考。',
      },
      {
        stepText: '步驟 04 / 04',
        title: '學生帳密卡批次列印預覽',
        image: '/截圖/05試卷指派與A4列印/04_學生帳密卡批次列印預覽.png',
        actionGuide: '在班級管理頁點擊「列印帳密卡」，系統排版為易於剪裁的小卡片清單。',
        proTip: '每張卡片附有學生座號、姓名、帳號與隨機密碼，上課直接發放給學生。',
      },
    ],
  },
  {
    id: 'ch-06-grading-and-feedback',
    number: '06',
    title: '學生作答審查、AI 重評與三明治回饋',
    summary: 'AI 依 Rubrics 規準初判定分，教師可手動微調並產出「肯定+盲點+鷹架」正向三明治回饋。',
    category: 'teacher',
    steps: [
      {
        stepText: '步驟 01 / 02',
        title: '學生作答清單與 AI 評分審查',
        image: '/截圖/08教師批改審閱與AI重評/01_學生作答審查與AI重評判分.png',
        actionGuide: '進入批改審查頁，系統自動標出選擇題對錯與簡答題之 Rubrics 得分級別。',
        proTip: 'AI 會標註學生回答中命中評分規準之關鍵詞，教師亦可隨時手動改分。',
      },
      {
        stepText: '步驟 02 / 02',
        title: '一鍵 AI 重新評分與生成三明治回饋',
        image: '/截圖/08教師批改審閱與AI重評/01_學生作答審查與AI重評判分.png',
        actionGuide: '點選「AI 重新評分」或「生成教學診斷處方」，系統將自動產生三明治回饋：【肯定亮點】+【盲點指引】+【鷹架示範】。',
        proTip: '正向回饋直接呈現在學生的個人診斷報告中，有效培養後設認知。',
      },
    ],
  },
  {
    id: 'ch-07-analytics-and-export',
    number: '07',
    title: '班級學力統計分析、五大基準與 Excel 匯出',
    summary: '全班國際量尺常模落點分析、五大基準分佈長條圖、雙班比較雷達圖，一鍵雙擊防亂碼匯出 Excel。',
    category: 'teacher',
    steps: [
      {
        stepText: '步驟 01 / 03',
        title: '全班國際量尺分數與五大基準分佈',
        image: '/截圖/09班級學力統計分析與Excel匯出/01_全班國際量尺分佈與五大基準落點.png',
        actionGuide: '在試卷結果頁查看全班平均量尺分數（平均 500、標準差 100）及五大基準（高級 625+、高 550~624、中等 475~549、低 400~474、未達低 <400）百分比。',
        proTip: '直觀了解班級學生的深層閱讀思維與國際基準定位。',
      },
      {
        stepText: '步驟 02 / 03',
        title: '雙班比較雷達圖與常模落點',
        image: '/截圖/09班級學力統計分析與Excel匯出/02_雙班比較雷達圖與常模落點.png',
        actionGuide: '在綜合學力分析頁面選取兩個班級，即時重疊比對四層次素養雷達圖。',
        proTip: '迅速發現不同班級在 L3 詮釋 或 L4 評估層次的整體盲點，利於教學研討。',
      },
      {
        stepText: '步驟 03 / 03',
        title: '一鍵匯出全班 Excel 成績名冊',
        image: '/截圖/09班級學力統計分析與Excel匯出/01_全班國際量尺分佈與五大基準落點.png',
        actionGuide: '點擊頁面右上角「匯出 Excel」，系統產出含有 UTF-8 BOM 識別之 CSV 報表。',
        proTip: 'Windows Microsoft Excel 雙擊直接開啟，繁體中文 100% 絕不亂碼，涵蓋 19 項教育行政欄位。',
      },
    ],
  },
];

const STUDENT_CHAPTERS: ManualChapter[] = [
  {
    id: 'stu-01-login',
    number: '01',
    title: '學生帳號登入與個人任務工作台',
    summary: '憑老師發放的帳密卡登入，查看待測驗任務與歷史學習紀錄。',
    category: 'student',
    steps: [
      {
        stepText: '步驟 01 / 02',
        title: '憑「帳密卡」登入系統',
        image: '/截圖/06學生端測驗流程/01_學生登入與身分認證.png',
        actionGuide: '在首頁點選「系統登入」，輸入小卡上的專屬學生帳號與 6 位數密碼。',
        proTip: '帳號通常為英數字組合（如 s602_01），請留意英文大小寫。',
      },
      {
        stepText: '步驟 02 / 02',
        title: '檢視個人任務工作台',
        image: '/截圖/06學生端測驗流程/02_學生測驗工作台與待測任務.png',
        actionGuide: '登入後學生首頁列出老師指派的班級測驗，點選「開始測驗」進入作答。',
        proTip: '若老師設定了安全碼，在彈窗輸入即可立即解鎖試卷。',
      },
    ],
  },
  {
    id: 'stu-02-exam',
    number: '02',
    title: '線上雙欄閱讀與字級縮放測驗作答',
    summary: '左側文章配圖對照、右上角自由縮放字級、選擇題圈選與簡答題輸入、交卷防呆檢查。',
    category: 'student',
    steps: [
      {
        stepText: '步驟 01 / 02',
        title: '雙欄閱讀版面與字級「A- / A+」縮放',
        image: '/截圖/06學生端測驗流程/03_線上雙欄閱讀與字級縮放測驗作答.png',
        actionGuide: '左側滾動閱讀文章與插圖，右側作答；可隨時點擊右上角 A- / A+ 調整字體大小。',
        proTip: '左側文章附有自然段號（如【第1段】），方便快速定位題目線索。',
      },
      {
        stepText: '步驟 02 / 02',
        title: '選擇題點選、簡答題鍵入與交卷確認',
        image: '/截圖/06學生端測驗流程/03_線上雙欄閱讀與字級縮放測驗作答.png',
        actionGuide: '選擇題直接點擊選項，簡答題在輸入框內打字。系統每 10 秒自動備份答案，答完點擊「交卷」。',
        proTip: '若有未作答的題目，系統會彈出黃色警告框提示題號，防呆不漏填。',
      },
    ],
  },
  {
    id: 'stu-03-results',
    number: '03',
    title: '個人素養雷達圖與成績落點診斷',
    summary: '交卷後即刻獲得 PIRLS 國際量尺分數、四維素養雷達圖與 AI 三明治正向回饋，並可列印證書。',
    category: 'student',
    steps: [
      {
        stepText: '步驟 01 / 01',
        title: '學科向度雷達圖 (個人 vs 班級) 與國際基準落點',
        image: '/截圖/07學生端成績與診斷報告/01_個人四維素養雷達圖與成績落點診斷.png',
        actionGuide: '檢視自己的 PIRLS 國際量尺分數、學科向度雷達圖（個人得分 vs 全班平均掌握率即時雙層對照），並閱讀 AI 生成之思維落點與破關策略。',
        proTip: '雷達圖清晰標註各向度之「個人得分」與「班級平均」，還可點擊「列印個人診斷書」將成果帶回家與家長分享！',
      },
    ],
  },
  {
    id: 'stu-04-practice',
    number: '04',
    title: '開放自學區自由探索（免登入）',
    summary: '無需帳號亦可自由選讀公開文本、自訂暱稱測驗，並獲得即時四維度能力診斷。',
    category: 'student',
    steps: [
      {
        stepText: '步驟 01 / 01',
        title: '首頁免登入進入開放自學區',
        image: '/截圖/10開放自學區/01_開放自學區好文探索與即測即評.png',
        actionGuide: '首頁點選「開放自學區」，自由挑選喜愛的科普文章或故事進行挑戰。',
        proTip: '適合課餘自主學習，自訂暱稱作答同樣享有即測即評與雷達圖回饋。',
      },
    ],
  },
];

const TEACHER_FAQS = [
  {
    q: '學生打錯密碼或遺失密碼卡，老師該如何快速救援？',
    a: '請在教師工作台「班級管理」點擊該班級名冊，找到該學生後點選「編輯」，即可直接在線上修改其密碼；或者點選「列印學生帳密卡」重新輸出整班或個人小卡。',
  },
  {
    q: 'AI 命題時若遇到連線超時或額度不足，該如何處理？',
    a: '請至教師後台「AI 設定」確認 API Key 是否有效。Google AI Studio 提供慷慨的免費額度，若出題頻繁短暫達到速率限制，稍候 1~2 分鐘後重新點擊即可，或可再申請一組免費金鑰進行更換。',
  },
  {
    q: '學生線上測驗中途不小心跳出瀏覽器，答案會消失嗎？',
    a: '不會！系統具備前端 Auto-save 實時自動暫存機制，每 10 秒即時備份。學生重新開啟測驗頁面後，會自動還原已填寫的所有答案。',
  },
  {
    q: '簡答題 AI 評分如果不符合老師的標準，如何調整？',
    a: '在批改審閱介面中，AI 僅作為初評輔助。教師可點擊任何簡答題的分數按鈕（0/1/2/3分）進行手動覆核改分，並可自行編輯調整三明治評語。',
  },
  {
    q: '匯出之全班 Excel 成績名冊在舊版 Office 中顯示亂碼？',
    a: '本平臺匯出的 CSV 檔案已預先嵌入 UTF-8 BOM（\\uFEFF）國際標準碼。若舊版 Excel 仍有編碼誤判，請在 Excel 中點選「資料」->「從文字/CSV」載入檔案，並選擇 UTF-8 編碼即可 100% 完美呈現。',
  },
  {
    q: '若電腦教室時段不足，如何進行實體課堂紙筆測驗？',
    a: '直接在「我的題庫」點選「A4 學生卷」，系統已適配雙面雙欄排版、段落標號與書寫橫線；同時可點選「A4 解答卷」列印包含 IEA 雙位數規準之教師專用答案卷。',
  },
  {
    q: '「PIRLS 班級平均國際量尺」與「班級同儕排名 (Class PR)」是如何計算出來的？有何判斷標準？',
    a: '① PIRLS 班級平均國際量尺：為全班已繳卷學生個人 PIRLS 量尺分數之算術平均數（∑各生量尺分 ÷ N）。個人量尺依據 IEA 官方標準常態母體（平均 500、標準差 100），依得分率進行分段線性錨定轉換至 260~715 分。若班平均高於 500 分，代表全班整體閱讀力優於全球平均；達 550 分以上更邁入「高基準」。在學生個人成績單中會標示「領先全班平均 +X 分」或「距離全班平均 -Y 分」供雙向對照。\n\n② 班級同儕排名 (Class PR)：採用心理計量學「中點百分等級公式」：Class PR = round( [ (低於該生分數人數 + 0.5 × 同分人數) ÷ 全班總人數 ] × 100 )。全平臺在查詢列表、匯出 Excel 與產出診斷書時，皆以最新全班總分即時動態重算，同班同分者之班級 PR 保證 100% 絕對相同一致。\n\n詳細演算法、錨定門檻與 IEA / 教育部 CIRN 官方參考資料網站，請詳見第 07 章專題解析區塊。',
  },
  {
    q: '系統產生題目的準則是什麼？是依據什麼條件與學理資料來命題的？',
    a: '本平臺試題生成完全對齊 IEA（國際教育成就評鑑學會）官方發布之《PIRLS Assessment Framework》與教育部國教署國小國語文課綱規範，嚴格遵循以下六大準則：\n\n① 雙軌文體選材：文學性經驗（敘事故事/寓言）與訊息性文本（科普/生態/說明）各佔 50%，適齡 800～1,200 字。\n\n② 四維歷程黃金配比：嚴格遵守 IEA 官方標準——L1 直接提取 (25%)、L2 直接推論 (35%)、L3 詮釋整合 (25%)、L4 檢驗評估 (15%)，低階思考 60% : 高階思考 40%。\n\n③ 題型配比與心理誘答：選擇題 (50%, 1分) 與建構反應簡答題 (50%, 1～3分) 各半，選擇題干擾選項專門針對學童常見認知迷思設計。\n\n④ IEA 雙位數評分規準：問答題皆內建 IEA 官方 Code 20 (滿分2分)、Code 10 (部分給分1分)、Code 79 (不給分0分) 雙位數規準與關鍵證據檢核點。\n\n⑤ 多模態圖文互涉：每篇文本配置「起、承、合」3 幅關鍵情境插圖或 SVG 圖表，融入圖文互證思維題。\n\n⑥ 權威文獻依據：包含 Boston College TIMSS & PIRLS 國際研究中心官方綱領、國立臺北教育大學柯華葳教授團隊《PIRLS 閱讀素養評量架構與試題編製指南》與教育部國語文課綱。詳情請參閱第 04 章專題指引或常模說明頁。',
  },
];

export default function UserManualPage() {
  const [activeTab, setActiveTab] = useState<'teacher' | 'student'>('teacher');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // 燈箱狀態
  const [lightboxImg, setLightboxImg] = useState<{ src: string; title: string; stepText: string } | null>(null);
  const lightboxTitleId = useId();

  // 當前顯示章節
  const currentChapters = activeTab === 'teacher' ? TEACHER_CHAPTERS : STUDENT_CHAPTERS;

  // 搜尋過濾
  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return currentChapters;
    const q = searchQuery.toLowerCase();
    return currentChapters
      .map((ch) => {
        const matchChapter =
          ch.title.toLowerCase().includes(q) ||
          ch.summary.toLowerCase().includes(q) ||
          ch.number.includes(q);

        const matchingSteps = ch.steps.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.actionGuide.toLowerCase().includes(q) ||
            s.proTip.toLowerCase().includes(q)
        );

        if (matchChapter || matchingSteps.length > 0) {
          return {
            ...ch,
            steps: matchingSteps.length > 0 ? matchingSteps : ch.steps,
          };
        }
        return null;
      })
      .filter(Boolean) as ManualChapter[];
  }, [currentChapters, searchQuery]);

  // 列印處理
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-sky-500 selection:text-white">
      {/* 導覽列 Header */}
      <header className="border-b bg-white/95 backdrop-blur sticky top-0 z-40 print:hidden shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md hover:opacity-90 transition"
              title="回首頁"
            >
              <BookOpen className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-sky-700 to-indigo-800">
                  PIRLS 智慧閱讀素養評量平臺
                </span>
                <span className="hidden md:inline-block px-2 py-0.5 text-[11px] font-bold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  系統操作使用說明書
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                涵蓋教師工作台、學生線上測驗與自學區全流程圖文實機指引
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-sm inline-flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">列印 / 存為 PDF</span>
            </button>
            <Link
              href="/guide/score-metrics"
              className="px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-blue-600 transition hidden lg:inline-block"
            >
              常模計算說明
            </Link>
            <Link
              href="/login"
              className="px-3.5 py-1.5 text-xs sm:text-sm font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition"
            >
              登入系統
            </Link>
          </div>
        </div>
      </header>

      {/* 頂部橫幅 Hero Banner */}
      <div className="bg-gradient-to-b from-sky-50/80 via-white to-slate-50 border-b print:hidden py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100/70 border border-sky-200 text-sky-800 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>實機頁面完整截圖 • 步驟逐步圖解 • 課堂中途隨手查</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
            網站使用說明書與操作指引
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            為教師提供人機協同命題、班級管理、派卷與學力診斷操作詳解；為學生提供流暢線上測驗與四軸雷達圖指引。
          </p>

          {/* 雙軌身分切換按鈕 */}
          <div className="pt-4 flex justify-center">
            <div className="inline-flex p-1.5 bg-slate-200/80 rounded-2xl shadow-inner gap-1">
              <button
                onClick={() => {
                  setActiveTab('teacher');
                  setSearchQuery('');
                }}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 ${
                  activeTab === 'teacher'
                    ? 'bg-white text-indigo-700 shadow-md scale-100'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>👨‍🏫 教師工作台手冊（7 大核心主題）</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('student');
                  setSearchQuery('');
                }}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 ${
                  activeTab === 'student'
                    ? 'bg-white text-sky-700 shadow-md scale-100'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>🎒 學生測驗與自學手冊（4 大核心主題）</span>
              </button>
            </div>
          </div>

          {/* 搜尋列 */}
          <div className="max-w-xl mx-auto pt-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋任何步驟或關鍵字（例如：忘記密碼、A4列印、Gemini、雷達圖、Rubrics...）"
                className="w-full pl-11 pr-10 py-3 bg-white border border-slate-300 rounded-2xl text-xs sm:text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 主體雙欄佈局 */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* 左側 Sticky 目錄導覽 (Desktop) */}
          <aside className="hidden lg:block lg:col-span-1 sticky top-24 space-y-4 print:hidden">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                  本手冊章節目錄
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                  {filteredChapters.length} 個單元
                </span>
              </div>

              <nav className="space-y-1.5">
                {filteredChapters.map((ch) => (
                  <a
                    key={ch.id}
                    href={`#${ch.id}`}
                    className="group flex items-start gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-sky-700 hover:bg-sky-50/70 transition"
                  >
                    <span className="w-5 h-5 rounded-md bg-slate-100 group-hover:bg-sky-200/80 text-slate-700 group-hover:text-sky-800 text-[10px] font-black flex items-center justify-center shrink-0 transition">
                      {ch.number}
                    </span>
                    <span className="leading-tight pt-0.5">{ch.title}</span>
                  </a>
                ))}
              </nav>

              {/* 常模與演算法專題導覽 */}
              <div className="pt-3 border-t space-y-2">
                <a
                  href="#section-scale-and-pr-guide"
                  className="p-3 bg-gradient-to-br from-indigo-50 to-sky-50 rounded-xl border border-indigo-100 block hover:shadow-sm transition group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-indigo-900 group-hover:text-indigo-700 flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                      <span>班級平均量尺與 PR 計算</span>
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    班級平均量尺公式、同儕 PR 中點演算法與官方參考資料網站。
                  </p>
                </a>

                <Link
                  href="/guide/score-metrics"
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 block transition group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-700 group-hover:text-blue-600 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-blue-600" />
                      <span>互動式量尺試算工具</span>
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    線上拖曳得分滑桿，即時試算國際量尺、PR 與五大基準。
                  </p>
                </Link>
              </div>
            </div>
          </aside>

          {/* 右側圖文主內容 (Desktop 3欄 / Mobile 全寬) */}
          <div className="lg:col-span-3 space-y-12">
            {filteredChapters.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 space-y-3">
                <Search className="w-8 h-8 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">找不到相符的操作內容</h3>
                <p className="text-xs text-slate-500">
                  沒有搜尋到包含「{searchQuery}」的步驟。請嘗試簡化關鍵字。
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 bg-sky-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-sky-700 transition"
                >
                  清除搜尋條件
                </button>
              </div>
            ) : (
              filteredChapters.map((chapter) => (
                <section
                  key={chapter.id}
                  id={chapter.id}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden scroll-mt-24 transition hover:shadow-md"
                >
                  {/* 章節標題頂部 Bar */}
                  <div className="p-6 sm:p-7 border-b bg-gradient-to-r from-slate-50 via-white to-sky-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
                          {chapter.number}
                        </span>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                          {chapter.title}
                        </h2>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {chapter.summary}
                      </p>
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold self-start sm:self-center shrink-0">
                      共 {chapter.steps.length} 個操作步驟
                    </span>
                  </div>

                  {/* 步驟清單卡片流 */}
                  <div className="divide-y divide-slate-100 p-6 sm:p-8 space-y-8">
                    {chapter.steps.map((step, idx) => (
                      <div key={idx} className="pt-6 first:pt-0 space-y-4">
                        {/* 步驟標題與編號 */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="px-2.5 py-1 rounded-md bg-sky-100 text-sky-800 text-[11px] font-black uppercase tracking-wider">
                              {step.stepText}
                            </span>
                            <h3 className="text-base sm:text-lg font-bold text-slate-900">
                              {step.title}
                            </h3>
                          </div>
                        </div>

                        {/* 實機截圖展示區 */}
                        <div className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-sm">
                          <img
                            src={encodeURI(step.image)}
                            alt={step.title}
                            className="w-full max-h-[500px] object-contain mx-auto bg-slate-950/20 group-hover:scale-[1.01] transition-transform duration-300"
                            loading="lazy"
                          />
                          {/* 點擊放大覆蓋層 */}
                          <button
                            onClick={() =>
                              setLightboxImg({
                                src: encodeURI(step.image),
                                title: step.title,
                                stepText: step.stepText,
                              })
                            }
                            className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/30 flex items-center justify-center transition-all duration-200 cursor-zoom-in"
                            title="點擊全螢幕放大查看"
                          >
                            <span className="opacity-0 group-hover:opacity-100 px-4 py-2 rounded-xl bg-white/95 text-slate-900 text-xs font-bold shadow-lg flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all duration-200">
                              <Maximize2 className="w-4 h-4 text-sky-600" />
                              <span>點擊放大高解析截圖</span>
                            </span>
                          </button>
                        </div>

                        {/* 操作指引與重點提示雙欄卡片 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-slate-700 leading-relaxed space-y-1">
                            <span className="font-bold text-blue-900 flex items-center gap-1.5">
                              <span>📌 操作指引</span>
                            </span>
                            <p className="text-slate-600">{step.actionGuide}</p>
                          </div>
                          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-100 text-xs text-slate-700 leading-relaxed space-y-1">
                            <span className="font-bold text-amber-900 flex items-center gap-1.5">
                              <span>💡 重點提示</span>
                            </span>
                            <p className="text-slate-600">{step.proTip}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 若為第 04 章：嵌入專屬 PIRLS 試題產生準則、出題條件與權威資料來源 */}
                  {chapter.id === 'ch-04-ai-create' && (
                    <div id="section-ai-question-criteria-guide" className="p-6 sm:p-8 pt-6 border-t border-slate-200/90 space-y-8 bg-slate-50/40">
                      {/* 專題標題 Banner */}
                      <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-sky-900 via-slate-900 to-indigo-950 text-white space-y-3 shadow-lg">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-200 text-xs font-bold">
                          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                          <span>IEA PIRLS 國際命題規範 • 國小國語文素養課綱對齊</span>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                          PIRLS 素養試題生成準則：依據條件與權威學理來源
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
                          本平臺產生學生作答題目的運算模型，並非隨機提問，而是完全依據國際教育成就評鑑學會（IEA）官方標準與臺灣教育部國教署課綱，兼顧「四維認知歷程黃金配比」、「題型各半客觀度」與「IEA 雙位數評分規準」。
                        </p>
                      </div>

                      {/* 六大核心命題條件網格 */}
                      <div className="space-y-4">
                        <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                          <Layers className="w-5 h-5 text-sky-600" />
                          <span>系統生成試題之「六大必備條件規範」</span>
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* 1. 雙軌文體平衡 */}
                          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
                            <span className="text-xs font-black text-sky-900 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-sky-600" />
                              1. 雙軌文體平衡選材 (50% : 50%)
                            </span>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              嚴格劃分<strong>「文學性經驗文本」</strong>（敘事故事、情節起承轉合、寓言反思）與<strong>「訊息性文本」</strong>（科普、說明、因果機制），篇幅規範於 800～1,200 字適齡長度。
                            </p>
                          </div>

                          {/* 2. 四大歷程黃金配比 */}
                          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
                            <span className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-indigo-600" />
                              2. 四維認知歷程黃金配比 (60% : 40%)
                            </span>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              維持低階思考 60% 與高階思考 40% 的官方標準：<strong>L1 直接提取 (25%)</strong>、<strong>L2 直接推論 (35%)</strong>、<strong>L3 詮釋整合 (25%)</strong>、<strong>L4 檢驗評估 (15%)</strong>。
                            </p>
                          </div>

                          {/* 3. 題型分佈客觀度 */}
                          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
                            <span className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-600" />
                              3. 題型分配與誘答設計 (客觀 50% : 建構 50%)
                            </span>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              四選一選擇題（1分）干擾選項依據學童常見認知迷思設計；建構問答題（1～3分）強調自文本摘取具體證據與條理闡述。
                            </p>
                          </div>

                          {/* 4. IEA 雙位數雙向評分規準 */}
                          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
                            <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-600" />
                              4. IEA 雙位數評分規準系統 (Two-Digit Rubrics)
                            </span>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              問答題自動產出階梯規準：<strong>Code 20 (滿分2分)</strong>、<strong>Code 10 (部分給分1分)</strong>、<strong>Code 79 (0分)</strong>，明確定義「關鍵證據檢核要點」與滿分示範答題。
                            </p>
                          </div>

                          {/* 5. 多模態圖文互涉 */}
                          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
                            <span className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-purple-600" />
                              5. 多模態圖文互涉架構 (ePIRLS 趨勢)
                            </span>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              配置「起·開端」、「承轉·高潮」、「合·結局」三組情境插圖或非連續性 SVG 圖表，題幹融入跨模態圖文對照題。
                            </p>
                          </div>

                          {/* 6. 年級自適應可讀性 */}
                          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
                            <span className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-rose-600" />
                              6. 年段自適應可讀性 (3～6年級)
                            </span>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              依據中年級（3-4年級）「學會閱讀」與高年級（5-6年級）「透過閱讀學習」動態調校詞彙、複句與設問深度。
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 官方文獻與學理依據列表 */}
                      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                          <div>
                            <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                              <BookOpen className="w-5 h-5 text-sky-600" />
                              <span>題目產生之官方權威文獻與資料來源</span>
                            </h4>
                            <p className="text-xs text-slate-500">
                              出題邏輯、歷程比例與評分指引皆具備國內外權威學術研究背書
                            </p>
                          </div>
                          <Link
                            href="/guide/score-metrics#section-question-criteria"
                            className="text-xs font-bold text-sky-600 hover:text-sky-700 inline-flex items-center gap-1"
                          >
                            <span>查看深入學理對照表</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                            <div className="text-xs font-black text-slate-900">
                              🌐 IEA PIRLS 國際評量官方架構（Boston College）
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              Mullis & Martin (2021). <em>PIRLS 2021 Assessment Framework</em>. 定義四大認知歷程權重、兩大閱讀目的各 50%、選擇題與問答題各半之黃金比例。
                            </p>
                          </div>

                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                            <div className="text-xs font-black text-slate-900">
                              🇹🇼 臺灣 PIRLS 國家研究中心（國立臺北教育大學）
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              柯華葳教授團隊《PIRLS 閱讀素養評量架構與試題編製指南》。將國際評量指標在地化適配臺灣國小國語文教學體系與試題研發手冊。
                            </p>
                          </div>

                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                            <div className="text-xs font-black text-slate-900">
                              🏛️ 教育部國教署國語文素養指引與課綱
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              教育部《十二年國民基本教育課程綱要國語文領域》與國教署《國小國語文閱讀理解提問設計與評量規準手冊》，規範 3～6 年級篇章理解階梯指標。
                            </p>
                          </div>

                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                            <div className="text-xs font-black text-slate-900">
                              📑 IEA 雙位數評分規準代碼標準（Released Items）
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              IEA PIRLS 官方歷屆釋出試題與閱卷手冊，規範問答題以 Code 20/10/79 結合「文本關鍵證據」進行客觀給分。
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 若為第 07 章：嵌入專屬 PIRLS 班級平均國際量尺與班級 PR 演算法解析＆官方參考資料網站 */}
                  {chapter.id === 'ch-07-analytics-and-export' && (
                    <div id="section-scale-and-pr-guide" className="p-6 sm:p-8 pt-6 border-t border-slate-200/90 space-y-8 bg-slate-50/40">
                      {/* 專題標題 Banner */}
                      <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-sky-950 text-white space-y-3 shadow-lg">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-200 text-xs font-bold">
                          <Calculator className="w-3.5 h-3.5 text-sky-400" />
                          <span>PIRLS 心理計量學常模規範 • 官方計算標準</span>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                          PIRLS 班級平均國際量尺與班級同儕排名 (Class PR) 演算法詳解
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
                          深入解析平臺如何透過「國際常模標準分數（Mean 500, SD 100）」與心理計量學「中點百分等級（Midpoint PR）」雙軌機制，客觀評估個別學生的同儕排名與班級整體學力水準。
                        </p>
                      </div>

                      {/* 雙欄核心算法解析：班級平均量尺 vs 班級同儕 PR */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 左欄：PIRLS 班級平均國際量尺 */}
                        <div className="p-6 rounded-2xl bg-sky-50/70 border border-sky-200/90 space-y-4 shadow-sm">
                          <div className="flex items-center justify-between border-b border-sky-200/70 pb-3">
                            <h4 className="text-base font-black text-sky-950 flex items-center gap-2">
                              <Target className="w-5 h-5 text-sky-600" />
                              <span>PIRLS 班級平均國際量尺</span>
                            </h4>
                            <span className="text-xs font-bold text-sky-800 bg-sky-100 px-2.5 py-1 rounded-full border border-sky-200">
                              全球尺標對照
                            </span>
                          </div>

                          {/* 公式區 */}
                          <div className="p-4 rounded-xl bg-white border border-sky-200 space-y-2 text-xs">
                            <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
                              📐 班級平均量尺計算公式：
                            </span>
                            <div className="p-2.5 rounded-lg bg-sky-50 font-mono font-bold text-sky-950 text-center text-xs sm:text-sm border border-sky-100">
                              班級平均量尺 = ( ∑ 本班各生 PIRLS 量尺分 ) ÷ 本班實測總人數 N
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                              學生個人量尺非傳統 0~100 分，而是依據試卷得分率（實得分 ÷ 滿分），對齊 IEA 官方素養等級進行<strong>分段線性錨定轉換</strong>（260 ~ 715 分），使不同體裁與題數的試卷具備跨題本可比性。
                            </p>
                          </div>

                          {/* 判斷依據與教學應用 */}
                          <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
                            <div className="font-bold text-sky-900 flex items-center gap-1.5">
                              <Compass className="w-4 h-4 text-sky-600" />
                              <span>如何判斷班級平均量尺的能力水準？</span>
                            </div>
                            <ul className="space-y-1.5 pl-4 list-disc text-slate-600 marker:text-sky-500">
                              <li>
                                <strong>對照國際基準（500 分為全球常模平均）</strong>：班級平均高於 500 分代表優於全球平均；若達到 <strong>550 分以上</strong>，全班整體邁入「高基準（High Benchmark）」。
                              </li>
                              <li>
                                <strong>落差診斷與同儕參照</strong>：在學生個人診斷書上，系統同步繪製學生落點與班級平均虛線，即時呈現<strong>「領先全班平均 +X 分」</strong>或<strong>「距離全班平均 -Y 分」</strong>，讓親師一眼看清相對優勢。
                              </li>
                            </ul>
                          </div>
                        </div>

                        {/* 右欄：班級同儕排名 (Class PR) */}
                        <div className="p-6 rounded-2xl bg-indigo-50/70 border border-indigo-200/90 space-y-4 shadow-sm">
                          <div className="flex items-center justify-between border-b border-indigo-200/70 pb-3">
                            <h4 className="text-base font-black text-indigo-950 flex items-center gap-2">
                              <Users className="w-5 h-5 text-indigo-600" />
                              <span>班級同儕排名 (Class PR)</span>
                            </h4>
                            <span className="text-xs font-bold text-indigo-800 bg-indigo-100 px-2.5 py-1 rounded-full border border-indigo-200">
                              班內同儕對照
                            </span>
                          </div>

                          {/* 公式區 */}
                          <div className="p-4 rounded-xl bg-white border border-indigo-200 space-y-2 text-xs">
                            <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
                              📐 心理計量學中點百分等級公式：
                            </span>
                            <div className="p-2.5 rounded-lg bg-indigo-50 font-mono font-bold text-indigo-950 text-center text-xs sm:text-sm border border-indigo-100">
                              Class PR = round( [ ( 低於該生分數人數 + 0.5 × 同分人數 ) ÷ N ] × 100 )
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                              納入<strong>「同分中點折算（0.5 × 同分人數）」</strong>，能徹底消除傳統名次並列時的極端離散偏差，客觀代表學生在班上超越了百分之幾的受測同儕。
                            </p>
                          </div>

                          {/* 判斷依據與保障機制 */}
                          <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
                            <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-indigo-600" />
                              <span>即時動態重算保障（同分同 PR）</span>
                            </div>
                            <ul className="space-y-1.5 pl-4 list-disc text-slate-600 marker:text-indigo-500">
                              <li>
                                <strong>全班最新成績即時運算</strong>：無論學生何時交卷或老師分批閱卷，系統在查詢後台、匯出 Excel 與產出診斷報告時，一律以全班最新成績動態重算，<strong>同得相同總分者，班級 PR 保證 100% 絕對相同一致</strong>。
                              </li>
                              <li>
                                <strong>班級 PR vs 國際常模 PR 差異</strong>：班級 PR 參照「本班同儕實測表現」；國際常模 PR（常模 PR）則參照「全球標準常態分佈（$Z = (量尺 - 500) \div 100$）」，兩者母體不同，相輔相成。
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* 第三部分：PIRLS 國際量尺與常模之「權威參考資料官方網站」 */}
                      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                          <div>
                            <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                              <BookOpen className="w-5 h-5 text-blue-600" />
                              <span>PIRLS 國際量尺與常模官方權威參考資料網站</span>
                            </h4>
                            <p className="text-xs text-slate-500">
                              本平臺各項心理計量常模公式與閱讀思維層次，完全遵循國際官方研究文獻與教育部規範
                            </p>
                          </div>
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md self-start sm:self-center">
                            官方文獻指引
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                          {/* 1. IEA 國際總部與波士頓學院 */}
                          <a
                            href="https://timssandpirls.bc.edu/pirls2021/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-sky-50/50 hover:border-sky-300 transition-all flex flex-col justify-between"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-slate-900 group-hover:text-sky-700 transition flex items-center gap-1.5">
                                  <span>🌐 IEA TIMSS & PIRLS International Study Center</span>
                                </span>
                                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition" />
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed">
                                <strong>所屬機構：</strong>國際教育成就評鑑學會（IEA）與美國波士頓學院（Boston College）。
                              </p>
                              <p className="text-[11px] text-slate-500 leading-relaxed">
                                <strong>官方參考規範：</strong>發布《PIRLS 2021 Assessment Framework》與《International Results in Reading》，定義量尺分數母體（Mean=500, SD=100）及五大國際基準（International Benchmarks）。
                              </p>
                            </div>
                            <span className="text-[11px] font-bold text-sky-600 mt-2 inline-flex items-center gap-1 group-hover:underline">
                              前往 IEA 國際題本與研究中心官網 →
                            </span>
                          </a>

                          {/* 2. 教育部 CIRN 平臺 */}
                          <a
                            href="https://cirn.moe.edu.tw/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-indigo-50/50 hover:border-indigo-300 transition-all flex flex-col justify-between"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-slate-900 group-hover:text-indigo-700 transition flex items-center gap-1.5">
                                  <span>🏛️ 教育部 CIRN 國民中小學課程與教學資源平臺</span>
                                </span>
                                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition" />
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed">
                                <strong>所屬機構：</strong>教育部國民及學前教育署（國教署）。
                              </p>
                              <p className="text-[11px] text-slate-500 leading-relaxed">
                                <strong>官方參考規範：</strong>收錄臺灣歷屆 PIRLS 國家成果報告、國語文素養命題規準手冊，以及四層次閱讀理解思考歷程之國小教學引導範例。
                              </p>
                            </div>
                            <span className="text-[11px] font-bold text-indigo-600 mt-2 inline-flex items-center gap-1 group-hover:underline">
                              前往教育部 CIRN PIRLS 專區 →
                            </span>
                          </a>

                          {/* 3. 臺灣 PIRLS 計畫官網 */}
                          <a
                            href="https://pirls.ntue.edu.tw/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-emerald-50/50 hover:border-emerald-300 transition-all flex flex-col justify-between"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-slate-900 group-hover:text-emerald-700 transition flex items-center gap-1.5">
                                  <span>🇹🇼 臺灣 PIRLS 計畫官方網站（國立臺北教育大學）</span>
                                </span>
                                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed">
                                <strong>所屬機構：</strong>臺灣 PIRLS 國家研究中心（國立臺北教育大學 / 柯華葳教授研究團隊）。
                              </p>
                              <p className="text-[11px] text-slate-500 leading-relaxed">
                                <strong>官方參考規範：</strong>提供臺灣四年級學童歷屆閱讀素養常模趨勢、國際各級基準落點分析，以及 ePIRLS 數位網頁閱讀模擬試題釋出資料。
                              </p>
                            </div>
                            <span className="text-[11px] font-bold text-emerald-600 mt-2 inline-flex items-center gap-1 group-hover:underline">
                              前往臺灣 PIRLS 研究中心平臺 →
                            </span>
                          </a>

                          {/* 4. 心理計量學常模量尺與百分等級標準 */}
                          <a
                            href="https://en.wikipedia.org/wiki/Percentile_rank"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-purple-50/50 hover:border-purple-300 transition-all flex flex-col justify-between"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-slate-900 group-hover:text-purple-700 transition flex items-center gap-1.5">
                                  <span>📊 心理計量學「中點百分等級（Midpoint PR）」標準</span>
                                </span>
                                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition" />
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed">
                                <strong>學術規範：</strong>教育心理測驗學與常模參照測驗（Norm-Referenced Test）通用計量標準。
                              </p>
                              <p className="text-[11px] text-slate-500 leading-relaxed">
                                <strong>演算法則：</strong>標準中點百分等級公式定義，透過折算同分人數（0.5 × 等分頻率）消除傳統名次並列偏態，確立公平同儕定位。
                              </p>
                            </div>
                            <span className="text-[11px] font-bold text-purple-600 mt-2 inline-flex items-center gap-1 group-hover:underline">
                              查閱心理計量百分等級學術定義 →
                            </span>
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              ))
            )}

            {/* 教學現場 FAQ 折疊區塊 */}
            {activeTab === 'teacher' && (
              <section className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                    <Flame className="w-3.5 h-3.5 text-amber-600" />
                    <span>課堂現場突發問題排解</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                    教師常見疑問與現場救援 FAQ
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500">
                    彙整國小閱讀推動教師在課堂上最常遭遇的突發狀況與解決方案。
                  </p>
                </div>

                <div className="space-y-3">
                  {TEACHER_FAQS.map((faq, idx) => (
                    <div
                      key={idx}
                      className="border border-slate-200 rounded-2xl overflow-hidden transition"
                    >
                      <button
                        onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                        className="w-full text-left p-4 sm:p-5 font-bold text-xs sm:text-sm text-slate-800 hover:bg-slate-50 flex items-center justify-between gap-4 transition"
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-800 text-xs font-black flex items-center justify-center shrink-0">
                            Q{idx + 1}
                          </span>
                          <span>{faq.q}</span>
                        </span>
                        <ChevronRight
                          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                            activeFaq === idx ? 'rotate-90 text-sky-600' : ''
                          }`}
                        />
                      </button>
                      {activeFaq === idx && (
                        <div className="p-4 sm:p-5 pt-0 text-xs sm:text-sm text-slate-600 bg-slate-50/50 border-t border-slate-100 leading-relaxed">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 底部快速跳轉卡片 */}
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl shadow-sky-600/20 print:hidden">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="text-lg font-black">準備好開始進行 PIRLS 閱讀評量了嗎？</h4>
                <p className="text-xs text-sky-100">
                  登入教師工作台，即可立即建立班級、AI 命題與指派實體或線上測驗。
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link
                  href="/login"
                  className="px-5 py-2.5 bg-white text-slate-900 rounded-xl font-bold text-xs sm:text-sm hover:bg-sky-50 shadow-md transition"
                >
                  前往系統登入
                </Link>
                <Link
                  href="/practice"
                  className="px-5 py-2.5 bg-sky-700/60 hover:bg-sky-700 text-white rounded-xl font-bold text-xs sm:text-sm border border-sky-400/40 transition"
                >
                  進入開放自學區
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 燈箱視窗 (Lightbox Modal) */}
      <ModalDialog
        isOpen={Boolean(lightboxImg)}
        onClose={() => setLightboxImg(null)}
        ariaLabelledBy={lightboxTitleId}
        dismissMode="any"
        className="dialog-backdrop-dark bg-transparent border-0 p-0 m-auto max-w-5xl w-[calc(100vw-2rem)] shadow-none overflow-visible"
      >
        {lightboxImg && (
          <div className="flex flex-col items-center justify-center text-white">
            {/* 燈箱頂部工具列 */}
            <div className="w-full flex items-center justify-between text-white pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-sky-600 text-white text-[11px] font-bold">
                  {lightboxImg.stepText}
                </span>
                <span id={lightboxTitleId} className="font-bold text-sm sm:text-base">{lightboxImg.title}</span>
              </div>
              <button
                type="button"
                onClick={() => setLightboxImg(null)}
                aria-label="關閉放大視窗"
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 燈箱圖片本體 */}
            <div className="w-full max-h-[82vh] overflow-auto py-4 flex items-center justify-center">
              <img
                src={lightboxImg.src}
                alt={lightboxImg.title}
                className="max-h-[80vh] w-auto max-w-full rounded-xl shadow-2xl object-contain border border-white/10"
              />
            </div>

            <p className="text-slate-400 text-xs pt-1">
              按鍵盤 ESC 或點選背景任意處關閉放大視窗
            </p>
          </div>
        )}
      </ModalDialog>

      {/* 頁尾 Footer */}
      <footer className="border-t bg-white py-6 text-center text-xs text-slate-500 space-y-2 print:hidden">
        <p>PIRLS 智慧閱讀素養評量平臺 © 2026 • 國小 3～6 年級國語文素養專用</p>
        <div className="flex items-center justify-center gap-4 text-xs">
          <Link href="/guide/score-metrics" className="text-slate-600 hover:text-sky-600 transition">
            指標與常模計算說明
          </Link>
          <span>•</span>
          <Link href="/guide/manual" className="text-sky-600 font-bold hover:underline">
            網站使用說明書
          </Link>
          <span>•</span>
          <Link href="/practice" className="text-slate-600 hover:text-sky-600 transition">
            開放自學區
          </Link>
          <span>•</span>
          <Link href="/login" className="text-slate-600 hover:text-sky-600 transition">
            系統登入
          </Link>
        </div>
      </footer>
    </div>
  );
}
