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
      return NextResponse.json({ customers: [] });
    }

    // Load bookings with user, service, and reviews
    const bookings = await prisma.booking.findMany({
      where: {
        salonId: { in: salonIds }
      },
      include: {
        user: true,
        service: true,
        review: true
      },
      orderBy: { bookingDate: 'desc' }
    });

    const customerMap = new Map<string, any>();

    bookings.forEach((b) => {
      if (!b.user) return;
      const userId = b.userId;

      if (!customerMap.has(userId)) {
        customerMap.set(userId, {
          userId,
          name: b.user.name,
          phone: b.user.phone || 'N/A',
          email: b.user.email,
          avatarUrl: b.user.avatarUrl,
          totalVisits: 0,
          totalSpend: 0,
          lastVisit: null as Date | null,
          servicesBooked: {} as Record<string, number>,
          ratings: [] as number[],
          bookingsList: [] as any[]
        });
      }

      const c = customerMap.get(userId);

      // Add to bookings history
      c.bookingsList.push({
        id: b.id,
        serviceName: b.service.name,
        date: b.bookingDate,
        price: b.totalPrice,
        status: b.status
      });

      if (b.status === 'COMPLETED') {
        c.totalVisits++;
        c.totalSpend += b.totalPrice;

        // Track last visit date
        const bDate = new Date(b.bookingDate);
        if (!c.lastVisit || bDate > c.lastVisit) {
          c.lastVisit = bDate;
        }

        // Track services booked counts
        c.servicesBooked[b.service.name] = (c.servicesBooked[b.service.name] || 0) + 1;
      }

      if (b.review) {
        c.ratings.push(b.review.rating);
      }
    });

    const customers = Array.from(customerMap.values()).map((c) => {
      // Find Favourite Service
      let favouriteService = 'None';
      let maxCount = 0;
      Object.entries(c.servicesBooked).forEach(([srv, count]: [string, any]) => {
        if (count > maxCount) {
          maxCount = count;
          favouriteService = srv;
        }
      });

      // Calculate Average Rating Given
      const avgRating = c.ratings.length > 0
        ? parseFloat((c.ratings.reduce((a: number, b: number) => a + b, 0) / c.ratings.length).toFixed(1))
        : 0;

      // Determine segment
      let segment = 'Regular';
      if (c.totalSpend > 500) {
        segment = 'Top Customer';
      } else if (c.totalVisits >= 3) {
        segment = 'Frequent Customer';
      }

      return {
        customerName: c.name,
        phone: c.phone,
        email: c.email,
        avatarUrl: c.avatarUrl,
        totalVisits: c.totalVisits,
        totalSpend: parseFloat(c.totalSpend.toFixed(2)),
        lastVisit: c.lastVisit ? c.lastVisit.toISOString().split('T')[0] : 'N/A',
        favouriteService,
        averageRatingGiven: avgRating,
        bookingHistory: c.bookingsList.slice(0, 5), // last 5 bookings
        customerLifetimeValue: parseFloat(c.totalSpend.toFixed(2)),
        segment
      };
    });

    // Sort by lifetime value desc
    customers.sort((a, b) => b.customerLifetimeValue - a.customerLifetimeValue);

    return NextResponse.json({ customers });
  } catch (error) {
    console.error('Fetch owner customers error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
