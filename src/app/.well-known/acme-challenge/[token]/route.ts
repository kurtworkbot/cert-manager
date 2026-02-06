import { NextRequest, NextResponse } from 'next/server';
import { getChallengeToken } from '@/lib/db';

// HTTP-01 challenge endpoint
// ACME servers will request: GET /.well-known/acme-challenge/{token}
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const challenge = getChallengeToken(token);
    
    if (!challenge) {
      return new NextResponse('Challenge not found', { status: 404 });
    }
    
    // Return the key authorization for ACME validation
    return new NextResponse(challenge.key_authorization, {
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error) {
    return new NextResponse('Internal server error', { status: 500 });
  }
}
