# Proposal: Certificate Detail Page

## Intent
提供使用者查看單一憑證完整資訊的專屬頁面，包含憑證內容、私鑰（受保護）、以及相關操作歷史。

## Problem Statement
目前儀表板只顯示憑證摘要資訊（Domain、狀態、到期日）。使用者無法：
- 查看完整的憑證 PEM 內容
- 下載憑證檔案 (.crt, .key)
- 查看 Hook 執行歷史
- 查看憑證詳細屬性（發行者、序號、SAN 等）

## Proposed Solution
建立 `/certificates/[id]` 動態路由頁面，提供：
1. 憑證完整資訊顯示
2. 一鍵複製 / 下載功能
3. Hook 執行歷史清單
4. 快速操作（Renew、編輯 Hook、刪除）

## Scope
### In Scope
- 憑證詳情頁面 UI
- 憑證內容顯示（Certificate + Private Key）
- 下載功能 (.crt, .key, .pem bundle)
- Hook 歷史查詢 API
- 私鑰顯示保護（需確認才顯示）

### Out of Scope
- 憑證編輯功能（僅查看）
- 多憑證批量操作
- 憑證匯入功能

## Success Criteria
- [ ] 使用者可從儀表板點擊進入詳情頁
- [ ] 可查看完整憑證 PEM 內容
- [ ] 可下載 .crt 和 .key 檔案
- [ ] 可查看 Hook 執行歷史
- [ ] 私鑰預設隱藏，需點擊確認才顯示
