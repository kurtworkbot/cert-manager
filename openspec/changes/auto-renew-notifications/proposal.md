# Proposal: Auto-Renew Scheduler & Expiry Notifications

## Intent
自動化憑證續期流程，並在憑證即將到期時發送通知提醒。

## Problem Statement
- 手動續期容易遺忘，導致憑證過期
- 沒有預警機制，發現時往往已經太晚
- 需要人工監控所有憑證狀態

## Proposed Solution

### 1. Auto-Renew Scheduler
- Cron job 每天執行一次檢查
- 自動續期條件：`auto_renew = true` 且剩餘天數 < 30
- 記錄續期結果到 hook_logs

### 2. Expiry Notifications
- 支援多種通知管道：Email、Webhook、Telegram
- 通知時機：30天、14天、7天、3天、1天
- 避免重複通知（記錄已發送的通知）

### 3. 資料庫擴充
```sql
-- 通知記錄表
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY,
  certificate_id INTEGER,
  type TEXT,           -- 'expiry_30d', 'expiry_7d', etc.
  channel TEXT,        -- 'email', 'webhook', 'telegram'
  sent_at TEXT,
  FOREIGN KEY (certificate_id) REFERENCES certificates(id)
);

-- 通知設定表
CREATE TABLE notification_settings (
  id INTEGER PRIMARY KEY,
  channel TEXT UNIQUE,  -- 'email', 'webhook', 'telegram'
  enabled INTEGER,
  config TEXT           -- JSON config
);
```

## Success Criteria
- [ ] 自動續期每日執行
- [ ] 30天前開始發送到期通知
- [ ] 支援至少 2 種通知管道
- [ ] 不重複發送相同通知
