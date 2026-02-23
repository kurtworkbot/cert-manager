# Delta Specs for Production ACME Platform

## ADDED Requirements

### Authentication System

#### Requirement: JWT-based Authentication
The system MUST support JWT-based authentication for all protected endpoints.

#### Scenario: User Login
- GIVEN a user with valid credentials
- WHEN the user POSTs to /api/auth/login
- THEN a JWT access token (15min) and refresh token (7 days) are returned

#### Scenario: Token Refresh
- GIVEN a valid refresh token
- WHEN the user POSTs to /api/auth/refresh
- THEN a new access token is returned

#### Requirement: Role-Based Access Control
The system MUST support three roles: Admin, User, Viewer.

| Role | Permissions |
|------|-------------|
| Admin | Full access, manage users, manage certificates |
| User | Manage own certificates, view all |
| Viewer | Read-only access |

### API Requirements

#### Requirement: Request Validation
All API requests MUST be validated using Zod schemas.

#### Requirement: Rate Limiting
The system MUST implement rate limiting:
- 100 requests/minute for authenticated users
- 10 requests/minute for unauthenticated endpoints

#### Requirement: Audit Logging
All sensitive operations MUST be logged with:
- Timestamp
- User ID
- Action
- IP Address
- Request Details

### Testing Requirements

#### Requirement: Unit Test Coverage
The system MUST maintain 80%+ code coverage.

#### Requirement: Test Types
- Unit tests for utilities and helpers
- Integration tests for API endpoints
- E2E tests for critical user flows

### Monitoring Requirements

#### Requirement: Health Check
The system MUST provide /api/health endpoint returning:
- Database connection status
- DNS provider connectivity
- Certificate expiration status

#### Requirement: Metrics
The system MUST expose Prometheus-compatible metrics at /api/metrics

## MODIFIED Requirements

### Certificate Management
- Existing certificate CRUD operations remain
- ADD: Certificate transfer between users (Admin only)
- ADD: Bulk certificate operations

### DNS Providers
- ADD: Connection status for each provider
- ADD: Automatic failover configuration

## REMOVED Requirements

### Legacy Features
- Anonymous API access (all endpoints now require auth)
- In-memory storage (must use SQLite/PostgreSQL)
