# Tasks: Certificate Detail Page

## Phase 1: API 擴充

- [x] **1.1** 建立 Hook 歷史查詢 API
  - File: `src/app/api/certificates/[id]/hooks/route.ts`
  - 返回該憑證的所有 Hook 執行記錄

- [x] **1.2** 擴充 GET /api/certificates/[id]
  - File: `src/app/api/certificates/[id]/route.ts`
  - 增加返回 certificate, private_key 完整內容

## Phase 2: 詳情頁面 UI

- [x] **2.1** 建立詳情頁面路由
  - File: `src/app/certificates/[id]/page.tsx`
  - 基本頁面結構與資料載入

- [x] **2.2** 憑證資訊區塊
  - 顯示 Domain, Status, 發行日, 到期日
  - 狀態徽章 (Valid/Expiring/Expired)

- [x] **2.3** 憑證內容區塊
  - Certificate PEM 顯示（程式碼區塊）
  - Private Key 顯示（預設隱藏，點擊顯示）
  - 複製到剪貼簿按鈕

- [x] **2.4** 下載功能
  - 下載 .crt 檔案
  - 下載 .key 檔案
  - 下載 .pem bundle（合併）

- [x] **2.5** Hook 歷史區塊
  - 顯示執行時間、成功/失敗、輸出摘要
  - 可展開查看完整輸出

## Phase 3: 導航整合

- [x] **3.1** 儀表板連結
  - File: `src/app/page.tsx`
  - 點擊憑證列表項目可進入詳情頁

- [x] **3.2** 返回按鈕
  - 詳情頁加入返回儀表板按鈕

## Phase 4: 測試驗證

- [ ] **4.1** 手動測試所有功能
- [ ] **4.2** 確認私鑰保護機制正常
