import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllCertificates, 
  createCertificate, 
  getCertificate,
  updateCertificate,
  deleteCertificate 
} from '@/lib/db';
import { requestCertificate, renewCertificate, getCertificateStatus } from '@/lib/acme';

export async function GET() {
  try {
    const certificates = getAllCertificates();
    
    // Enrich with computed status
    const enriched = certificates.map(cert => ({
      ...cert,
      computed_status: getCertificateStatus(cert.expires_at),
      days_until_expiry: cert.expires_at 
        ? Math.floor((new Date(cert.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null,
    }));
    
    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch certificates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain, challenge_type, dns_provider, auto_renew, hook_script, issue_now } = body;

    if (!domain) {
      return NextResponse.json(
        { success: false, error: 'Domain is required' },
        { status: 400 }
      );
    }

    // Create certificate record
    const cert = createCertificate({
      domain,
      challenge_type: challenge_type || 'http',
      dns_provider,
      auto_renew,
      hook_script,
    });

    // Issue certificate immediately if requested
    if (issue_now) {
      const email = process.env.ACME_EMAIL || 'admin@example.com';
      const result = await requestCertificate({
        email,
        domain,
        challengeType: challenge_type || 'http',
        dnsProvider: dns_provider,
      });

      if (result.success) {
        updateCertificate(cert.id, {
          status: 'valid',
          certificate: result.certificate,
          private_key: result.privateKey,
          issued_at: new Date().toISOString(),
          expires_at: result.expiresAt,
        });
      } else {
        updateCertificate(cert.id, { status: 'error' });
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: getCertificate(cert.id) 
    });
  } catch (error) {
    console.error('Error creating certificate:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create certificate' },
      { status: 500 }
    );
  }
}
