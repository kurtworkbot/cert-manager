import { NextRequest, NextResponse } from 'next/server';
import { getHTTPChallengeToken } from '@/lib/acme/client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Token required' } }, { status: 400 });
  }

  // Get key authorization from ACME client
  const keyAuth = getHTTPChallengeToken(token);

  if (keyAuth) {
    return new NextResponse(keyAuth, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  // Fallback for demo
  return new NextResponse('demo-challenge-' + token, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
