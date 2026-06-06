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
      return NextResponse.json({
        bookings: [],
        statistics: { total: 0, completed: 0, cancelled: 0, pending: 0, revenue: 0 }
      });
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'this_month';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    let dateQuery: any = {};
    const now = new Date();

    if (filter === 'today') {
      const start = new Date();
      start.setHours(0,0,0,0);
      dateQuery = { gte: start };
    } else if (filter === 'yesterday') {
      const start = new Date();
      start.setDate(now.getDate() - 1);
      start.setHours(0,0,0,0);
      const end = new Date();
      end.setDate(now.getDate() - 1);
      end.setHours(23,59,59,999);
      dateQuery = { gte: start, lte: end };
    } else if (filter === 'last_7') {
      const start = new Date();
      start.setDate(now.getDate() - 7);
      start.setHours(0,0,0,0);
      dateQuery = { gte: start };
    } else if (filter === 'last_30') {
      const start = new Date();
      start.setDate(now.getDate() - 30);
      start.setHours(0,0,0,0);
      dateQuery = { gte: start };
    } else if (filter === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      dateQuery = { gte: start };
    } else if (filter === 'custom' && startDateParam && endDateParam) {
      dateQuery = { gte: new Date(startDateParam), lte: new Date(endDateParam) };
    }

    const bookings = await prisma.booking.findMany({
      where: {
        salonId: { in: salonIds },
        bookingDate: dateQuery
      },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
        service: true,
        staff: true
      },
      orderBy: { bookingDate: 'desc' }
    });

    // Compute stats
    let total = bookings.length;
    let completed = 0;
    let cancelled = 0;
    let pending = 0;
    let revenue = 0;

    bookings.forEach((b) => {
      if (b.status === 'COMPLETED') {
        completed++;
        revenue += b.totalPrice;
      } else if (b.status === 'CANCELLED' || b.status === 'REJECTED') {
        cancelled++;
      } else if (b.status === 'PENDING') {
        pending++;
      }
    });

    const formatted = bookings.map((b) => ({
      id: b.id,
      customerName: b.user.name,
      mobileNumber: b.user.phone || 'N/A',
      email: b.user.email,
      serviceName: b.service.name,
      date: b.bookingDate,
      time: `${b.startTime} - ${b.endTime}`,
      price: b.totalPrice,
      notes: b.notes || '',
      status: b.status,
      staffName: b.staff.name
    }));

    return NextResponse.json({
      bookings: formatted,
      statistics: {
        total,
        completed,
        cancelled,
        pending,
        revenue
      }
    });

  } catch (error) {
    console.error('Fetch owner bookings history error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
