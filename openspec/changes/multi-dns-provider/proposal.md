# Proposal: Multi DNS Provider Support

## Intent
擴展 DNS-01 Challenge 支援多個 DNS 供應商，讓使用者可依據其 Domain 託管商選擇適合的驗證方式。

## Problem Statement
目前僅支援 Cloudflare，限制了使用者選擇：
- 使用 Route53 的 AWS 用戶無法使用
- 使用 GoDaddy、Namecheap 等的用戶無法使用
- 無法自訂 DNS API 整合

## Proposed Solution
建立 DNS Provider 抽象層，實作多個常用供應商：

### 支援的 Provider
1. **Cloudflare** (已有)
2. **AWS Route53**
3. **GoDaddy**
4. **DigitalOcean**
5. **Manual** (手動輸入 TXT 記錄)

### 架構設計
```
src/lib/dns-providers/
├── index.ts          # Provider Factory
├── types.ts          # Interface 定義
├── cloudflare.ts     # Cloudflare 實作
├── route53.ts        # AWS Route53 實作
├── godaddy.ts        # GoDaddy 實作
├── digitalocean.ts   # DigitalOcean 實作
└── manual.ts         # 手動模式
```

## Scope
### In Scope
- DNS Provider Interface 抽象
- 4+ Provider 實作
- UI 選擇器更新
- 環境變數文件更新

### Out of Scope
- DNS Provider 憑證管理 UI
- 動態新增自訂 Provider

## Success Criteria
- [ ] 可選擇不同 DNS Provider
- [ ] Route53 Challenge 成功
- [ ] GoDaddy Challenge 成功
- [ ] Manual 模式可顯示 TXT 記錄供手動設定
