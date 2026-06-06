import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/middleware';

export async function GET(req: NextRequest) {
  const auth = await authenticate(req, ['OWNER', 'ADMIN']);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;

    // Find all salons owned by the owner
    let salonIds: string[] = [];
    if (auth.user.role === 'OWNER') {
      const salons = await prisma.salon.findMany({
        where: { ownerId: auth.user.id },
        select: { id: true },
      });
      salonIds = salons.map((s) => s.id);
    }

    const bookings = await prisma.booking.findMany({
      where: {
        salonId: auth.user.role === 'ADMIN' ? undefined : { in: salonIds },
        status: status ? (status.toUpperCase() as any) : undefined,
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
        salon: true,
        service: true,
        staff: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Fetch salon bookings error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
