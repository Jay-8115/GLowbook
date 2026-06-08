import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/middleware';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(req, ['OWNER', 'ADMIN']);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id: staffId } = await context.params;

    // Verify staff belongs to owner's salon
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      include: { salon: true },
    });

    if (!staff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    if (staff.salon.ownerId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
    }

    // Fetch all bookings for this staff
    const bookings = await prisma.booking.findMany({
      where: { staffId },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
        service: true,
        review: true,
      },
      orderBy: { bookingDate: 'desc' },
    });

    const now = new Date();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayBookings: any[] = [];
    const upcomingBookings: any[] = [];
    const completedBookings: any[] = [];
    const cancelledBookings: any[] = [];
    let totalRevenue = 0;

    const servicesMap: { [key: string]: { name: string; count: number; revenue: number } } = {};
    const reviews: any[] = [];

    bookings.forEach((b) => {
      const bDate = new Date(b.bookingDate);

      // Separate reviews
      if (b.review) {
        reviews.push({
          id: b.review.id,
          customerName: b.user.name,
          rating: b.review.rating,
          comment: b.review.comment,
          createdAt: b.review.createdAt,
        });
      }

      // Filter status categories
      if (b.status === 'COMPLETED') {
        completedBookings.push(b);
        totalRevenue += b.totalPrice;

        // Tally services performed
        if (!servicesMap[b.serviceId]) {
          servicesMap[b.serviceId] = {
            name: b.service.name,
            count: 0,
            revenue: 0,
          };
        }
        servicesMap[b.serviceId].count += 1;
        servicesMap[b.serviceId].revenue += b.totalPrice;
      } else if (b.status === 'CANCELLED' || b.status === 'REJECTED') {
        cancelledBookings.push(b);
      } else {
        // Active bookings (PENDING, CONFIRMED, ACCEPTED, IN_PROGRESS)
        if (bDate >= startOfToday && bDate <= endOfToday) {
          todayBookings.push(b);
        } else if (bDate > endOfToday) {
          upcomingBookings.push(b);
        } else {
          // past active bookings (treat as completed/cancelled fallback or group into today/upcoming)
          todayBookings.push(b);
        }
      }
    });

    // Calculate Average Rating
    const avgRating = reviews.length > 0
      ? parseFloat((reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1))
      : 5.0;

    const servicesPerformed = Object.values(servicesMap).sort((a, b) => b.count - a.count);

    return NextResponse.json({
      staffInfo: {
        id: staff.id,
        name: staff.name,
        role: staff.role,
        specialization: staff.specialization,
        avatarUrl: staff.avatarUrl,
        isAvailable: staff.isAvailable,
      },
      bookings: {
        today: todayBookings.map(formatBooking),
        upcoming: upcomingBookings.map(formatBooking),
        completed: completedBookings.map(formatBooking),
        cancelled: cancelledBookings.map(formatBooking),
      },
      statistics: {
        totalRevenue,
        averageRating: avgRating,
        totalBookings: bookings.length,
        completedCount: completedBookings.length,
        cancelledCount: cancelledBookings.length,
      },
      servicesPerformed,
      reviews,
    });
  } catch (error) {
    console.error('Fetch staff bookings and stats error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

function formatBooking(b: any) {
  return {
    id: b.id,
    customerName: b.user.name,
    customerPhone: b.user.phone || 'N/A',
    customerEmail: b.user.email,
    serviceName: b.service.name,
    price: b.totalPrice,
    date: b.bookingDate,
    time: `${b.startTime} - ${b.endTime}`,
    notes: b.notes || '',
    status: b.status,
  };
}
