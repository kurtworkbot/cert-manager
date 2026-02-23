import { NextResponse } from 'next/server';
import { checkAndRenewCertificates } from '@/lib/scheduler';

export const dynamic = 'force-dynamic'; // Scheduler needs fresh state

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const expectedKey = process.env.SCHEDULER_API_KEY;

  if (!expectedKey) {
    console.error('SCHEDULER_API_KEY is not set');
    return NextResponse.json({ error: 'Server misconfiguration: SCHEDULER_API_KEY missing' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${expectedKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await checkAndRenewCertificates();
    return NextResponse.json(results);
  } catch (error) {
    console.error('Scheduler execution failed:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
