import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/middleware';
import { z } from 'zod';

const createServiceSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(5),
  price: z.number().positive(),
  durationMinutes: z.number().int().positive(),
  categoryId: z.string().uuid(),
  imageUrl: z.string().url().optional(),
  discountPercent: z.number().min(0).max(100).default(0.0),
});

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const services = await prisma.service.findMany({
      where: { salonId: id, isActive: true },
      include: { category: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ services });
  } catch (error) {
    console.error('Fetch services error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(req, ['OWNER', 'ADMIN']);
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    // Check if salon exists and belongs to this owner
    const salon = await prisma.salon.findUnique({ where: { id } });
    if (!salon) {
      return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
    }

    if (auth.user.role === 'OWNER' && salon.ownerId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden: You do not own this salon' }, { status: 403 });
    }

    const body = await req.json();
    const validation = createServiceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 });
    }

    const service = await prisma.service.create({
      data: {
        ...validation.data,
        salonId: id,
      },
    });

    return NextResponse.json({
      message: 'Service added successfully',
      service,
    }, { status: 201 });
  } catch (error) {
    console.error('Create service error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
