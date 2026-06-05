import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/middleware';
import { z } from 'zod';

const createStaffSchema = z.object({
  name: z.string().min(2),
  role: z.string().min(2),
  specialization: z.string().min(2),
  avatarUrl: z.string().url().optional(),
  isAvailable: z.boolean().default(true),
});

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const staff = await prisma.staff.findMany({
      where: { salonId: id },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ staff });
  } catch (error) {
    console.error('Fetch staff error:', error);
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
    const salon = await prisma.salon.findUnique({ where: { id } });
    if (!salon) {
      return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
    }

    if (auth.user.role === 'OWNER' && salon.ownerId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden: You do not own this salon' }, { status: 403 });
    }

    const body = await req.json();
    const validation = createStaffSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 });
    }

    const staff = await prisma.staff.create({
      data: {
        ...validation.data,
        salonId: id,
      },
    });

    return NextResponse.json({
      message: 'Staff member added successfully',
      staff,
    }, { status: 201 });
  } catch (error) {
    console.error('Create staff error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
