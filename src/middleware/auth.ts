import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthUser {
  userId: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
}

export interface AuthRequest extends NextRequest {
  user?: AuthUser;
}

export async function authMiddleware(req: AuthRequest) {
  // Skip auth for public routes
  const publicPaths = ['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/health'];
  if (publicPaths.some(path => req.nextUrl.pathname.startsWith(path))) {
    return null;
  }

  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '') || req.cookies.get('access_token')?.value;

  if (!token) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'No token provided' } },
      { status: 401 }
    );
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    return null;
  } catch {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } },
      { status: 401 }
    );
  }
}

export function requireRole(...allowedRoles: ('admin' | 'user' | 'viewer')[]) {
  return (req: AuthRequest) => {
    if (!req.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
        { status: 403 }
      );
    }

    return null;
  };
}
