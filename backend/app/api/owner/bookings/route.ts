import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/middleware';

export async function GET(req: NextRequest) {
  const auth = await authenticate(req, ['OWNER', 'ADMIN']);
  if (auth instanceof NextResponse) return auth;

  try {
    const salons = await prisma.salon.findMany({
      where: { ownerId: auth.user.id },
      select: { id: true }
    });
    const salonIds = salons.map((s) => s.id);

    if (salonIds.length === 0) {
      return NextResponse.json({ bookings: [] });
    }

    const bookings = await prisma.booking.findMany({
      where: {
        salonId: { in: salonIds },
        status: { in: ['PENDING', 'CONFIRMED', 'ACCEPTED', 'IN_PROGRESS'] }
      },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
        service: true,
        staff: true
      },
      orderBy: { bookingDate: 'asc' }
    });

    // Format output fields to match expected details
    const formatted = bookings.map((b) => ({
      id: b.id,
      customerName: b.user.name,
      mobileNumber: b.user.phone || 'N/A',
      email: b.user.email,
      serviceName: b.service.name,
      date: b.bookingDate,
      time: `${b.startTime} - ${b.endTime}`,
      startTime: b.startTime,
      endTime: b.endTime,
      price: b.totalPrice,
      notes: b.notes || '',
      status: b.status,
      staffName: b.staff.name,
      staffRole: b.staff.role
    }));

    return NextResponse.json({ bookings: formatted });
  } catch (error) {
    console.error('Fetch owner active bookings error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
