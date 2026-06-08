import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/middleware';
import { sendNotification, broadcastSocketEvent } from '@/lib/notificationService';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
        salon: true,
        service: true,
        staff: true,
        payment: { select: { status: true } },
        review: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Auth constraints: User must be either the customer, the salon owner, or an admin
    if (auth.user.role === 'USER' && booking.userId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
    }

    if (auth.user.role === 'OWNER' && booking.salon.ownerId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
    }

    return NextResponse.json({ booking });
  } catch (error) {
    console.error('Fetch booking details error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(req, ['OWNER', 'ADMIN']);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await context.params;
    const body = await req.json();
    const { staffId } = body;

    if (!staffId) {
      return NextResponse.json({ error: 'staffId is required' }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { salon: true }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.salon.ownerId !== auth.user.id && auth.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
    }

    const oldStaffId = booking.staffId;

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: { staffId },
      include: {
        user: { select: { id: true, name: true } },
        salon: true,
        service: true,
        staff: true,
      }
    });

    // Broadcast Socket.io events
    broadcastSocketEvent(`user:${booking.userId}`, 'staff_changed', updatedBooking);
    broadcastSocketEvent(`salon:${booking.salonId}`, 'staff_changed', updatedBooking);
    
    // Notify previous and newly assigned staff
    broadcastSocketEvent(`staff:${oldStaffId}`, 'booking_cancelled', updatedBooking);
    broadcastSocketEvent(`staff:${staffId}`, 'staff_assigned', updatedBooking);

    await sendNotification({
      userId: booking.userId,
      title: 'Staff Assigned',
      body: `A new stylist, ${updatedBooking.staff.name}, has been assigned to your appointment at ${booking.salon.name}.`,
      type: 'Staff Assigned',
      referenceId: booking.id,
    });

    await sendNotification({
      staffId: staffId,
      title: 'New Assigned Booking',
      body: `You have been assigned to booking #${booking.id} at ${booking.salon.name} for ${updatedBooking.service.name}.`,
      type: 'New Assigned Booking',
      referenceId: booking.id,
    });

    return NextResponse.json({
      message: 'Stylist re-assigned successfully',
      booking: updatedBooking,
    });
  } catch (error) {
    console.error('Update booking staff error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
