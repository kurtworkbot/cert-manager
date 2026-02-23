import { NextRequest, NextResponse } from 'next/server';

// In production, this would integrate with an ACME server (like Greenlock or smallstep)
// For now, we simulate the HTTP-01 challenge validation

// Store pending challenges in memory (use Redis in production)
const challenges = new Map<string, { token: string; keyAuth: string; domain: string }>();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Token required' } }, { status: 400 });
  }

  // Check if we have this challenge
  const challenge = challenges.get(token);

  if (challenge) {
    return new NextResponse(challenge.keyAuth, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  // For demo purposes, return a dummy response
  // In production, this would be handled by the ACME server
  return new NextResponse('demo-challenge-response', {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, keyAuth, domain } = body;

    if (!token || !keyAuth || !domain) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'token, keyAuth, domain required' } }, { status: 400 });
    }

    // Store challenge
    challenges.set(token, { token, keyAuth, domain });

    // In production, you would:
    // 1. Notify your ACME server to validate the challenge
    // 2. The ACME server would make a request to http://domain/.well-known/acme-challenge/{token}
    // 3. This endpoint would return the keyAuth

    return NextResponse.json({ success: true, message: 'Challenge registered' });
  } catch (err) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to register challenge' } }, { status: 500 });
  }
}
