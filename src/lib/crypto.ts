import { scrypt, randomFill, createCipheriv, createDecipheriv } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

const algorithm = 'aes-256-gcm';
const password = process.env.ENCRYPTION_KEY || 'default-insecure-key-do-not-use-in-prod'; 
// In production, enforce ENCRYPTION_KEY via environment variable validation

/**
 * Encrypts text using AES-256-GCM.
 * format: salt:iv:encrypted:authTag
 */
export async function encrypt(text: string): Promise<string> {
  const salt = await new Promise<Buffer>((resolve, reject) => {
    randomFill(Buffer.alloc(16), (err, buf) => {
      if (err) reject(err);
      resolve(buf);
    });
  });

  // Derive key from password and salt
  const key = (await scryptAsync(password, salt, 32)) as Buffer;

  const iv = await new Promise<Buffer>((resolve, reject) => {
    randomFill(Buffer.alloc(12), (err, buf) => { // GCM uses 12-byte IV
      if (err) reject(err);
      resolve(buf);
    });
  });

  const cipher = createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${salt.toString('hex')}:${iv.toString('hex')}:${encrypted}:${authTag}`;
}

/**
 * Decrypts text encrypted with the above encrypt function.
 */
export async function decrypt(text: string): Promise<string> {
  const [saltHex, ivHex, encryptedHex, authTagHex] = text.split(':');
  if (!saltHex || !ivHex || !encryptedHex || !authTagHex) {
    throw new Error('Invalid encrypted text format');
  }

  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const key = (await scryptAsync(password, salt, 32)) as Buffer;

  const decipher = createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
