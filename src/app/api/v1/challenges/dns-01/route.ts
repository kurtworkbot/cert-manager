import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { providers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Store pending DNS challenges
const dnsChallenges = new Map<string, { token: string; dnsKey: string; domain: string; providerId: string }>();

// DNS-01 Challenge Handler
// In production, this would interact with DNS provider APIs to create TXT records

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Token required' } }, { status: 400 });
  }

  const challenge = dnsChallenges.get(token);

  if (challenge) {
    return NextResponse.json({
      token: challenge.token,
      dnsKey: challenge.dnsKey,
      domain: challenge.domain,
      instructions: `Create TXT record: _acme-challenge.${challenge.domain} with value: ${challenge.dnsKey}`,
    });
  }

  return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Challenge not found' } }, { status: 404 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { domain, providerId, challengeType } = body;

    if (!domain || !providerId) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'domain and providerId required' } }, { status: 400 });
    }

    // Get provider config
    const provider = await db.query.providers.findFirst({
      where: eq(providers.id, providerId),
    });

    if (!provider) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Provider not found' } }, { status: 404 });
    }

    // Generate challenge token and key authorization
    const token = uuidv4();
    const dnsKey = `demo-dns-key-${token.slice(0, 8)}`; // In production, this comes from ACME server

    // Store challenge
    dnsChallenges.set(token, { token, dnsKey, domain, providerId });

    // In production, you would:
    // 1. Create TXT record via DNS provider API
    // 2. Wait for propagation
    // 3. Notify ACME server to validate
    // 4. Delete TXT record after validation

    // Example with Cloudflare API:
    // const config = provider.config as any;
    // await createTxtRecord(config.apiToken, domain, `_acme-challenge.${domain}`, dnsKey);

    return NextResponse.json({
      token,
      dnsKey,
      domain,
      provider: provider.name,
      instructions: {
        type: 'dns-01',
        record: `_acme-challenge.${domain}`,
        value: dnsKey,
        provider: provider.name,
      },
      message: 'DNS challenge created. Add the TXT record to your DNS and then call the validate endpoint.',
    });
  } catch (err) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create DNS challenge' } }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Token required' } }, { status: 400 });
  }

  const challenge = dnsChallenges.get(token);

  if (challenge) {
    // In production, delete the TXT record from DNS
    dnsChallenges.delete(token);
    return NextResponse.json({ success: true, message: 'Challenge cleaned up' });
  }

  return NextResponse.json({ success: true, message: 'No challenge to clean up' });
}
