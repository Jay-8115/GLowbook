import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/utils/db';
import { authenticate } from '@/src/utils/middleware';
import { z } from 'zod';

const verifyPaymentSchema = z.object({
  paymentIntentId: z.string(),
  status: z.enum(['success', 'failed']),
  referenceId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await authenticate(req, ['USER']);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const validation = verifyPaymentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 });
    }

    const { paymentIntentId, status, referenceId } = validation.data;

    // Fetch payment
    const payment = await prisma.payment.findUnique({
      where: { paymentIntentId },
      include: { booking: true },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    if (status === 'failed') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
      return NextResponse.json({ message: 'Payment marked as failed' });
    }

    // Update payment to COMPLETED
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'COMPLETED' },
    });

    // Create transaction log
    await prisma.transaction.create({
      data: {
        paymentId: payment.id,
        type: 'CREDIT',
        amount: payment.amount,
        status: 'success',
        referenceId,
      },
    });

    // Automatically transition booking status from PENDING to ACCEPTED
    const updatedBooking = await prisma.booking.update({
      where: { id: payment.bookingId },
      data: { status: 'ACCEPTED' },
      include: {
        user: { select: { id: true, name: true } },
        salon: true,
        service: true,
        staff: true,
      },
    });

    // Emit event
    const io = (global as any).io;
    if (io) {
      io.to(`salon:${updatedBooking.salonId}`).emit('booking_accepted', updatedBooking);
      io.to(`user:${updatedBooking.userId}`).emit('booking_accepted', updatedBooking);
    }

    // Create notifications
    await prisma.notification.create({
      data: {
        userId: updatedBooking.userId,
        title: 'Payment Confirmed',
        body: `Your payment of $${payment.amount} was confirmed. Booking is now accepted!`,
        type: 'BOOKING_UPDATE',
      },
    });

    await prisma.notification.create({
      data: {
        userId: updatedBooking.salon.ownerId,
        title: 'Booking Paid & Accepted',
        body: `Booking for ${updatedBooking.user.name} was paid and automatically accepted.`,
        type: 'BOOKING_UPDATE',
      },
    });

    return NextResponse.json({
      message: 'Payment verified and booking accepted successfully',
      payment: updatedPayment,
      booking: updatedBooking,
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
