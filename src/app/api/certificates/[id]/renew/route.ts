import { NextRequest, NextResponse } from 'next/server';
import { getCertificate, updateCertificate } from '@/lib/db';
import { renewCertificate } from '@/lib/acme';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const certId = parseInt(id);
    
    const cert = getCertificate(certId);
    if (!cert) {
      return NextResponse.json(
        { success: false, error: 'Certificate not found' },
        { status: 404 }
      );
    }

    // Mark as renewing
    updateCertificate(certId, { status: 'pending' });

    // Attempt renewal
    const result = await renewCertificate(certId);

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Certificate renewed successfully',
        data: getCertificate(certId)
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Renewal error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to renew certificate' },
      { status: 500 }
    );
  }
}
