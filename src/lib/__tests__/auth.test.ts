import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../auth';

describe('Password Utilities', () => {
  const testPassword = 'TestPassword123';

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const hash = await hashPassword(testPassword);
      expect(hash).toBeDefined();
      expect(hash).not.toBe(testPassword);
      expect(hash.startsWith('$2')).toBe(true);
    });

    it('should produce different hashes for same password (random salt)', async () => {
      const hash1 = await hashPassword(testPassword);
      const hash2 = await hashPassword(testPassword);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const hash = await hashPassword(testPassword);
      const valid = await verifyPassword(testPassword, hash);
      expect(valid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hash = await hashPassword(testPassword);
      const valid = await verifyPassword('wrongpassword', hash);
      expect(valid).toBe(false);
    });
  });
});
