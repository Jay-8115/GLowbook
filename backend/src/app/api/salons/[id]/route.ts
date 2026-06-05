import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/utils/db';
import { authenticate } from '@/src/utils/middleware';
import { z } from 'zod';

const updateSalonSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().min(5).optional(),
  address: z.string().min(5).optional(),
  city: z.string().min(2).optional(),
  state: z.string().min(2).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  phone: z.string().min(5).optional(),
  imageUrl: z.string().url().optional(),
  images: z.array(z.string().url()).optional(),
  openTime: z.string().optional(),
  closeTime: z.string().optional(),
  totalSeats: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const salon = await prisma.salon.findUnique({
      where: { id },
      include: {
        services: { where: { isActive: true } },
        staff: { where: { isAvailable: true } },
        reviews: {
          include: {
            user: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!salon) {
      return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
    }

    return NextResponse.json({ salon });
  } catch (error) {
    console.error('Fetch salon details error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(req, ['OWNER', 'ADMIN']);
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    const salon = await prisma.salon.findUnique({ where: { id } });
    if (!salon) {
      return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
    }

    // Authorization: Owner must own this salon, or user is Admin
    if (auth.user.role === 'OWNER' && salon.ownerId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden: You do not own this salon' }, { status: 403 });
    }

    const body = await req.json();
    const validation = updateSalonSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 });
    }

    const updatedSalon = await prisma.salon.update({
      where: { id },
      data: validation.data,
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: auth.user.id,
        action: 'SALON_UPDATED',
        details: `Updated salon ${updatedSalon.name} (ID: ${id})`,
      },
    });

    return NextResponse.json({
      message: 'Salon updated successfully',
      salon: updatedSalon,
    });
  } catch (error) {
    console.error('Update salon error:', error);
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
    const salon = await prisma.salon.findUnique({ where: { id } });
    if (!salon) {
      return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
    }

    // Authorization: Owner must own this salon, or user is Admin
    if (auth.user.role === 'OWNER' && salon.ownerId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden: You do not own this salon' }, { status: 403 });
    }

    await prisma.salon.delete({ where: { id } });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: auth.user.id,
        action: 'SALON_DELETED',
        details: `Deleted salon ${salon.name} (ID: ${id})`,
      },
    });

    return NextResponse.json({ message: 'Salon deleted successfully' });
  } catch (error) {
    console.error('Delete salon error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
