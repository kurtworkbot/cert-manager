import { NextResponse } from 'next/server';
import { getAvailableProviders } from '@/lib/dns-providers';

export async function GET() {
  try {
    const providers = getAvailableProviders();
    return NextResponse.json({ success: true, data: providers });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to get providers' },
      { status: 500 }
    );
  }
}
