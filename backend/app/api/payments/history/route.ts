import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/middleware';

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (auth instanceof NextResponse) return auth;

  try {
    let payments;

    if (auth.user.role === 'ADMIN') {
      payments = await prisma.payment.findMany({
        include: {
          booking: {
            include: {
              user: { select: { id: true, name: true, email: true } },
              salon: true,
              service: true,
            },
          },
          transactions: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (auth.user.role === 'OWNER') {
      // Load payments for all bookings at the owner's salons
      const salons = await prisma.salon.findMany({
        where: { ownerId: auth.user.id },
        select: { id: true },
      });
      const salonIds = salons.map((s: { id: string }) => s.id);

      payments = await prisma.payment.findMany({
        where: {
          booking: {
            salonId: { in: salonIds },
          },
        },
        include: {
          booking: {
            include: {
              user: { select: { id: true, name: true } },
              service: true,
            },
          },
          transactions: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Customer
      payments = await prisma.payment.findMany({
        where: {
          booking: {
            userId: auth.user.id,
          },
        },
        include: {
          booking: {
            include: {
              salon: true,
              service: true,
            },
          },
          transactions: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json({ payments });
  } catch (error) {
    console.error('Fetch payment history error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
