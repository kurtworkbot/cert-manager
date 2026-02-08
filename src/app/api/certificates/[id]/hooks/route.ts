import { NextRequest, NextResponse } from 'next/server';
import { getHookLogs } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const logs = getHookLogs(parseInt(id));
    
    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error fetching hook logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch hook logs' },
      { status: 500 }
    );
  }
}
