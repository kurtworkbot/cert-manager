# Proposal: User Authentication

## Intent
為 CertManager 加入使用者認證機制，保護敏感的憑證管理操作，防止未授權存取。

## Problem Statement
目前 CertManager 完全無認證保護：
- 任何人可存取儀表板
- 任何人可新增/刪除憑證
- 私鑰暴露風險高
- 無法追蹤操作者

## Proposed Solution
實作基於 Session 的本地認證系統：
1. 登入頁面 (`/login`)
2. Session-based 認證（使用 cookie）
3. API 路由保護 middleware
4. 登出功能

### 認證方式選擇
採用**單一管理員帳號**模式（Simple Auth），適合個人/小團隊使用：
- 帳號密碼存於環境變數
- 密碼使用 bcrypt 加密驗證
- Session 存於 SQLite

## Scope
### In Scope
- 登入頁面 UI
- 登入 API (`POST /api/auth/login`)
- 登出 API (`POST /api/auth/logout`)
- Session 管理（SQLite sessions 表）
- API Middleware 保護
- 未登入重導向至 /login

### Out of Scope
- 多使用者支援
- OAuth / SSO 整合
- 密碼重設功能
- 2FA 雙因素認證

## Success Criteria
- [ ] 未登入使用者無法存取儀表板
- [ ] 未登入 API 請求返回 401
- [ ] 登入成功後重導向至儀表板
- [ ] Session 逾時自動登出 (24h)
- [ ] 登出後清除 Session
