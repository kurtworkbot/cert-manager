import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './db';
import { users, userAuditLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const SALT_ROUNDS = 12;

export interface AuthUser {
  userId: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateTokens(user: AuthUser): TokenPair {
  const accessToken = jwt.sign(
    { userId: user.userId, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { userId: user.userId, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): AuthUser {
  return jwt.verify(token, JWT_SECRET) as AuthUser;
}

export function verifyRefreshToken(token: string): { userId: string } {
  const payload = jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string; type: string };
  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  return { userId: payload.userId };
}

export async function registerUser(
  email: string,
  password: string,
  role: 'admin' | 'user' | 'viewer' = 'user'
) {
  // Check if user exists
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existing) {
    throw new Error('User already exists');
  }

  const passwordHash = await hashPassword(password);
  const userId = uuidv4();

  await db.insert(users).values({
    id: userId,
    email,
    passwordHash,
    role,
  });

  return { userId, email, role };
}

export async function loginUser(email: string, password: string, ip?: string, userAgent?: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    // Log failed attempt
    await db.insert(userAuditLogs).values({
      id: uuidv4(),
      userId: user.id,
      action: 'login_failed',
      ipAddress: ip,
      userAgent,
      details: { reason: 'Invalid password' },
    });
    throw new Error('Invalid credentials');
  }

  // Log successful login
  await db.insert(userAuditLogs).values({
    id: uuidv4(),
    userId: user.id,
    action: 'login_success',
    ipAddress: ip,
    userAgent,
  });

  const tokens = generateTokens({
    userId: user.id,
    email: user.email,
    role: user.role as 'admin' | 'user' | 'viewer',
  });

  return {
    user: { userId: user.id, email: user.email, role: user.role },
    tokens,
  };
}

export async function refreshTokens(refreshToken: string) {
  const { userId } = verifyRefreshToken(refreshToken);
  
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error('User not found');
  }

  const tokens = generateTokens({
    userId: user.id,
    email: user.email,
    role: user.role as 'admin' | 'user' | 'viewer',
  });

  return tokens;
}

export async function getUserById(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
