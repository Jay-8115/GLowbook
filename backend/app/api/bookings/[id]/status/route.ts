import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/middleware';
import { z } from 'zod';
import { sendNotification, broadcastSocketEvent } from '@/lib/notificationService';

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
    let eventName = `booking_${newStatus.toLowerCase()}`;
    if (newStatus === 'CONFIRMED') eventName = 'booking_confirmed';
    if (newStatus === 'REJECTED') eventName = 'booking_rejected';
    if (newStatus === 'CANCELLED') eventName = 'booking_cancelled';
    if (newStatus === 'COMPLETED') eventName = 'booking_completed';

    broadcastSocketEvent(`user:${booking.userId}`, eventName, updatedBooking);
    broadcastSocketEvent(`salon:${booking.salonId}`, eventName, updatedBooking);
    broadcastSocketEvent(`staff:${booking.staffId}`, eventName, updatedBooking);

    // Advanced Notification System
    if (newStatus === 'CONFIRMED') {
      await sendNotification({
        userId: booking.userId,
        title: 'Booking Confirmed',
        body: `Great news! Your booking at ${booking.salon.name} for ${booking.service.name} has been confirmed.`,
        type: 'Booking Confirmed',
        referenceId: booking.id,
      });
      await sendNotification({
        userId: booking.salon.ownerId,
        title: 'Booking Confirmed',
        body: `You confirmed booking #${booking.id} for client ${booking.user.name}.`,
        type: 'Booking Confirmed',
        referenceId: booking.id,
      });
      await sendNotification({
        staffId: booking.staffId,
        title: 'Booking Confirmed',
        body: `Your assigned service for ${booking.user.name} on ${new Date(booking.bookingDate).toLocaleDateString()} at ${booking.startTime} is confirmed.`,
        type: 'Booking Confirmed',
        referenceId: booking.id,
      });
    } else if (newStatus === 'CANCELLED') {
      await sendNotification({
        userId: booking.userId,
        title: 'Booking Cancelled',
        body: `Your booking at ${booking.salon.name} for ${booking.service.name} has been cancelled.`,
        type: 'Booking Cancelled',
        referenceId: booking.id,
      });
      await sendNotification({
        userId: booking.salon.ownerId,
        title: 'Booking Cancelled',
        body: `Booking #${booking.id} was cancelled.`,
        type: 'Booking Cancelled',
        referenceId: booking.id,
      });
      await sendNotification({
        staffId: booking.staffId,
        title: 'Booking Cancelled',
        body: `Your assigned appointment for ${booking.user.name} at ${booking.startTime} has been cancelled.`,
        type: 'Booking Cancelled',
        referenceId: booking.id,
      });
    } else if (newStatus === 'REJECTED') {
      await sendNotification({
        userId: booking.userId,
        title: 'Booking Rejected',
        body: `Sorry, your booking at ${booking.salon.name} for ${booking.service.name} was rejected.`,
        type: 'Booking Rejected',
        referenceId: booking.id,
      });
      await sendNotification({
        userId: booking.salon.ownerId,
        title: 'Booking Rejected',
        body: `You rejected booking request #${booking.id} for ${booking.user.name}.`,
        type: 'Booking Rejected',
        referenceId: booking.id,
      });
    } else if (newStatus === 'COMPLETED') {
      await sendNotification({
        userId: booking.userId,
        title: 'Booking Completed',
        body: `Thank you for visiting ${booking.salon.name}! Your service for ${booking.service.name} is complete.`,
        type: 'Booking Completed',
        referenceId: booking.id,
      });
      await sendNotification({
        userId: booking.salon.ownerId,
        title: 'Booking Completed',
        body: `Booking #${booking.id} is marked completed. Payment of ₹${booking.totalPrice} has been received.`,
        type: 'Booking Completed',
        referenceId: booking.id,
      });
      await sendNotification({
        staffId: booking.staffId,
        title: 'Booking Completed',
        body: `Service completed: ${booking.service.name} for ${booking.user.name}. Job well done!`,
        type: 'Booking Completed',
        referenceId: booking.id,
      });
    }

    return NextResponse.json({
      message: `Booking status updated to ${newStatus}`,
      booking: updatedBooking,
    });

  } catch (error) {
    console.error('Update booking status error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
