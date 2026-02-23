import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// User roles
export const userRoles = ['admin', 'user', 'viewer'] as const;
export type UserRole = typeof userRoles[number];

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: userRoles }).notNull().default('user'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Certificate operations audit log (user actions)
export const userAuditLogs = sqliteTable('user_audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  action: text('action').notNull(), // 'login', 'create_cert', 'update_cert', 'delete_cert', etc.
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  details: text('details', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const providers = sqliteTable('providers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type', { enum: ['duckdns', 'cloudflare', 'route53', 'digitalocean', 'godaddy', 'namecheap'] }).notNull(),
  config: text('config', { mode: 'json' }).notNull(),
});

export const certificates = sqliteTable('certificates', {
  id: text('id').primaryKey(),
  domain: text('domain').notNull(),
  providerId: text('provider_id').references(() => providers.id).notNull(),
  userId: text('user_id').references(() => users.id), // Owner of the certificate
  caProvider: text('ca_provider', { enum: ['letsencrypt', 'zerossl'] }).notNull(),
  status: text('status', { enum: ['active', 'expired', 'error'] }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  lastRenewed: integer('last_renewed', { mode: 'timestamp' }),
  fingerprint: text('fingerprint'), // SHA256 fingerprint for drift detection
});

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  event: text('event', { enum: ['renew_success', 'renew_fail', 'config_change', 'deploy_success', 'monitoring_drift', 'health_check'] }).notNull(),
  details: text('details', { mode: 'json' }),
  timestamp: integer('timestamp', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const deploymentTargets = sqliteTable('deployment_targets', {
  id: text('id').primaryKey(),
  certId: text('cert_id').references(() => certificates.id).notNull(),
  type: text('type', { enum: ['file', 'command', 'webhook'] }).notNull(),
  config: text('config', { mode: 'json' }).notNull(),
});

export const acmeAccounts = sqliteTable('acme_accounts', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  caProvider: text('ca_provider', { enum: ['letsencrypt', 'zerossl'] }).notNull(),
  privateKey: text('private_key').notNull(), // Encrypted
  accountUrl: text('account_url').notNull(),
});

export type Provider = typeof providers.$inferSelect;
export type User = typeof users.$inferSelect;
export type Certificate = typeof certificates.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type UserAuditLog = typeof userAuditLogs.$inferSelect;
export type DeploymentTarget = typeof deploymentTargets.$inferSelect;
export type AcmeAccount = typeof acmeAccounts.$inferSelect;
