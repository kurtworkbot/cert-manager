import { NextRequest, NextResponse } from 'next/server';
import { getCertificate, updateCertificate, deleteCertificate } from '@/lib/db';
import { renewCertificate } from '@/lib/acme';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cert = getCertificate(parseInt(id));
    
    if (!cert) {
      return NextResponse.json(
        { success: false, error: 'Certificate not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: cert });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch certificate' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const cert = updateCertificate(parseInt(id), body);
    
    if (!cert) {
      return NextResponse.json(
        { success: false, error: 'Certificate not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: cert });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update certificate' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    deleteCertificate(parseInt(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete certificate' },
      { status: 500 }
    );
  }
}
