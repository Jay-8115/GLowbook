import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/middleware';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
        salon: true,
        service: true,
        staff: true,
        payment: true,
        review: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Auth constraints: User must be either the customer, the salon owner, or an admin
    if (auth.user.role === 'USER' && booking.userId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
    }

    if (auth.user.role === 'OWNER' && booking.salon.ownerId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
    }

    return NextResponse.json({ booking });
  } catch (error) {
    console.error('Fetch booking details error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
