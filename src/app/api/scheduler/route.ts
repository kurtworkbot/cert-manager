import { NextResponse } from 'next/server';
import { 
  getCertificatesForAutoRenew, 
  getCertificatesExpiringSoon,
  getAllCertificates 
} from '@/lib/db';
import { renewCertificate } from '@/lib/acme';
import { sendExpiryNotification, resetNotificationsAfterRenewal } from '@/lib/notifications';

// Cron secret for security
const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: Request) {
  // Verify cron secret if configured
  if (CRON_SECRET) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
  }

  const results = {
    renewed: [] as string[],
    renewFailed: [] as { domain: string; error: string }[],
    notified: [] as string[],
  };

  try {
    // 1. Auto-renew certificates expiring within 30 days
    const certsToRenew = getCertificatesForAutoRenew();
    
    for (const cert of certsToRenew) {
      console.log(`[AutoRenew] Processing ${cert.domain}`);
      const result = await renewCertificate(cert.id);
      
      if (result.success) {
        results.renewed.push(cert.domain);
        resetNotificationsAfterRenewal(cert.id);
      } else {
        results.renewFailed.push({ domain: cert.domain, error: result.error || 'Unknown error' });
      }
    }

    // 2. Send expiry notifications for all certificates
    const allCerts = getAllCertificates();
    
    for (const cert of allCerts) {
      if (cert.expires_at) {
        await sendExpiryNotification(cert);
        results.notified.push(cert.domain);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        processedAt: new Date().toISOString(),
        renewed: results.renewed.length,
        renewFailed: results.renewFailed.length,
        details: results,
      },
    });
  } catch (error) {
    console.error('[Scheduler] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Scheduler failed' },
      { status: 500 }
    );
  }
}

// GET endpoint to check scheduler status
export async function GET() {
  const certsToRenew = getCertificatesForAutoRenew();
  const certsExpiringSoon = getCertificatesExpiringSoon(30);

  return NextResponse.json({
    success: true,
    data: {
      pendingRenewals: certsToRenew.map(c => ({
        domain: c.domain,
        expiresAt: c.expires_at,
      })),
      expiringSoon: certsExpiringSoon.map(c => ({
        domain: c.domain,
        expiresAt: c.expires_at,
      })),
    },
  });
}
