import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/middleware';
import { sendPushNotification } from '@/lib/fcm';
import { z } from 'zod';

const updateStatusSchema = z.object({
  status: z.string().transform((val) => {
    const upper = val.toUpperCase();
    if (upper === 'ACCEPTED' || upper === 'CONFIRMED') return 'CONFIRMED';
    if (upper === 'REJECTED') return 'REJECTED';
    return upper as 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
  }),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    const body = await req.json();
    const validation = updateStatusSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 });
    }

    const { status: newStatus } = validation.data;

    // Load booking
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        salon: true,
        user: { select: { id: true, name: true } },
        service: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Role-based auth verification
    if (auth.user.role === 'USER') {
      // Customers can ONLY cancel bookings they own
      if (booking.userId !== auth.user.id) {
        return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
      }
      if (newStatus !== 'CANCELLED') {
        return NextResponse.json({ error: 'Forbidden: Customers can only cancel appointments' }, { status: 403 });
      }
    } else if (auth.user.role === 'OWNER') {
      // Owners can only update bookings for salons they own
      if (booking.salon.ownerId !== auth.user.id) {
        return NextResponse.json({ error: 'Forbidden: You do not own this salon' }, { status: 403 });
      }
    }

    // Update booking status in the DB
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: { status: newStatus as any },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        salon: true,
        service: true,
        staff: true,
      },
    });

    // Handle extra logic based on status (wallet credits, platform commission, etc.)
    if (newStatus === 'COMPLETED') {
      // 1. Accrue Loyalty Points (e.g. 1 point per $10 spent)
      const pointsEarned = Math.floor(booking.totalPrice / 10);
      if (pointsEarned > 0) {
        await prisma.loyaltyPoints.upsert({
          where: { userId: booking.userId },
          update: { points: { increment: pointsEarned } },
          create: { userId: booking.userId, points: pointsEarned },
        });
      }

      // 2. Marketplace commission and Salon Owner wallet payment
      const commissionPercent = 10.0; // 10% platform fee
      const platformFee = booking.totalPrice * (commissionPercent / 100);
      const ownerPayout = booking.totalPrice - platformFee;

      // Credit Salon Owner Wallet
      const ownerWallet = await prisma.wallet.upsert({
        where: { userId: booking.salon.ownerId },
        update: { balance: { increment: ownerPayout } },
        create: { userId: booking.salon.ownerId, balance: ownerPayout },
      });

      await prisma.walletTransaction.create({
        data: {
          walletId: ownerWallet.id,
          amount: ownerPayout,
          type: 'CREDIT',
          referenceId: booking.id,
          description: `Payout for booking #${booking.id} (Service: ${booking.service.name}). Total: $${booking.totalPrice}, Platform fee: $${platformFee.toFixed(2)}`,
        },
      });
    }

    // Audit logs
    await prisma.auditLog.create({
      data: {
        userId: auth.user.id,
        action: `BOOKING_${newStatus}`,
        details: `Booking ${booking.id} status changed from ${booking.status} to ${newStatus}`,
      },
    });

    // Real-time Event broadcast via Socket.IO
    const io = (global as any).io;
    if (io) {
      let eventName = `booking_${newStatus.toLowerCase()}`;
      if (newStatus === 'CONFIRMED') eventName = 'booking_confirmed';
      if (newStatus === 'REJECTED') eventName = 'booking_rejected';
      if (newStatus === 'CANCELLED') eventName = 'booking_cancelled';
      if (newStatus === 'COMPLETED') eventName = 'booking_completed';

      // Notify customer and salon owner rooms
      io.to(`user:${booking.userId}`).emit(eventName, updatedBooking);
      io.to(`salon:${booking.salonId}`).emit(eventName, updatedBooking);
      console.log(`[Socket] Emitted ${eventName} to user:${booking.userId} and salon:${booking.salonId}`);
    }

    // Trigger push notifications
    let notificationTitle = 'Booking Update';
    let notificationBody = `Your booking at ${booking.salon.name} status is ${newStatus.toLowerCase()}.`;

    if (newStatus === 'CONFIRMED') {
      notificationTitle = 'Booking Confirmed';
      notificationBody = `Great news! Your booking at ${booking.salon.name} for ${booking.service.name} has been confirmed.`;
    } else if (newStatus === 'CANCELLED') {
      notificationTitle = 'Booking Cancelled';
      notificationBody = `Your booking at ${booking.salon.name} for ${booking.service.name} has been cancelled.`;
    } else if (newStatus === 'REJECTED') {
      notificationTitle = 'Booking Rejected';
      notificationBody = `Sorry, your booking at ${booking.salon.name} for ${booking.service.name} was rejected.`;
    } else if (newStatus === 'COMPLETED') {
      notificationTitle = 'Booking Completed';
      notificationBody = `Thank you for visiting ${booking.salon.name}! Your service for ${booking.service.name} is complete.`;
    }

    await sendPushNotification(
      booking.userId,
      notificationTitle,
      notificationBody,
      'BOOKING_UPDATE'
    );

    return NextResponse.json({
      message: `Booking status updated to ${newStatus}`,
      booking: updatedBooking,
    });

  } catch (error) {
    console.error('Update booking status error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
