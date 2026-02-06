# CertManager - Certificate Automation Platform

A modern SSL/TLS certificate management platform with ACME automation.

## Features

- 🔐 **Certificate Dashboard** - View domain names, status, and expiry dates
- 🔄 **ACME Integration** - Let's Encrypt / ZeroSSL support
- 🌐 **HTTP-01 Challenge** - Automatic `.well-known/acme-challenge` handling
- 🔑 **DNS-01 Challenge** - TXT record validation (Cloudflare support)
- ⚡ **One-Click Renew** - Manual and automatic renewal
- 🪝 **Hook System** - Execute custom scripts after certificate renewal

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your settings

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

```env
# ACME Configuration
ACME_EMAIL=admin@example.com
ACME_PRODUCTION=false  # Set to true for production certs

# Cloudflare (for DNS-01 challenge)
CLOUDFLARE_API_TOKEN=your_api_token
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/certificates` | List all certificates |
| POST | `/api/certificates` | Create new certificate |
| GET | `/api/certificates/:id` | Get certificate details |
| PATCH | `/api/certificates/:id` | Update certificate |
| DELETE | `/api/certificates/:id` | Delete certificate |
| POST | `/api/certificates/:id/renew` | Renew certificate |

## Hook System

When a certificate is renewed, you can execute a custom script. The following environment variables are available:

- `$CERT_DOMAIN` - The domain name
- `$CERT_CERTIFICATE` - The certificate PEM
- `$CERT_PRIVATE_KEY` - The private key PEM

Example hook script:
```bash
#!/bin/bash
# Deploy to nginx
echo "$CERT_CERTIFICATE" > /etc/nginx/ssl/${CERT_DOMAIN}.crt
echo "$CERT_PRIVATE_KEY" > /etc/nginx/ssl/${CERT_DOMAIN}.key
nginx -s reload
```

## Tech Stack

- **Framework**: Next.js 15
- **Styling**: TailwindCSS
- **Database**: SQLite (better-sqlite3)
- **ACME Client**: acme-client
- **Icons**: Lucide React

## License

MIT
