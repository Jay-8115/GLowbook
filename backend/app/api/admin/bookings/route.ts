import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/middleware';

export async function GET(req: NextRequest) {
  const auth = await authenticate(req, ['ADMIN']);
  if (auth instanceof NextResponse) return auth;

  try {
    const bookings = await prisma.booking.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        salon: true,
        service: true,
        staff: true,
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Fetch admin bookings error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
