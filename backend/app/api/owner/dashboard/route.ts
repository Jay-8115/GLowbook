import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/middleware';

export async function GET(req: NextRequest) {
  const auth = await authenticate(req, ['OWNER', 'ADMIN']);
  if (auth instanceof NextResponse) return auth;

  try {
    // 1. Get owner's salons
    const salons = await prisma.salon.findMany({
      where: { ownerId: auth.user.id },
      select: { id: true }
    });
    const salonIds = salons.map((s) => s.id);

    if (salonIds.length === 0) {
      return NextResponse.json({
        metrics: {
          todayRevenue: 0,
          weeklyRevenue: 0,
          monthlyRevenue: 0,
          totalRevenue: 0,
          todayBookingsCount: 0,
          pendingBookingsCount: 0,
          confirmedBookingsCount: 0,
          completedBookingsCount: 0,
          cancelledBookingsCount: 0,
          totalCustomers: 0,
          repeatCustomers: 0,
          averageRating: 0,
          totalReviews: 0,
          mostBookedService: 'N/A',
          topPerformingService: 'N/A',
          mostActiveCustomer: 'N/A'
        }
      });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 2. Query Revenue details
    const completedBookings = await prisma.booking.findMany({
      where: {
        salonId: { in: salonIds },
        status: 'COMPLETED'
      },
      select: {
        totalPrice: true,
        bookingDate: true
      }
    });

    let totalRevenue = 0;
    let todayRevenue = 0;
    let weeklyRevenue = 0;
    let monthlyRevenue = 0;

    completedBookings.forEach((b) => {
      const bDate = new Date(b.bookingDate);
      totalRevenue += b.totalPrice;
      if (bDate >= todayStart) todayRevenue += b.totalPrice;
      if (bDate >= sevenDaysAgo) weeklyRevenue += b.totalPrice;
      if (bDate >= thirtyDaysAgo) monthlyRevenue += b.totalPrice;
    });

    // 3. Query Booking counts by status
    const statusCounts = await prisma.booking.groupBy({
      by: ['status'],
      where: { salonId: { in: salonIds } },
      _count: { id: true }
    });

    const getCount = (status: string) => {
      const match = statusCounts.find((s) => s.status === status);
      return match?._count.id || 0;
    };

    const pendingBookingsCount = getCount('PENDING');
    const confirmedBookingsCount = getCount('CONFIRMED');
    const completedBookingsCount = getCount('COMPLETED');
    const cancelledBookingsCount = getCount('CANCELLED') + getCount('REJECTED');

    // Today's Bookings Count
    const todayBookingsCount = await prisma.booking.count({
      where: {
        salonId: { in: salonIds },
        bookingDate: { gte: todayStart }
      }
    });

    // 4. Query Customer Counts
    const customerCompletedCounts = await prisma.booking.groupBy({
      by: ['userId'],
      where: { salonId: { in: salonIds }, status: 'COMPLETED' },
      _count: { id: true }
    });
    const totalCustomers = customerCompletedCounts.length;
    const repeatCustomers = customerCompletedCounts.filter((c) => c._count.id >= 2).length;

    // 5. Query Reviews & Ratings
    const reviewsData = await prisma.review.aggregate({
      where: { salonId: { in: salonIds } },
      _avg: { rating: true },
      _count: { id: true }
    });
    const averageRating = parseFloat((reviewsData._avg.rating || 0).toFixed(1));
    const totalReviews = reviewsData._count.id || 0;

    // 6. Advanced Analytics (Most Booked, Top Performing, Most Active Customer)
    let mostBookedService = 'N/A';
    let topPerformingService = 'N/A';
    let mostActiveCustomer = 'N/A';

    // Most Booked Service
    const serviceBookingCounts = await prisma.booking.groupBy({
      by: ['serviceId'],
      where: { salonId: { in: salonIds } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 1
    });
    if (serviceBookingCounts.length > 0) {
      const s = await prisma.service.findUnique({
        where: { id: serviceBookingCounts[0].serviceId },
        select: { name: true }
      });
      if (s) mostBookedService = s.name;
    }

    // Top Performing Service
    const serviceRevenue = await prisma.booking.groupBy({
      by: ['serviceId'],
      where: { salonId: { in: salonIds }, status: 'COMPLETED' },
      _sum: { totalPrice: true },
      orderBy: { _sum: { totalPrice: 'desc' } },
      take: 1
    });
    if (serviceRevenue.length > 0) {
      const s = await prisma.service.findUnique({
        where: { id: serviceRevenue[0].serviceId },
        select: { name: true }
      });
      if (s) topPerformingService = s.name;
    }

    // Most Active Customer
    const activeCustomer = await prisma.booking.groupBy({
      by: ['userId'],
      where: { salonId: { in: salonIds } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 1
    });
    if (activeCustomer.length > 0) {
      const u = await prisma.user.findUnique({
        where: { id: activeCustomer[0].userId },
        select: { name: true }
      });
      if (u) mostActiveCustomer = u.name;
    }

    return NextResponse.json({
      metrics: {
        todayRevenue,
        weeklyRevenue,
        monthlyRevenue,
        totalRevenue,
        todayBookingsCount,
        pendingBookingsCount,
        confirmedBookingsCount,
        completedBookingsCount,
        cancelledBookingsCount,
        totalCustomers,
        repeatCustomers,
        averageRating,
        totalReviews,
        mostBookedService,
        topPerformingService,
        mostActiveCustomer
      }
    });

  } catch (error) {
    console.error('Fetch owner dashboard error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
