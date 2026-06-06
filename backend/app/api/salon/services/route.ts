import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/middleware';
import { z } from 'zod';

const createServiceSchema = z.object({
  salonId: z.string().uuid(),
  name: z.string().min(2),
  description: z.string().min(5),
  category: z.string().min(2), // category name as string
  durationMinutes: z.number().int().positive(),
  price: z.number().positive(),
  imageUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const auth = await authenticate(req, ['OWNER', 'ADMIN']);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const validation = createServiceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { salonId, category: categoryName, ...rest } = validation.data;

    // Verify salon exists and belongs to owner
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
    });

    if (!salon) {
      return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
    }

    if (auth.user.role === 'OWNER' && salon.ownerId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden: You do not own this salon' }, { status: 403 });
    }

    // Resolve category name to Category record (find or create)
    const category = await prisma.category.upsert({
      where: { name: categoryName },
      update: {},
      create: {
        name: categoryName,
        icon: 'spa', // default icon
      },
    });

    // Create service
    const service = await prisma.service.create({
      data: {
        ...rest,
        salonId,
        categoryId: category.id,
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: auth.user.id,
        action: 'SERVICE_CREATED',
        details: `Created service "${service.name}" for salon "${salon.name}"`,
      },
    });

    return NextResponse.json({
      message: 'Service created successfully',
      service,
    }, { status: 201 });

  } catch (error) {
    console.error('Create service error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
