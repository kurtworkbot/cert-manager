import { NextResponse } from 'next/server';
import { getAvailableAcmeProviders } from '@/lib/acme-providers';

export async function GET() {
  try {
    const providers = getAvailableAcmeProviders();
    return NextResponse.json({ success: true, data: providers });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to get ACME providers' },
      { status: 500 }
    );
  }
}
