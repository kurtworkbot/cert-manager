# CertManager - Production ACME Platform

A production-ready ACME certificate management platform with multi-DNS provider support, auto-renewal, and monitoring.

## Features

- 🔐 **Authentication** - JWT-based auth with role-based access control (Admin/User/Viewer)
- 📜 **Certificate Management** - Create, manage, and track SSL/TLS certificates
- 🔄 **Auto-Renewal** - Automatic certificate renewal before expiration
- 🌐 **Multi-DNS Provider** - Support for Cloudflare, DuckDNS, Route53, DigitalOcean, GoDaddy
- 🏢 **Multi-CA** - Let's Encrypt and ZeroSSL support
- 📊 **Monitoring** - Health checks, metrics, and drift detection
- 🐳 **Production Ready** - Docker, Docker Compose, GitHub Actions CI/CD

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Visit http://localhost:3000

### Production with Docker

```bash
# Copy environment file
cp .env.production .env

# Edit .env with your values
vim .env

# Build and run
docker-compose up -d
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth | Login or register |
| POST | /api/v1/auth/refresh | Refresh access token |
| POST | /api/v1/auth/logout | Logout |
| GET | /api/v1/auth/me | Get current user |

### Certificates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/certificates | List certificates |
| POST | /api/v1/certificates | Create certificate |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/health | Health check |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| JWT_SECRET | Secret for JWT tokens | Yes |
| JWT_REFRESH_SECRET | Secret for refresh tokens | Yes |
| DATABASE_URL | Database connection | No (default: sqlite.db) |

## Tech Stack

- **Framework**: Next.js 16
- **Database**: SQLite + Drizzle ORM
- **Auth**: JWT + bcrypt
- **Validation**: Zod
- **Testing**: Vitest

## License

MIT
