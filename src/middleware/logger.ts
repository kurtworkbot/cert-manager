import { NextRequest, NextResponse } from 'next/server';

export interface LogEntry {
  timestamp: string;
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  ip: string;
  userAgent: string;
  userId?: string;
}

function formatLogEntry(entry: LogEntry): string {
  const { timestamp, method, url, statusCode, duration, ip, userId } = entry;
  const userInfo = userId ? ` [user:${userId}]` : '';
  return `${timestamp} ${method} ${url} ${statusCode} ${duration}ms [${ip}]${userInfo}`;
}

export function logger(req: NextRequest) {
  const startTime = Date.now();
  const method = req.method;
  const url = req.nextUrl.pathname;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
             req.headers.get('x-real-ip') || 
             'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  // Override the response to add logging
  const originalResponse = NextResponse.next();
  
  // Capture user ID if present
  const userId = (req as any).user?.userId;

  // Log after response
  originalResponse.then(() => {
    const duration = Date.now() - startTime;
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      method,
      url,
      statusCode: originalResponse.status,
      duration,
      ip,
      userAgent,
      userId,
    };
    
    // Console log (replace with structured logger like Winston/Pino in production)
    console.log(formatLogEntry(entry));
  });

  return originalResponse;
}
