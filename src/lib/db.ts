import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'certs.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',
    issued_at TEXT,
    expires_at TEXT,
    certificate TEXT,
    private_key TEXT,
    challenge_type TEXT DEFAULT 'http',
    dns_provider TEXT,
    auto_renew INTEGER DEFAULT 1,
    hook_script TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS challenge_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT NOT NULL,
    token TEXT NOT NULL,
    key_authorization TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS hook_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    certificate_id INTEGER,
    executed_at TEXT DEFAULT CURRENT_TIMESTAMP,
    success INTEGER,
    output TEXT,
    FOREIGN KEY (certificate_id) REFERENCES certificates(id)
  );
`);

export interface Certificate {
  id: number;
  domain: string;
  status: 'pending' | 'valid' | 'expired' | 'error';
  issued_at: string | null;
  expires_at: string | null;
  certificate: string | null;
  private_key: string | null;
  challenge_type: 'http' | 'dns';
  dns_provider: string | null;
  auto_renew: boolean;
  hook_script: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChallengeToken {
  id: number;
  domain: string;
  token: string;
  key_authorization: string;
  created_at: string;
}

export function getAllCertificates(): Certificate[] {
  const stmt = db.prepare('SELECT * FROM certificates ORDER BY domain');
  return stmt.all() as Certificate[];
}

export function getCertificate(id: number): Certificate | undefined {
  const stmt = db.prepare('SELECT * FROM certificates WHERE id = ?');
  return stmt.get(id) as Certificate | undefined;
}

export function getCertificateByDomain(domain: string): Certificate | undefined {
  const stmt = db.prepare('SELECT * FROM certificates WHERE domain = ?');
  return stmt.get(domain) as Certificate | undefined;
}

export function createCertificate(data: {
  domain: string;
  challenge_type?: 'http' | 'dns';
  dns_provider?: string;
  auto_renew?: boolean;
  hook_script?: string;
}): Certificate {
  const stmt = db.prepare(`
    INSERT INTO certificates (domain, challenge_type, dns_provider, auto_renew, hook_script)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.domain,
    data.challenge_type || 'http',
    data.dns_provider || null,
    data.auto_renew !== false ? 1 : 0,
    data.hook_script || null
  );
  return getCertificate(result.lastInsertRowid as number)!;
}

export function updateCertificate(id: number, data: Partial<Certificate>): Certificate | undefined {
  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }
  if (data.issued_at !== undefined) { updates.push('issued_at = ?'); values.push(data.issued_at); }
  if (data.expires_at !== undefined) { updates.push('expires_at = ?'); values.push(data.expires_at); }
  if (data.certificate !== undefined) { updates.push('certificate = ?'); values.push(data.certificate); }
  if (data.private_key !== undefined) { updates.push('private_key = ?'); values.push(data.private_key); }
  if (data.challenge_type !== undefined) { updates.push('challenge_type = ?'); values.push(data.challenge_type); }
  if (data.dns_provider !== undefined) { updates.push('dns_provider = ?'); values.push(data.dns_provider); }
  if (data.auto_renew !== undefined) { updates.push('auto_renew = ?'); values.push(data.auto_renew ? 1 : 0); }
  if (data.hook_script !== undefined) { updates.push('hook_script = ?'); values.push(data.hook_script); }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  const stmt = db.prepare(`UPDATE certificates SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...values);
  return getCertificate(id);
}

export function deleteCertificate(id: number): void {
  const stmt = db.prepare('DELETE FROM certificates WHERE id = ?');
  stmt.run(id);
}

export function saveChallengeToken(domain: string, token: string, keyAuth: string): void {
  const stmt = db.prepare(`
    INSERT INTO challenge_tokens (domain, token, key_authorization)
    VALUES (?, ?, ?)
  `);
  stmt.run(domain, token, keyAuth);
}

export function getChallengeToken(token: string): ChallengeToken | undefined {
  const stmt = db.prepare('SELECT * FROM challenge_tokens WHERE token = ?');
  return stmt.get(token) as ChallengeToken | undefined;
}

export function deleteChallengeTokens(domain: string): void {
  const stmt = db.prepare('DELETE FROM challenge_tokens WHERE domain = ?');
  stmt.run(domain);
}

export function logHookExecution(certificateId: number, success: boolean, output: string): void {
  const stmt = db.prepare(`
    INSERT INTO hook_logs (certificate_id, success, output)
    VALUES (?, ?, ?)
  `);
  stmt.run(certificateId, success ? 1 : 0, output);
}

export default db;
