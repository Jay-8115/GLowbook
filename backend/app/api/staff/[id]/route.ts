import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/middleware';
import { z } from 'zod';

const updateStaffSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.string().min(2).optional(),
  specialization: z.string().min(2).optional(),
  avatarUrl: z.string().url().optional(),
  isAvailable: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(req, ['OWNER', 'ADMIN']);
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    const staff = await prisma.staff.findUnique({
      where: { id },
      include: { salon: true },
    });

    if (!staff) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
    }

    if (auth.user.role === 'OWNER' && staff.salon.ownerId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden: You do not own this salon' }, { status: 403 });
    }

    const body = await req.json();
    const validation = updateStaffSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 });
    }

    const updatedStaff = await prisma.staff.update({
      where: { id },
      data: validation.data,
    });

    return NextResponse.json({
      message: 'Staff updated successfully',
      staff: updatedStaff,
    });
  } catch (error) {
    console.error('Update staff error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(req, ['OWNER', 'ADMIN']);
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    const staff = await prisma.staff.findUnique({
      where: { id },
      include: { salon: true },
    });

    if (!staff) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
    }

    if (auth.user.role === 'OWNER' && staff.salon.ownerId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden: You do not own this salon' }, { status: 403 });
    }

    // Check bookings
    const bookingsCount = await prisma.booking.count({ where: { staffId: id } });

    if (bookingsCount > 0) {
      // Soft delete: set availability to false
      await prisma.staff.update({
        where: { id },
        data: { isAvailable: false },
      });
      return NextResponse.json({ message: 'Staff has active bookings. Set availability to false (soft deleted).' });
    }

    // Hard delete
    await prisma.staff.delete({ where: { id } });
    return NextResponse.json({ message: 'Staff member deleted successfully' });
  } catch (error) {
    console.error('Delete staff error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
