# PIRLS 智慧閱讀素養評量平臺 — 技術架構與雲端部署指引

本文件提供開發者、技術主管與系統管理員完整的技術規格說明、環境配置與 Firebase / Vercel 雲端上線指引。

---

## 一、技術堆疊 (Tech Stack)

| 層級 | 核心技術 | 規格說明 |
| :--- | :--- | :--- |
| **前端框架** | Next.js 14 (App Router) | React 18, TypeScript, Tailwind CSS, Lucide React |
| **後端與 API** | Next.js Route Handlers | Node.js 運行環境，全站包含 25 條 API 與頁面路由 |
| **身分驗證** | 自建 Bcrypt + Jose JWT | 不依賴 Firebase Auth UI，輕量 Cookie 雙向鑑權，無縫適配校園批量帳號 |
| **邊界安全** | Next.js Edge Middleware | 角色型路由守門員（Admin / Teacher / Student），零漏網越權 |
| **AI 命題與圖表** | Google Gemini API (Flash) | 提煉 800~1,200 字長文、四層次階梯題目與原生純向量 SVG 科學流程圖 |
| **資料儲存層** | 雙軌資料層 (Dual Data Layer) | 支援本機高效 JSON 持久化（快速開發）與 Firebase Firestore 雲端雙向切換 |
| **心理計量演算法** | PIRLS Scale & Norm Engine | 錨定 IEA 官方基準門檻（Mean 500, SD 100），支援中點 PR 與常態累積理論 PR |

---

## 二、專案目錄結構

```
d:/antigravity/Pirls/
├── data/                         # 本地資料庫持久化目錄
│   └── pirls_database.json
├── docs/                         # 操作手冊與部署文檔
│   ├── TEACHER_MANUAL.md         # 教師完整操作手冊
│   └── DEPLOYMENT_GUIDE.md       # 雲端部署指引
├── prompts/                      # 核心 Prompt 與 JSON Schema 規範
│   ├── pirls_schemas.json
│   ├── article_generator_prompt.md
│   ├── question_generator_prompt.md
│   └── rubric_grader_prompt.md
├── src/
│   ├── app/                      # Next.js 14 App Router 頁面與 API
│   │   ├── page.tsx              # 官方入口首頁 (雙軌引導)
│   │   ├── login/ & register/    # 登入與教師申請
│   │   ├── practice/             # 開放自學專區 (目錄與作答大廳)
│   │   ├── print/[id]/           # A4 雙模式實體紙本列印
│   │   ├── dashboard/
│   │   │   ├── admin/            # 管理員審核後台
│   │   │   ├── teacher/          # 教師出題、班級、題庫、成績與 Excel
│   │   │   └── student/          # 學生作答大廳與個人雷達診斷書
│   │   └── api/                  # 包含 auth, ai, student, teacher, practice API
│   ├── lib/
│   │   ├── types.ts              # 全系統核心 TypeScript 型別規格
│   │   ├── db.ts                 # 雙軌資料持久化介面
│   │   ├── auth.ts               # Bcrypt 密碼加密與雜湊驗證
│   │   ├── jwt.ts                # Jose JWT 簽章與 Edge Runtime 解析
│   │   ├── llm-adapter.ts        # Gemini API / SVG 向量圖表轉譯適配器
│   │   ├── ai-grader.ts          # PIRLS 0/1/2/3 規準批改與三明治回饋引擎
│   │   └── pirls-norm.ts         # PIRLS 國際量尺公式與雙軌 PR 常模演算法
│   └── middleware.ts             # Edge 路由權限守門員
└── tests/                        # 7 大階段自動化驗收測試腳本
    ├── eval_pirls_prompts.mjs
    ├── eval_stage2_auth.mjs
    ├── eval_stage3_generator.mjs
    ├── eval_stage4_student_grading.mjs
    ├── eval_stage5_norm_scales.mjs
    ├── eval_stage6_export_print.mjs
    ├── eval_stage7_robustness_defense.mjs
    └── eval_stage7_e2e_integration.mjs
```

---

## 三、環境變數配置 (`.env.local`)

於專案根目錄建立 `.env.local` 檔案：

```ini
# 1. 系統認證與 JWT 金鑰 (請使用長度 32 字元以上之安全字串)
JWT_SECRET=super_secret_pirls_jwt_key_2026_taiwan_reading_literacy

# 2. Google Gemini API Key (用於高品質課文提煉與圖表生成)
# 可於 Google AI Studio (https://aistudio.google.com/) 免費取得
GEMINI_API_KEY=AIzaSyYourGeminiApiKeyHere

# 3. 資料庫模式切換 (local 或 firebase)
# 開發與自架預設為 local，雲端上線可切換為 firebase
DB_STORAGE_MODE=local

# 4. Firebase 雲端配置 (若切換為 firebase 模式時填寫)
FIREBASE_PROJECT_ID=your-pirls-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-pirls-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

## 四、本地執行與建置指令

```bash
# 安裝依賴套件
npm install

# 執行全套階段自動化整合測試 (全數通過)
npx tsx tests/eval_stage7_e2e_integration.mjs
npx tsx tests/eval_stage7_robustness_defense.mjs

# 啟動本地開發伺服器 (http://localhost:3000)
npm run dev

# 生產環境建置 (全站 25 條路由編譯)
npm run build

# 啟動生產伺服器
npm run start
```

---

## 五、雲端部署指引 (Vercel / Firebase Hosting / Google Cloud Run)

### 方案 A：一鍵部署至 Vercel (推薦，最敏捷)
1. 將專案 Push 至 GitHub 倉庫。
2. 於 [Vercel](https://vercel.com/) 點擊 **Add New Project**，選擇該倉庫。
3. Framework Preset 選擇 **Next.js**。
4. 於 **Environment Variables** 貼上 `.env.local` 內容（`JWT_SECRET` 與 `GEMINI_API_KEY`）。
5. 點擊 **Deploy**，約 90 秒完成全球邊緣 CDN 上線。

### 方案 B：部署至 Firebase App Hosting / Cloud Run
1. 安裝 Firebase CLI：`npm install -g firebase-tools`
2. 登入 Google 帳號：`firebase login`
3. 於專案目錄執行 `firebase init hosting` 或 `firebase init apphosting`。
4. 設定 Google Secret Manager 綁定 `GEMINI_API_KEY` 與 `JWT_SECRET`。
5. 執行 `firebase deploy` 完成專案發佈。

---

*PIRLS 智慧閱讀素養評量平臺 • 系統架構權威發佈指南*
