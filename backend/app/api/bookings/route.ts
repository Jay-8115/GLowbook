import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/middleware';
import { z } from 'zod';
import { sendNotification, broadcastSocketEvent } from '@/lib/notificationService';

const createBookingSchema = z.object({
  salonId: z.string().uuid(),
  serviceId: z.string().uuid(),
  staffId: z.string().uuid(),
  bookingDate: z.string().transform((val) => new Date(val)),
  startTime: z.string(), // "10:30"
  endTime: z.string(), // "11:30"
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;

    let bookings;

    if (auth.user.role === 'ADMIN') {
      bookings = await prisma.booking.findMany({
        where: { status: status as any },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          salon: true,
          service: true,
          staff: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (auth.user.role === 'OWNER') {
      // Find all salons owned by the owner
      const salons = await prisma.salon.findMany({
        where: { ownerId: auth.user.id },
        select: { id: true },
      });
      const salonIds = salons.map((s: { id: string }) => s.id);

      bookings = await prisma.booking.findMany({
        where: {
          salonId: { in: salonIds },
          status: status as any,
        },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          salon: true,
          service: true,
          staff: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Regular customer user
      bookings = await prisma.booking.findMany({
        where: {
          userId: auth.user.id,
          status: status as any,
        },
        include: {
          salon: true,
          service: true,
          staff: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Fetch bookings error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req, ['USER']);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const validation = createBookingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 });
    }

    const { salonId, serviceId, staffId, bookingDate, startTime, endTime, notes } = validation.data;

    // Verify service details & price
    const service = await prisma.service.findFirst({
      where: { id: serviceId, salonId, isActive: true },
    });

    if (!service) {
      return NextResponse.json({ error: 'Selected service is invalid or inactive' }, { status: 400 });
    }

    // Verify staff is available
    const staff = await prisma.staff.findFirst({
      where: { id: staffId, salonId, isAvailable: true },
    });

    if (!staff) {
      return NextResponse.json({ error: 'Selected staff member is unavailable' }, { status: 400 });
    }

    // Calculate final price with discount
    const discount = service.price * (service.discountPercent / 100);
    const finalPrice = service.price - discount;

    // Create the booking
    const booking = await prisma.booking.create({
      data: {
        userId: auth.user.id,
        salonId,
        serviceId,
        staffId,
        bookingDate,
        startTime,
        endTime,
        totalPrice: finalPrice,
        notes,
        status: 'PENDING',
      },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        salon: true,
        service: true,
        staff: true,
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: auth.user.id,
        action: 'BOOKING_CREATED',
        details: `Created booking ${booking.id} at salon ${booking.salon.name} for $${finalPrice}`,
      },
    });

    // Increment bookings count in Salon
    await prisma.salon.update({
      where: { id: salonId },
      data: { totalBookings: { increment: 1 } },
    });

    // Real-time notification: Broadcast booking event via Socket.IO
    broadcastSocketEvent(`salon:${salonId}`, 'booking_created', booking);

    // Create notifications for Customer, Owner, and assigned Staff
    await sendNotification({
      userId: auth.user.id,
      title: 'Booking Created',
      body: `Your booking at ${booking.salon.name} for ${booking.service.name} is pending acceptance.`,
      type: 'Booking Created',
      referenceId: booking.id,
    });

    await sendNotification({
      userId: booking.salon.ownerId,
      title: 'New Booking',
      body: `A new booking has been placed by ${booking.user.name} for ${booking.service.name}.`,
      type: 'New Booking',
      referenceId: booking.id,
    });

    await sendNotification({
      staffId: booking.staffId,
      title: 'New Assigned Booking',
      body: `You have been assigned a new booking at ${booking.salon.name} for ${booking.service.name} on ${new Date(booking.bookingDate).toLocaleDateString()} at ${booking.startTime}.`,
      type: 'New Assigned Booking',
      referenceId: booking.id,
    });

    broadcastSocketEvent(`staff:${booking.staffId}`, 'staff_assigned', booking);

    return NextResponse.json({
      message: 'Booking placed successfully',
      booking,
    }, { status: 201 });

  } catch (error) {
    console.error('Create booking error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
