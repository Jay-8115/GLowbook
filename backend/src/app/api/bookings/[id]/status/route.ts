import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/utils/db';
import { authenticate } from '@/src/utils/middleware';
import { z } from 'zod';

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
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

    // Update booking status
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: { status: newStatus },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        salon: true,
        service: true,
        staff: true,
      },
    });

    // Handle extra logic based on status
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

    // Real-time Event broadcast
    const io = (global as any).io;
    if (io) {
      const eventName = `booking_${newStatus.toLowerCase()}`;
      // Notify customer and salon owner rooms
      io.to(`user:${booking.userId}`).emit(eventName, updatedBooking);
      io.to(`salon:${booking.salonId}`).emit(eventName, updatedBooking);
      console.log(`[Socket] Emitted ${eventName} to user:${booking.userId} and salon:${booking.salonId}`);
    }

    // Generate notifications
    await prisma.notification.create({
      data: {
        userId: booking.userId,
        title: `Booking Update`,
        body: `Your booking at ${booking.salon.name} has been ${newStatus.toLowerCase()}.`,
        type: 'BOOKING_UPDATE',
      },
    });

    return NextResponse.json({
      message: `Booking status updated to ${newStatus}`,
      booking: updatedBooking,
    });

  } catch (error) {
    console.error('Update booking status error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
