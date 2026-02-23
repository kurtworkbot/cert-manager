# Production ACME Platform - Technical Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                   │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                     API Layer (Next.js API Routes)          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │  Auth    │ │   Cert    │ │   DNS    │ │ Monitor  │      │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘      │
└───────┼────────────┼────────────┼────────────┼─────────────┘
        │            │            │            │
┌───────▼────────────▼────────────▼────────────▼─────────────┐
│                   Business Logic Layer                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │  Auth   │ │   ACME   │ │   DNS    │ │  Sched   │      │
│  │ Service │ │  Client  │ │ Provider │ │ uler    │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                   Data Layer (Drizzle + SQLite)             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│  │  Users   │ │ Certs    │ │  Logs    │                    │
│  └──────────┘ └──────────┘ └──────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

## Authentication Design

### JWT Structure

```typescript
interface JWTPayload {
  userId: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  iat: number;
  exp: number;
}
```

### Token Storage
- **Access Token**: In-memory (React state), expires in 15 min
- **Refresh Token**: HTTP-only cookie, expires in 7 days

### Password Hashing
- Use bcrypt with cost factor 12

## API Design

### Versioning
- Base path: `/api/v1/`
- Deprecated: `/api/` redirects to `/api/v1/`

### Error Response Format
```typescript
interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

### Rate Limiting
- Use in-memory store for single instance
- For multi-instance: Redis-based rate limiting

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin', 'user', 'viewer')) DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Certificates Table (Extended)
```sql
ALTER TABLE certificates ADD COLUMN user_id TEXT REFERENCES users(id);
ALTER TABLE certificates ADD COLUMN auto_renew BOOLEAN DEFAULT true;
```

### Audit Logs Table
```sql
CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Monitoring Design

### Health Check
- `/api/v1/health` - Returns:
  ```json
  {
    "status": "healthy",
    "checks": {
      "database": "ok",
      "dnsProviders": { "cloudflare": "ok", "duckdns": "ok" }
    },
    "timestamp": "2024-01-01T00:00:00Z"
  }
  ```

### Metrics (Prometheus)
- `acme_certificates_total` - Total certificates
- `acme_certificates_expiring_soon` - Certificates expiring in 7 days
- `acme_api_requests_total` - Total API requests
- `acme_api_request_duration_seconds` - Request duration

## Testing Strategy

### Unit Tests
- `src/lib/*.test.ts` - Utility functions
- `src/services/*.test.ts` - Business logic

### Integration Tests
- `tests/api/*.test.ts` - API endpoint tests
- Use supertest for HTTP assertions

### E2E Tests
- `tests/e2e/*.spec.ts` - Playwright tests
- Critical flows: login, create cert, renew cert

## Deployment

### Dockerfile
- Multi-stage build (builder + runner)
- Non-root user
- Health check included

### Docker Compose
- App service
- Optional: Redis for rate limiting
- Volume for SQLite persistence

### GitHub Actions
- Lint → Build → Test → Deploy
