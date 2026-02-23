import { NextRequest, NextResponse } from 'next/server';
import { refreshTokens } from '@/lib/auth';
import { errorHandler } from '@/middleware/error-handler';

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'No refresh token' } },
        { status: 401 }
      );
    }

    const tokens = await refreshTokens(refreshToken);

    const response = NextResponse.json({ success: true });

    response.cookies.set('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
      path: '/',
    });

    response.cookies.set('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (err) {
    return errorHandler(err as Error, req);
  }
}
