import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/utils/db';
import { authenticate } from '@/src/utils/middleware';
import { z } from 'zod';

const updateServiceSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().min(5).optional(),
  price: z.number().positive().optional(),
  durationMinutes: z.number().int().positive().optional(),
  categoryId: z.string().uuid().optional(),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(req, ['OWNER', 'ADMIN']);
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    const service = await prisma.service.findUnique({
      where: { id },
      include: { salon: true },
    });

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    if (auth.user.role === 'OWNER' && service.salon.ownerId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden: You do not own this salon' }, { status: 403 });
    }

    const body = await req.json();
    const validation = updateServiceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 });
    }

    const updatedService = await prisma.service.update({
      where: { id },
      data: validation.data,
    });

    return NextResponse.json({
      message: 'Service updated successfully',
      service: updatedService,
    });
  } catch (error) {
    console.error('Update service error:', error);
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
    const service = await prisma.service.findUnique({
      where: { id },
      include: { salon: true },
    });

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    if (auth.user.role === 'OWNER' && service.salon.ownerId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden: You do not own this salon' }, { status: 403 });
    }

    // Check if the service has active bookings
    const bookingsCount = await prisma.booking.count({ where: { serviceId: id } });

    if (bookingsCount > 0) {
      // Soft delete: Deactivate the service so old bookings aren't broken but it's hidden from new bookings
      await prisma.service.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({ message: 'Service has active bookings. Soft deleted successfully (deactivated).' });
    }

    // Hard delete
    await prisma.service.delete({ where: { id } });
    return NextResponse.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Delete service error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
