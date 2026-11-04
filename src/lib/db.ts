/**
 * PIRLS 資料庫模組統一對外進入點
 * 透過模組化 Barrel Export 提供 100% 向後相容之所有函式與型別。
 * 內部核心實作已模組化拆分至 src/lib/db/ 目錄下：
 * - core.ts: Firestore 連線、本地快取、Blob 備援與全域同步
 * - users.ts: 使用者帳號、密碼雜湊、權限審核、教師 CRUD 與原子刪除
 * - classes.ts: 班級、學生名冊批次匯入、座號修改、快速登入目錄
 * - test-papers.ts: 試卷出題存檔、段落插圖綁定、公開狀態、班級派卷
 * - submissions.ts: 學生作答批改、素養四維度換算、PIRLS 標準量尺與班級 PR 常模
 */

export * from './db/index';
