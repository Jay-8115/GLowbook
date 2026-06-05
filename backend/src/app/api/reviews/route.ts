import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/utils/db';
import { authenticate } from '@/src/utils/middleware';
import { z } from 'zod';

const createReviewSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(3),
});

export async function POST(req: NextRequest) {
  const auth = await authenticate(req, ['USER']);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const validation = createReviewSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 });
    }

    const { bookingId, rating, comment } = validation.data;

    // Fetch booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { review: true, salon: true },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Verify booking belongs to this user
    if (booking.userId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden: You cannot review this booking' }, { status: 403 });
    }

    // Verify booking status is COMPLETED
    if (booking.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Forbidden: You can only review completed appointments' }, { status: 400 });
    }

    // Check if review already exists
    if (booking.review) {
      return NextResponse.json({ error: 'You have already reviewed this booking' }, { status: 400 });
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        userId: auth.user.id,
        salonId: booking.salonId,
        bookingId,
        rating,
        comment,
      },
    });

    // Recalculate Salon ratings
    const allReviews = await prisma.review.findMany({
      where: { salonId: booking.salonId },
      select: { rating: true },
    });

    const totalReviews = allReviews.length;
    const avgRating = allReviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / totalReviews;

    await prisma.salon.update({
      where: { id: booking.salonId },
      data: {
        avgRating: parseFloat(avgRating.toFixed(2)),
        totalReviews,
      },
    });

    // Socket notify owner
    const io = (global as any).io;
    if (io) {
      io.to(`salon:${booking.salonId}`).emit('review_received', { review, booking });
    }

    // Notification table entry for owner
    await prisma.notification.create({
      data: {
        userId: booking.salon.ownerId,
        title: 'New Review Received',
        body: `A user left a ${rating}-star review for booking at your salon.`,
        type: 'REVIEW_RECEIVED',
      },
    });

    return NextResponse.json({
      message: 'Review submitted successfully',
      review,
    }, { status: 201 });

  } catch (error) {
    console.error('Create review error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
