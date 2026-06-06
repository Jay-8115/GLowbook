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
      return NextResponse.json({ services: [] });
    }

    // Fetch all services for the owner's salons
    const services = await prisma.service.findMany({
      where: { salonId: { in: salonIds } },
      include: { category: true }
    });

    // Fetch all bookings and reviews for these services
    const bookings = await prisma.booking.findMany({
      where: {
        salonId: { in: salonIds }
      },
      include: { review: true }
    });

    const analytics = services.map((srv) => {
      const srvBookings = bookings.filter((b) => b.serviceId === srv.id);
      const completedBookings = srvBookings.filter((b) => b.status === 'COMPLETED');

      // 1. Total Bookings
      const totalBookings = srvBookings.length;

      // 2. Total Revenue
      const totalRevenue = completedBookings.reduce((sum, b) => sum + b.totalPrice, 0);

      // 3. Average Rating
      const ratings = srvBookings.filter((b) => b.review).map((b) => b.review!.rating);
      const averageRating = ratings.length > 0
        ? parseFloat((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1))
        : 0;

      // 4. Repeat Customers (count of users who booked this service >= 2 times)
      const userBookingsCount: Record<string, number> = {};
      srvBookings.forEach((b) => {
        userBookingsCount[b.userId] = (userBookingsCount[b.userId] || 0) + 1;
      });
      const repeatCustomers = Object.values(userBookingsCount).filter((cnt) => cnt >= 2).length;

      return {
        id: srv.id,
        name: srv.name,
        category: srv.category?.name || 'General',
        durationMinutes: srv.durationMinutes,
        price: srv.price,
        discountPrice: srv.discountPrice || srv.price,
        isActive: srv.isActive,
        totalBookings,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        averageRating,
        repeatCustomers
      };
    });

    // Sort by revenue desc
    analytics.sort((a, b) => b.totalRevenue - a.totalRevenue);

    return NextResponse.json({ services: analytics });
  } catch (error) {
    console.error('Fetch owner service analytics error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
