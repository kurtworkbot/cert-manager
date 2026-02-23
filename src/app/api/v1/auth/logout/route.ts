import { NextRequest, NextResponse } from 'next/server';
import { errorHandler } from '@/middleware/error-handler';

export async function POST(req: NextRequest) {
  try {
    const response = NextResponse.json({ success: true });

    // Clear cookies
    response.cookies.set('access_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    response.cookies.set('refresh_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (err) {
    return errorHandler(err as Error, req);
  }
}
