import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { domains } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyAccessToken } from '@/lib/auth';
import { errorHandler } from '@/middleware/error-handler';
import { standardRateLimiter } from '@/middleware/rate-limiter';
import { v4 as uuidv4 } from 'uuid';

// GET /api/v1/domains - List domains
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

    const domainList = await db.query.domains.findMany({
      where: eq(domains.userId, user.userId),
    });

    return NextResponse.json({ domains: domainList });
  } catch (err) {
    return errorHandler(err as Error, req);
  }
}

// POST /api/v1/domains - Create domain
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
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Domain name is required' } }, { status: 400 });
    }

    // Validate domain format
    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(name)) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid domain format' } }, { status: 400 });
    }

    const domainId = uuidv4();
    await db.insert(domains).values({
      id: domainId,
      name: name.toLowerCase(),
      description: description || '',
      userId: user.userId,
    });

    return NextResponse.json({ id: domainId, name: name.toLowerCase() }, { status: 201 });
  } catch (err) {
    return errorHandler(err as Error, req);
  }
}

// PUT /api/v1/domains - Update domain
export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'No token' } }, { status: 401 });
    }

    const user = verifyAccessToken(token);
    const body = await req.json();
    const { id, name, description } = body;

    if (!id) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Domain ID is required' } }, { status: 400 });
    }

    // Verify ownership
    const existing = await db.query.domains.findFirst({
      where: and(eq(domains.id, id), eq(domains.userId, user.userId)),
    });

    if (!existing) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Domain not found' } }, { status: 404 });
    }

    await db.update(domains).set({
      name: name?.toLowerCase() || existing.name,
      description: description ?? existing.description,
      updatedAt: new Date(),
    }).where(eq(domains.id, id));

    return NextResponse.json({ success: true });
  } catch (err) {
    return errorHandler(err as Error, req);
  }
}

// DELETE /api/v1/domains
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
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Domain ID is required' } }, { status: 400 });
    }

    // Verify ownership
    const existing = await db.query.domains.findFirst({
      where: and(eq(domains.id, id), eq(domains.userId, user.userId)),
    });

    if (!existing) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Domain not found' } }, { status: 404 });
    }

    await db.delete(domains).where(eq(domains.id, id));

    return NextResponse.json({ success: true });
  } catch (err) {
    return errorHandler(err as Error, req);
  }
}
