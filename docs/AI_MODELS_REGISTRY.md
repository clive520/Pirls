# PIRLS 智慧閱讀素養評量平臺 — AI 語言模型規格與註冊清單 (AI Models Registry)

> **版本記錄與維護說明**  
> * **最後更新日期**：2026 年 11 月 7 日  
> * **維護機制**：本文件作為 PIRLS 系統各大 AI 提供商（Providers）與語言模型（LLMs）的單一事實來源（Single Source of Truth, SSOT）。  
> * **規範約定**：本平臺未來若有任何模型增修、退役汰換或 API 端點調整，**必須同步更新此 MD 檔與代碼庫**，以確保系統穩定性與教師端體驗的一致性。

---

## 快速導覽索引

* [一、整體架構與安全原則](#一整體架構與安全原則)
* [二、Google Gemini 官方模型清單](#二google-gemini-官方模型清單)
* [三、Anthropic Claude 官方模型清單](#三anthropic-claude-官方模型清單)
* [四、Groq 極速晶片官方模型清單](#四groq-極速晶片官方模型清單)
* [五、DeepSeek 官方模型清單](#五deepseek-官方模型清單)
* [六、OpenAI 官方模型清單](#六openai-官方模型清單)
* [七、OpenRouter 聚合網關](#七openrouter-聚合網關)
* [八、自建伺服器 / OpenCode GO](#八自建伺服器--opencode-go)
* [九、模型生命週期管理規範 (Deprecation Policy)](#九模型生命週期管理規範-deprecation-policy)

---

## 一、整體架構與安全原則

1. **零信任安全架構（Zero-Trust Client Vault）**：
   * 所有教師設定的 API Key **100% 僅儲存在教師個人的瀏覽器本地儲存庫（LocalStorage: `pirls_ai_vault`）**。
   * 後端僅在出題當下經由 HTTPS 加密轉發至各家官方模型伺服器，**中央資料庫絕不保存、亦無權查看任何金鑰**。
2. **純文字生成專用防呆（Strict Text-Only Filtering）**：
   * PIRLS 命題任務本質為「800~1,200 字素養長文」與「四層次閱讀理解結構化 JSON（含題目、選項、評分規準）」。
   * 系統已嚴格封鎖語音轉文字（STT，如 Whisper）、語音合成（TTS）、純生圖（Imagen）等非對話模型，杜絕 API 報錯。
3. **智慧降級與自癒重試（Auto-Fallback Resilience）**：
   * 當教師選用之旗艦大模型因突發性負載（429 限速）或模型暫時離線（503/404）時，後端會自動無縫切換至備援之高限額模型重新生成，絕不讓教師面臨空白或死機錯誤。

---

## 二、Google Gemini 官方模型清單

* **官方平臺**：Google AI Studio
* **金鑰申請入口**：[https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
* **金鑰前綴格式**：`AIzaSy...`
* **目前整合架構**：Gemini 3.x Flash 世代

| 模型名稱 | API Model ID | 系統推薦定位 | PIRLS 命題實務特性 |
| :--- | :--- | :--- | :--- |
| **Gemini 3.8 Flash** | `gemini-3.8-flash` | ⚡ **【官方推薦首選】** | 新一代主力旗艦模型，專長於長上下文、複雜四層次設題與嚴謹 JSON 輸出。 |
| **Gemini 3.7 Flash** | `gemini-3.7-flash` | 🧠 **多步驟推理** | 適合邏輯嚴密的科普說明文、多段落論證推論與跨段落主旨統合。 |
| **Gemini 3.6 Flash** | `gemini-3.6-flash` | 🌐 **一般對話與理解** | 文意流暢度高，適合記敘文故事類題材。 |
| **Gemini 3.5 Flash** | `gemini-3.5-flash` | 🚀 **大量請求穩定** | 吞吐量大、穩定性高，適合連續出題。 |
| **Gemini 3.5 Flash-Lite** | `gemini-3.5-flash-lite` | 💰 **低成本高頻率** | 輕巧敏捷、低延遲反應。 |
| **Gemini 3.1 Flash-Lite** | `gemini-3.1-flash-lite` | 🍃 **輕量化任務** | 適合快速短篇閱讀測驗。 |

> **⚠️ 退役防護記錄**：
> * 舊版 Gemini 1.5 系列（`gemini-1.5-flash`、`gemini-1.5-pro`、`gemini-1.5-flash-8b`）已於 2025 年 9 月全面停用，系統已全面移除防範 404 報錯。
> * 系統自動過濾非文字模型（如 `gemini-2.5-flash-preview-tts` 等語音模型），防範 402 Prepayment 報錯。

---

## 三、Anthropic Claude 官方模型清單

* **官方平臺**：Anthropic Console
* **金鑰申請入口**：[https://console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
* **金鑰前綴格式**：`sk-ant-...`
* **目前整合架構**：Anthropic New Generation 5.x 世代

| 模型名稱 | API Model ID | 系統推薦定位 | PIRLS 命題實務特性 |
| :--- | :--- | :--- | :--- |
| **Claude Sonnet 5.5** | `claude-sonnet-5-5` | 🌟 **【文學首選・推薦主力】** | 智慧與速度的極致平衡。文學故事文筆細膩自然、最少機器腔；四層次設題邏輯嚴密。 |
| **Claude Opus 5.5** | `claude-opus-5-5` | 🏛️ **頂規深度推理** | 頂尖推論大腦，專門用於高難度素養題、第四層次批判評斷與嚴密客觀評分規準。 |
| **Claude Haiku 5.5** | `claude-haiku-5-5` | ⚡ **極速輕巧** | 快速問答、大量文字處理、隨堂小測驗首選，出題成本極低。 |
| **Claude Fable 5.1** | `claude-fable-5-1` | 🔬 **高難度專題推論** | 適合跨章節、跨學門的高難度專題長篇分析任務。 |

> **⚠️ 退役防護記錄**：
> * `claude-sonnet-4-5-20250929` 為 Deprecated 且預定於 2026 年 11 月 30 日關閉，系統已主動下線。
> * 若本地 LocalStorage 記住舊的 `3-5` 系列，進入系統時自動平滑遷移至 `claude-sonnet-5-5`。

---

## 四、Groq 極速晶片官方模型清單

* **官方平臺**：Groq Cloud Console
* **金鑰申請入口**：[https://console.groq.com/keys](https://console.groq.com/keys)
* **金鑰前綴格式**：`gsk_...`
* **核心晶片架構**：LPU 推論引擎（2~3 秒瞬時完成全卷）

| 模型名稱 | API Model ID | 系統推薦定位 | PIRLS 命題實務特性 |
| :--- | :--- | :--- | :--- |
| **GPT OSS 120B** | `openai/gpt-oss-120b` | 🏛️ **【實測唯一穩定・推薦首選】** | **實測唯一穩定可用之旗艦主力**！120B 大型推理模型，131,072 Context Window，繁體中文出題品質極高、第四層批判評斷設題最嚴密。 |
| **Llama 3.1 8B Instant** | `llama-3.1-8b-instant` | 🚀 **極速輕量模型** | 體積較小、反應快速，適合簡單文字測試（部分帳號若無法調用將自動備援切換至 120B）。 |
| **Llama 3.3 70B Versatile** | `llama-3.3-70b-versatile` | 🌟 **高階思維旗艦** | Meta 開源旗艦（若遇速率限制或存取限制將自動無縫備援至 120B）。 |
| **GPT OSS 20B** | `openai/gpt-oss-20b` | ⚡ **均衡高吞吐** | 推論速度快、適合大量文字處理。 |

> **⚠️ 智慧容錯與實測紀錄**：
> * **實測結論**：線上真實環境實測確認，Groq 目前唯一穩定可調用且推論成功的文字模型為 **`openai/gpt-oss-120b`**。
> * **預設推薦鎖定**：系統已全面將 Groq 預設推薦模型鎖定為 `openai/gpt-oss-120b`，前端與後端優先序一致。
> * **後端自動備援保底**：若使用者手動選用 8B、70B 或 20B 遇到 400、404、413、429 等任何存取或限速異常，系統後端自動無縫切換至 `openai/gpt-oss-120b` 重新生成，確保教師出題 100% 成功。
> * 語音模型（`whisper-large-v3` / `whisper-large-v3-turbo`）因非文字對話模型，系統已明確剔除避免 400 報錯。

---

## 五、DeepSeek 官方模型清單

* **官方平臺**：DeepSeek 開放平台
* **金鑰申請入口**：[https://platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys)
* **儲值充值入口**：[https://platform.deepseek.com/top_up](https://platform.deepseek.com/top_up)
* **金鑰前綴格式**：`sk-...`
* **計費特性**：**採預先儲值扣款制**（帳戶餘額為 0 時會回傳 `402 Insufficient Balance`，無永久免費額度）。

| 模型名稱 | 官方 API Model ID | 系統推薦定位 | PIRLS 命題實務特性 |
| :--- | :--- | :--- | :--- |
| **DeepSeek-V3 / Chat** | `deepseek-chat` | 💬 **【官方標準推薦・穩定高相容】** | 官方全功能主力模型，支援非思考流、成語典故地道、100% 廣泛相容各大帳號。 |
| **DeepSeek V4.1 Flash** | `deepseek-flash` | ⚡ **新世代極速推論** | 新世代架構，支援文字、視覺與推理（若個別帳號未開放自動備援至 `deepseek-chat`）。 |
| **DeepSeek-R1 / Reasoner** | `deepseek-reasoner` | 🧠 **深度思維鏈推理** | 專攻思維鏈 CoT 深度推理，適合第四層次批判評斷與客觀評分規準。 |

> **⚠️ 智慧容錯與儲值注意事項**：
> * **雙向智慧自癒**：系統全面支援 `deepseek-chat` 與 `deepseek-flash` 雙向自癒切換。若個別模型因帳號權限或端點未支援報錯 400/404，系統會自動切換重試，無須人工手動修改。
> * **餘額主動檢驗**：金鑰驗證時會主動透過 `https://api.deepseek.com/user/balance` 檢查餘額；若餘額為 0 將即時提醒教師前往平台儲值，避免出題時遇到 402 錯誤。

---

## 六、OpenAI 官方模型清單

* **官方平臺**：OpenAI Platform
* **金鑰申請入口**：[https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
* **金鑰前綴格式**：`sk-proj-...` 或 `sk-...`

| 模型名稱 | API Model ID | 系統推薦定位 | PIRLS 命題實務特性 |
| :--- | :--- | :--- | :--- |
| **GPT-4o Mini** | `gpt-4o-mini` | ⚡ **【推薦首選・性價比之王】** | 速度快、成本低，國際閱讀素養標準設題穩定可靠。 |
| **GPT-4o** | `gpt-4o` | 🌟 **全能旗艦** | 國際通用基準模型，在科普說明文與圖文綜合分析上表現標準。 |
| **o3-mini** | `o3-mini` | 🧠 **深度思維鏈推理** | 針對第四層次批判檢驗與客觀多維度評分規準制定嚴謹。 |

---

## 七、OpenRouter 聚合網關

* **官方平臺**：OpenRouter
* **金鑰申請入口**：[https://openrouter.ai/keys](https://openrouter.ai/keys)
* **金鑰前綴格式**：`sk-or-v1-...`
* **特色**：單一把 API Key 自由調度全球各家廠商模型。
* **推薦模型配置**：
  * `deepseek/deepseek-chat`（高性價比繁中文學）
  * `openai/gpt-4o-mini`（國際標準輕量模型）
  * `meta-llama/llama-3.3-70b-instruct`（開源頂級旗艦）

---

## 八、自建伺服器 / OpenCode GO

* **官方平臺**：校園內部私有雲或自建推論伺服器（vLLM、Ollama、OneAPI、OpenCode）
* **端點格式**：支援自訂 OpenAI 相容之 `Base URL`（例如 `https://api.opencode.ai/v1`）
* **預設模型選項**：`deepseek-chat`、`gpt-4o`、`claude-3-5-sonnet`

---

## 九、模型生命週期管理規範 (Deprecation Policy)

為了防止教育現場因廠商突然停止服務而影響教學出題，開發團隊依循以下管理方針：

1. **提前淘汰 Deprecated 模型**：
   * 凡廠商公佈之預定關閉期小於 60 天（如 Sonnet 4.5、Gemini 1.5），即刻自前端選單移除。
2. **本地 LocalStorage 自動平滑遷移機制**：
   * 當教師瀏覽器快取儲存舊模型 ID 時，代碼在載入時必須具備 `models[provider] = newModel` 的清洗邏輯，禁止引導教師手動清除快取。
3. **版本更迭檢核流程**：
   * 每當有新世代模型發佈，依序執行：
     1. 更新 [`docs/AI_MODELS_REGISTRY.md`](file:///d:/antigravity/Pirls/docs/AI_MODELS_REGISTRY.md) 文件。
     2. 更新後端 Provider 調用邏輯與 Fallback Chain。
     3. 更新 [`src/app/api/ai/verify-key/route.ts`](file:///d:/antigravity/Pirls/src/app/api/ai/verify-key/route.ts) 驗證回饋。
     4. 更新前端 [`src/app/dashboard/teacher/settings/ai/page.tsx`](file:///d:/antigravity/Pirls/src/app/dashboard/teacher/settings/ai/page.tsx) 與 [`src/app/dashboard/teacher/create/components/AiModelSelector.tsx`](file:///d:/antigravity/Pirls/src/app/dashboard/teacher/create/components/AiModelSelector.tsx)。
     5. 執行 `npm run typecheck` 與 `npm run build` 通過編譯並發布上線。

---

*PIRLS 智慧閱讀素養評量平臺 • 模型規範管理委員會 著*
