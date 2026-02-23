import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { certificates, domains, providers, userAuditLogs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyAccessToken } from '@/lib/auth';
import { errorHandler } from '@/middleware/error-handler';
import { standardRateLimiter } from '@/middleware/rate-limiter';
import { ACMEClient, getHTTPChallengeToken, getDNSChallengeInfo } from '@/lib/acme/client';
import { v4 as uuidv4 } from 'uuid';

// Certificate request validation schema
const requestCertSchema = {
  parse: (body: any) => {
    const { domainId, providerId, caProvider, challengeType } = body;
    if (!domainId) throw new Error('domainId is required');
    if (!providerId) throw new Error('providerId is required');
    if (!caProvider) throw new Error('caProvider is required');
    const validCA = ['letsencrypt', 'zerossl'];
    const validChallenge = ['http-01', 'dns-01'];
    if (!validCA.includes(caProvider)) throw new Error('Invalid caProvider');
    if (challengeType && !validChallenge.includes(challengeType)) throw new Error('Invalid challengeType');
    return { domainId, providerId, caProvider, challengeType: challengeType || 'http-01' };
  }
};

// GET /api/v1/certificates - List certificates
export async function GET(req: NextRequest) {
  try {
    const rateLimit = standardRateLimiter(req);
    if (rateLimit) return rateLimit;

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'No token' } }, { status: 401 });
    }

    const user = verifyAccessToken(token);

    const certs = await db.query.certificates.findMany({
      where: eq(certificates.userId, user.userId),
    });

    return NextResponse.json({ certificates: certs });
  } catch (err) {
    return errorHandler(err as Error, req);
  }
}

// POST /api/v1/certificates - Request new certificate
export async function POST(req: NextRequest) {
  try {
    const rateLimit = standardRateLimiter(req);
    if (rateLimit) return rateLimit;

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'No token' } }, { status: 401 });
    }

    const user = verifyAccessToken(token);
    const body = await req.json();

    // Validate input
    let data;
    try {
      data = requestCertSchema.parse(body);
    } catch (e: any) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: e.message } }, { status: 400 });
    }

    // Verify domain ownership
    const domain = await db.query.domains.findFirst({
      where: and(eq(domains.id, data.domainId), eq(domains.userId, user.userId)),
    });

    if (!domain) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Domain not found' } }, { status: 404 });
    }

    // Verify provider exists
    const provider = await db.query.providers.findFirst({
      where: eq(providers.id, data.providerId),
    });

    if (!provider) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'DNS Provider not found' } }, { status: 404 });
    }

    // Create certificate in "pending" status
    const certId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    await db.insert(certificates).values({
      id: certId,
      domainId: data.domainId,
      domain: domain.name,
      providerId: data.providerId,
      userId: user.userId,
      caProvider: data.caProvider,
      challengeType: data.challengeType,
      status: 'pending',
      expiresAt,
    });

    // Try to get real certificate from Let's Encrypt
    try {
      const acme = new ACMEClient({
        domain: domain.name,
        providerId: data.providerId,
        challengeType: data.challengeType,
        useStaging: true, // Use staging for testing
      });

      await acme.initialize();
      const result = await acme.requestCertificate();

      // Update certificate with real data
      await db.update(certificates).set({
        status: 'active',
        privateKey: result.privateKey,
        fullChain: result.fullChain,
        expiresAt,
      }).where(eq(certificates.id, certId));

      return NextResponse.json({
        id: certId,
        domain: domain.name,
        status: 'active',
        message: 'Certificate issued successfully!',
      }, { status: 201 });

    } catch (acmeError: any) {
      console.error('ACME Error:', acmeError);
      
      // Return pending status with challenge info
      let challengeInfo: any = null;
      
      if (data.challengeType === 'http-01') {
        challengeInfo = {
          type: 'http-01',
          message: 'HTTP-01 challenge will be served automatically',
        };
      } else {
        const dnsChallenge = getDNSChallengeInfo(domain.name);
        if (dnsChallenge) {
          challengeInfo = {
            type: 'dns-01',
            record: `_acme-challenge.${domain.name}`,
            value: dnsChallenge.dnsKey,
            message: 'Add TXT record to your DNS',
          };
        }
      }

      return NextResponse.json({
        id: certId,
        domain: domain.name,
        status: 'pending',
        challenge: challengeInfo,
        message: 'Certificate requested. Complete the challenge to activate.',
      }, { status: 201 });
    }
  } catch (err) {
    return errorHandler(err as Error, req);
  }
}

// PUT /api/v1/certificates - Update certificate (renew/activate)
export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'No token' } }, { status: 401 });
    }

    const user = verifyAccessToken(token);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const action = searchParams.get('action');

    if (!id) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Certificate ID required' } }, { status: 400 });
    }

    // Verify ownership
    const cert = await db.query.certificates.findFirst({
      where: and(eq(certificates.id, id), eq(certificates.userId, user.userId)),
    });

    if (!cert) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Certificate not found' } }, { status: 404 });
    }

    if (action === 'renew') {
      // Update status to pending for renewal
      await db.update(certificates).set({
        status: 'pending',
        lastRenewed: new Date(),
      }).where(eq(certificates.id, id));

      return NextResponse.json({ message: 'Certificate renewal initiated' });
    }

    if (action === 'activate') {
      // Mark as active (after challenge completed)
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      await db.update(certificates).set({
        status: 'active',
        expiresAt,
      }).where(eq(certificates.id, id));

      return NextResponse.json({ message: 'Certificate activated' });
    }

    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Action not found' } }, { status: 404 });
  } catch (err) {
    return errorHandler(err as Error, req);
  }
}

// DELETE /api/v1/certificates - Delete certificate
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'No token' } }, { status: 401 });
    }

    const user = verifyAccessToken(token);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Certificate ID required' } }, { status: 400 });
    }

    // Verify ownership
    const cert = await db.query.certificates.findFirst({
      where: and(eq(certificates.id, id), eq(certificates.userId, user.userId)),
    });

    if (!cert) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Certificate not found' } }, { status: 404 });
    }

    await db.delete(certificates).where(eq(certificates.id, id));

    return NextResponse.json({ success: true });
  } catch (err) {
    return errorHandler(err as Error, req);
  }
}
