# Tasks: User Authentication

## Phase 1: 資料庫擴充

- [x] **1.1** 新增 sessions 表
  - File: `src/lib/db.ts`
  - 欄位: id, session_token, user_id, expires_at, created_at

- [x] **1.2** 新增 Session CRUD 函數
  - createSession, getSession, deleteSession, cleanExpiredSessions

## Phase 2: 認證 API

- [x] **2.1** 登入 API
  - File: `src/app/api/auth/login/route.ts`
  - 驗證帳號密碼 (從環境變數)
  - 建立 Session，設定 HttpOnly Cookie

- [x] **2.2** 登出 API
  - File: `src/app/api/auth/logout/route.ts`
  - 刪除 Session，清除 Cookie

- [x] **2.3** 驗證狀態 API
  - File: `src/app/api/auth/me/route.ts`
  - 返回當前登入狀態

## Phase 3: Middleware 保護

- [x] **3.1** 建立認證 Middleware
  - File: `src/middleware.ts`
  - 檢查 Session Cookie
  - 未登入重導向至 /login
  - 排除 /login, /api/auth/* 路徑

## Phase 4: 登入頁面

- [x] **4.1** 建立登入頁面
  - File: `src/app/login/page.tsx`
  - 帳號密碼表單
  - 錯誤訊息顯示
  - 登入成功重導向

- [x] **4.2** 登入頁面樣式
  - 簡潔的置中表單
  - 與主題一致的深色風格

## Phase 5: UI 整合

- [x] **5.1** Header 登出按鈕
  - File: `src/app/page.tsx`
  - 右上角顯示登出按鈕

- [x] **5.2** 環境變數設定
  - 更新 .env.example
  - 新增 ADMIN_USERNAME, ADMIN_PASSWORD

## Phase 6: 測試驗證

- [ ] **6.1** 測試未登入存取被阻擋
- [ ] **6.2** 測試登入流程
- [ ] **6.3** 測試 Session 過期
- [ ] **6.4** 測試登出功能
