import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const serviceId = searchParams.get('serviceId');
    const dateStr = searchParams.get('date');
    const slot = searchParams.get('slot');

    if (!serviceId || !dateStr || !slot) {
      return NextResponse.json(
        { error: 'Parameters serviceId, date, and slot are required.' },
        { status: 400 }
      );
    }

    const parsedDate = new Date(dateStr);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date parameter.' }, { status: 400 });
    }

    // Set boundaries for the date (ignoring timezone offsets)
    const startOfDate = new Date(parsedDate);
    startOfDate.setHours(0, 0, 0, 0);
    const endOfDate = new Date(parsedDate);
    endOfDate.setHours(23, 59, 59, 999);

    // 1. Find staff members booked for this slot on this day
    const conflictingBookings = await prisma.booking.findMany({
      where: {
        bookingDate: {
          gte: startOfDate,
          lte: endOfDate,
        },
        startTime: slot,
        status: { notIn: ['CANCELLED', 'REJECTED'] },
      },
      select: { staffId: true },
    });
    const bookedStaffIds = conflictingBookings.map((b) => b.staffId);

    // 2. Query staff mapped to service, active, available, and not booked
    const staffMappings = await prisma.staffService.findMany({
      where: {
        serviceId,
        staff: {
          isAvailable: true,
          isActive: true,
          id: { notIn: bookedStaffIds },
        },
      },
      include: {
        staff: {
          include: {
            bookings: {
              where: { status: 'COMPLETED' },
              include: { review: true },
            },
          },
        },
      },
    });

    const response = staffMappings.map((mapping) => {
      const staff = mapping.staff;

      // Calculate rating
      const completedBookings = staff.bookings.filter((b) => b.status === 'COMPLETED');
      const reviews = completedBookings.map((b) => b.review).filter(Boolean);
      const avgRating = reviews.length > 0
        ? parseFloat((reviews.reduce((acc, curr: any) => acc + curr.rating, 0) / reviews.length).toFixed(1))
        : 4.8;

      return {
        staffId: staff.id,
        name: staff.name,
        specialization: staff.specialization,
        rating: avgRating,
        experience: staff.experience,
        avatarUrl: staff.avatarUrl,
        isAvailable: staff.isAvailable,
      };
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Fetch available staff error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
