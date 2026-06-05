import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/utils/db';
import { authenticate } from '@/src/utils/middleware';
import { z } from 'zod';

const editSalonSchema = z.object({
  id: z.string().uuid(),
  isVerified: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await authenticate(req, ['ADMIN']);
  if (auth instanceof NextResponse) return auth;

  try {
    const salons = await prisma.salon.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ salons });
  } catch (error) {
    console.error('Fetch admin salons error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await authenticate(req, ['ADMIN']);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const validation = editSalonSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 });
    }

    const { id, isVerified, isActive } = validation.data;

    const updatedSalon = await prisma.salon.update({
      where: { id },
      data: { isVerified, isActive },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: auth.user.id,
        action: 'ADMIN_SALON_STATUS_UPDATED',
        details: `Salon ${updatedSalon.name} (ID: ${id}): verified=${isVerified}, active=${isActive}`,
      },
    });

    return NextResponse.json({
      message: 'Salon status updated successfully',
      salon: updatedSalon,
    });
  } catch (error) {
    console.error('Admin edit salon error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
