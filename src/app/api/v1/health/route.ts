import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { providers } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const checks: Record<string, string> = {};
  let overallStatus = 'healthy';

  try {
    // Database check
    await db.select().from(providers).limit(1);
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
    overallStatus = 'unhealthy';
  }

  // In production, add more checks:
  // - DNS provider connectivity
  // - Certificate expiration status
  // - Disk space

  const response = {
    status: overallStatus,
    checks,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, {
    status: overallStatus === 'healthy' ? 200 : 503,
  });
}
