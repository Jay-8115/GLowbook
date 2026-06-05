import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/middleware';
import { z } from 'zod';

const createOrderSchema = z.object({
  bookingId: z.string().uuid(),
  provider: z.enum(['STRIPE', 'RAZORPAY']),
});

export async function POST(req: NextRequest) {
  const auth = await authenticate(req, ['USER']);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const validation = createOrderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 });
    }

    const { bookingId, provider } = validation.data;

    // Fetch booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.userId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
    }

    // Generate unique paymentIntentId (mock or actual)
    const paymentIntentId = `${provider.toLowerCase()}_pi_${Math.random().toString(36).substring(2, 15)}`;

    // Create payment in database
    const payment = await prisma.payment.create({
      data: {
        bookingId,
        amount: booking.totalPrice,
        status: 'PENDING',
        provider,
        paymentIntentId,
      },
    });

    // Mock client details to return
    const clientSecret = provider === 'STRIPE' 
      ? `seti_${Math.random().toString(36).substring(2, 15)}_secret_${Math.random().toString(36).substring(2, 15)}`
      : undefined;
    
    const orderId = provider === 'RAZORPAY'
      ? `order_${Math.random().toString(36).substring(2, 15)}`
      : undefined;

    return NextResponse.json({
      message: 'Payment order created successfully',
      paymentId: payment.id,
      amount: payment.amount,
      provider,
      paymentIntentId,
      clientSecret,
      orderId,
    }, { status: 201 });

  } catch (error) {
    console.error('Create payment order error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
