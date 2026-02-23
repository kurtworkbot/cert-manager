# Spec: CertManager V1 (MVP)

## 1. Overview
A centralized SSL/TLS certificate management platform that automates renewal, supports multiple DNS providers, and provides health monitoring.

## 2. Core Features (MVP)
### 2.1 Multi-DNS Provider Support (Tier 1)
- **DuckDNS**: (Primary) Simple API token integration.
- **Cloudflare**: (Secondary) API Token support for Zone management.

### 2.2 Multi-DNS Provider Support (Tier 2 - Enterprise/Cloud)
- **AWS Route53**: Access Key/Secret based auth. Support Hosted Zones.
- **Google Cloud DNS**: Service Account JSON auth.
- **DigitalOcean**: Personal Access Token auth.
- **GoDaddy**: API Key/Secret auth (Note: Requires separate Production/Test endpoints).
- **Namecheap**: XML-RPC API (Requires Whitelisted IP).

### 2.3 Plugin Architecture
- **Strategy Pattern**: All providers must implement `DnsProvider` interface (e.g., `createRecord`, `deleteRecord`).
- **Dynamic Loading**: Load providers based on configuration.

### 2.4 Multi-CA Support
- **Let's Encrypt**: (Primary) ACME v2 Staging/Production.
- **ZeroSSL**: (Secondary) EAB (External Account Binding) support.
- **Identity Management**: Encrypted storage for ACME Account Keys to prevent rate limits.

### 2.5 Automated Renewal Scheduler
- **Mechanism**: External Cron trigger (`POST /api/scheduler/trigger`) or Internal Node-Cron.
- **Policy**: Renew if < 30 days remaining.
- **Alerting**: Telegram notification on failure.

### 2.6 Deployment & Hooks
- **Purpose**: Deploy renewed certificates to target services (Nginx, Docker, etc.).
- **Strategy**:
  - **File Exporter**: Write `.pem` files to specified paths.
  - **Command Runner**: Execute shell commands (e.g., `systemctl reload nginx`) post-renewal.
  - **Webhook**: Notify external systems (e.g., Load Balancer).

### 2.7 Monitoring & Drift Detection
- **Dashboard**: Real-time status indicators (Red/Green) with manual trigger button.
- **Active Probing**: Periodically curl `https://domain.com` to verify the serving certificate matches the database record.
- **Alerting**: Critical (Expiry < 7 days) vs Warning (Renewal failed).

## 3. Tech Stack & Architecture
- **Framework**: Next.js 16 (App Router)
- **Database**: SQLite (better-sqlite3) with WAL mode enabled.
- **ORM**: Drizzle ORM (Recommended for type-safety and performance) or Raw SQL.
- **Security**:
  - API Tokens stored encrypted (AES-256-GCM).
  - Admin Authentication (Basic Auth or NextAuth).

## 4. Data Models
### Certificate
- `id` (uuid)
- `domain` (string)
- `provider_id` (fk)
- `ca_provider` (enum: letsencrypt, zerossl)
- `status` (active, expired, error)
- `expires_at` (datetime)
- `last_renewed` (datetime)

### Provider
- `id` (uuid)
- `name` (string)
- `type` (duckdns, cloudflare, route53, digitalocean, godaddy, namecheap)
- `config` (json, encrypted secrets)

### DeploymentTarget
- `id` (uuid)
- `cert_id` (fk)
- `type` (file, command, webhook)
- `config` (json)

### AuditLog
- `id` (uuid)
- `event` (renew_success, renew_fail, config_change, deploy_success)
- `details` (json)
- `timestamp` (datetime)

## 5. API Design
- `GET /api/certs`: List all managed certificates.
- `POST /api/certs`: Add new domain to track.
- `POST /api/certs/:id/renew`: Manual renewal trigger.
- `POST /api/certs/:id/deploy`: Manual deployment trigger.
- `GET /api/health`: System status check (DB, Scheduler).
- `POST /api/scheduler/trigger`: External cron entry point.
