import { NextRequest, NextResponse } from 'next/server';
import { registerUser, loginUser } from '@/lib/auth';
import { validateBody, registerSchema, loginSchema } from '@/lib/validation';
import { errorHandler } from '@/middleware/error-handler';
import { authRateLimiter } from '@/middleware/rate-limiter';

export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting for auth endpoints
    const rateLimitResponse = authRateLimiter(req);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await req.json();
    const action = body.action || 'login';

    if (action === 'register') {
      const data = await validateBody(registerSchema)(body);
      const user = await registerUser(data.email, data.password, data.role);
      
      return NextResponse.json({
        user: { userId: user.userId, email: user.email, role: user.role },
      }, { status: 201 });
    }

    if (action === 'login') {
      const data = await validateBody(loginSchema)(body);
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || undefined;
      const userAgent = req.headers.get('user-agent') || undefined;
      
      const result = await loginUser(data.email, data.password, ip, userAgent);

      const response = NextResponse.json({
        user: result.user,
        accessToken: result.tokens.accessToken,
      });

      // Set cookies
      response.cookies.set('access_token', result.tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60, // 15 minutes
        path: '/',
      });

      response.cookies.set('refresh_token', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      });

      return response;
    }

    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Action not found' } },
      { status: 404 }
    );
  } catch (err) {
    return errorHandler(err as Error, req);
  }
}
