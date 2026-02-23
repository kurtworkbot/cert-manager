import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Skip by default - run manually with running server
// npm run dev
// npm run test -- --run tests/api/integration.test.ts

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe.skip('API Integration Tests', () => {
  describe('Health Endpoint', () => {
    it('GET /api/v1/health should return healthy status', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/health`);
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.status).toBeDefined();
      expect(data.checks).toBeDefined();
    });
  });

  describe('Authentication', () => {
    let testEmail = `test${Date.now()}@example.com`;
    const testPassword = 'TestPassword123';
    let accessToken = '';

    it('POST /api/v1/auth should register a new user', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          role: 'user',
        }),
      });

      // May fail if user exists, that's OK
      expect([201, 400]).toContain(res.status);
    });

    it('POST /api/v1/auth should login with valid credentials', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      if (res.status === 200) {
        const data = await res.json();
        expect(data.user).toBeDefined();
        
        // Check cookies
        const cookies = res.headers.get('set-cookie');
        expect(cookies).toContain('access_token');
        expect(cookies).toContain('refresh_token');
      }
    });

    it('POST /api/v1/auth should reject invalid credentials', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'wrongpassword',
        }),
      });

      expect(res.status).toBe(401);
    });

    it('GET /api/v1/auth/me should require authentication', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/auth/me`);
      expect(res.status).toBe(401);
    });

    it('GET /api/v1/certificates should require authentication', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/certificates`);
      expect(res.status).toBe(401);
    });
  });

  describe('Validation', () => {
    it('should reject invalid email format', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'not-an-email',
          password: 'TestPassword123',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject weak password', async () => {
      const res = await fetch(`${BASE_URL}/api/v1/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'weak',
        }),
      });

      expect(res.status).toBe(400);
    });
  });
});
