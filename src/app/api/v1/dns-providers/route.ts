import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { providers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyAccessToken } from '@/lib/auth';
import { errorHandler } from '@/middleware/error-handler';
import { standardRateLimiter } from '@/middleware/rate-limiter';
import { v4 as uuidv4 } from 'uuid';

// GET /api/v1/dns-providers - List DNS providers
export async function GET(req: NextRequest) {
  try {
    const rateLimit = standardRateLimiter(req);
    if (rateLimit) return rateLimit;

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'No token' } }, { status: 401 });
    }

    // All users can see providers
    const providerList = await db.query.providers.findMany();

    // Don't expose config
    const safeProviders = providerList.map(p => ({
      id: p.id,
      name: p.name,
      type: p.type,
    }));

    return NextResponse.json({ providers: safeProviders });
  } catch (err) {
    return errorHandler(err as Error, req);
  }
}

// POST /api/v1/dns-providers - Create DNS provider
export async function POST(req: NextRequest) {
  try {
    const rateLimit = standardRateLimiter(req);
    if (rateLimit) return rateLimit;

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'No token' } }, { status: 401 });
    }

    const body = await req.json();
    const { name, type, config } = body;

    if (!name || !type || !config) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Name, type, and config are required' } }, { status: 400 });
    }

    // Validate type
    const validTypes = ['duckdns', 'cloudflare', 'route53', 'digitalocean', 'godaddy', 'namecheap'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid provider type' } }, { status: 400 });
    }

    const providerId = uuidv4();
    await db.insert(providers).values({
      id: providerId,
      name,
      type,
      config, // Will be encrypted in production
    });

    return NextResponse.json({ id: providerId, name, type }, { status: 201 });
  } catch (err) {
    return errorHandler(err as Error, req);
  }
}

// PUT /api/v1/dns-providers - Update provider
export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'No token' } }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, type, config } = body;

    if (!id) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Provider ID is required' } }, { status: 400 });
    }

    const existing = await db.query.providers.findFirst({
      where: eq(providers.id, id),
    });

    if (!existing) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Provider not found' } }, { status: 404 });
    }

    await db.update(providers).set({
      name: name || existing.name,
      type: type || existing.type,
      config: config || existing.config,
    }).where(eq(providers.id, id));

    return NextResponse.json({ success: true });
  } catch (err) {
    return errorHandler(err as Error, req);
  }
}

// DELETE /api/v1/dns-providers
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'No token' } }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Provider ID is required' } }, { status: 400 });
    }

    await db.delete(providers).where(eq(providers.id, id));

    return NextResponse.json({ success: true });
  } catch (err) {
    return errorHandler(err as Error, req);
  }
}
