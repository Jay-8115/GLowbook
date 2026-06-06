import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/middleware';
import { sendRejectionEmail } from '@/lib/email';
import { z } from 'zod';

const rejectSchema = z.object({
  reason: z.string().min(2, 'Rejection reason must be at least 2 characters'),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(req, ['ADMIN']);
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    const body = await req.json();
    const validation = rejectSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    // 1. Fetch registration request
    const registration = await prisma.salonRegistration.findUnique({
      where: { id },
    });

    if (!registration) {
      return NextResponse.json({ error: 'Salon registration request not found' }, { status: 404 });
    }

    if (registration.status !== 'pending') {
      return NextResponse.json(
        { error: `This request has already been ${registration.status}.` },
        { status: 400 }
      );
    }

    // 2. Update status and rejectionReason
    const updatedReg = await prisma.salonRegistration.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason: validation.data.reason,
      },
    });

    // 3. Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: auth.user.id,
        action: 'SALON_REGISTRATION_REJECTED',
        details: `Rejected salon "${registration.salonName}" registration request for reason: ${validation.data.reason}`,
      },
    });

    // 4. Send rejection email
    try {
      await sendRejectionEmail(
        registration.email,
        registration.ownerName,
        validation.data.reason
      );
    } catch (emailErr) {
      console.error('Failed to send rejection email:', emailErr);
    }

    return NextResponse.json({
      message: 'Salon registration rejected successfully.',
      registration: updatedReg,
    });

  } catch (error) {
    console.error('Reject salon request error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
