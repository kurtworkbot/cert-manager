import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyAccessToken } from '@/lib/auth';
import { errorHandler } from '@/middleware/error-handler';

// GET /api/v1/users - List users (admin only)
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'No token' } }, { status: 401 });
    }

    const currentUser = verifyAccessToken(token);

    // Admin only
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Admin access required' } }, { status: 403 });
    }

    const userList = await db.query.users.findMany();

    // Don't expose passwords
    const safeUsers = userList.map(u => ({
      id: u.id,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));

    return NextResponse.json({ users: safeUsers });
  } catch (err) {
    return errorHandler(err as Error, req);
  }
}

// PUT /api/v1/users - Update user role (admin only)
export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'No token' } }, { status: 401 });
    }

    const currentUser = verifyAccessToken(token);

    // Admin only
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Admin access required' } }, { status: 403 });
    }

    const body = await req.json();
    const { id, role } = body;

    if (!id || !role) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'ID and role are required' } }, { status: 400 });
    }

    const validRoles = ['admin', 'user', 'viewer'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid role' } }, { status: 400 });
    }

    const existing = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!existing) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'User not found' } }, { status: 404 });
    }

    await db.update(users).set({
      role,
      updatedAt: new Date(),
    }).where(eq(users.id, id));

    return NextResponse.json({ success: true });
  } catch (err) {
    return errorHandler(err as Error, req);
  }
}

// DELETE /api/v1/users - Delete user (admin only)
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'No token' } }, { status: 401 });
    }

    const currentUser = verifyAccessToken(token);

    // Admin only
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Admin access required' } }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'User ID is required' } }, { status: 400 });
    }

    // Can't delete yourself
    if (id === currentUser.userId) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Cannot delete yourself' } }, { status: 403 });
    }

    await db.delete(users).where(eq(users.id, id));

    return NextResponse.json({ success: true });
  } catch (err) {
    return errorHandler(err as Error, req);
  }
}
