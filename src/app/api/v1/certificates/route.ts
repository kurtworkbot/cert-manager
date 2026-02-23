import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { certificates, userAuditLogs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyAccessToken } from '@/lib/auth';
import { validateBody, createCertificateSchema, uuidSchema, paginationSchema, validateQuery } from '@/lib/validation';
import { errorHandler } from '@/middleware/error-handler';
import { standardRateLimiter } from '@/middleware/rate-limiter';
import { v4 as uuidv4 } from 'uuid';

// GET /api/v1/certificates - List certificates (user's own only)
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
    const url = new URL(req.url);
    const { page, limit } = validateQuery(paginationSchema)(Object.fromEntries(url.searchParams));

    const certs = await db.query.certificates.findMany({
      where: eq(certificates.userId, user.userId),
      limit: limit,
      offset: (page - 1) * limit,
    });

    return NextResponse.json({ certificates: certs, page, limit });
  } catch (err) {
    return errorHandler(err as Error, req);
  }
}

// POST /api/v1/certificates - Create certificate
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
    const data = await validateBody(createCertificateSchema)(body);

    const certId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days

    await db.insert(certificates).values({
      id: certId,
      domain: data.domain,
      providerId: data.providerId,
      userId: user.userId,
      caProvider: data.caProvider,
      status: 'active',
      expiresAt,
    });

    // Audit log
    await db.insert(userAuditLogs).values({
      id: uuidv4(),
      userId: user.userId,
      action: 'create_certificate',
      ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
      details: { certificateId: certId, domain: data.domain },
    });

    return NextResponse.json({ id: certId, domain: data.domain }, { status: 201 });
  } catch (err) {
    return errorHandler(err as Error, req);
  }
}
