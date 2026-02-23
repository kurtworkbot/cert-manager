import { NextRequest, NextResponse } from 'next/server';
import { getUserById, verifyAccessToken } from '@/lib/auth';
import { errorHandler } from '@/middleware/error-handler';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'No token provided' } },
        { status: 401 }
      );
    }

    const user = verifyAccessToken(token);
    const userInfo = await getUserById(user.userId);

    if (!userInfo) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ user: userInfo });
  } catch (err) {
    return errorHandler(err as Error, req);
  }
}
