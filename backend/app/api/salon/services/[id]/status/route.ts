import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/middleware';
import { z } from 'zod';

const toggleStatusSchema = z.object({
  isActive: z.boolean().optional(),
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

    let nextStatus = !service.isActive;

    try {
      const body = await req.json();
      const validation = toggleStatusSchema.safeParse(body);
      if (validation.success && validation.data.isActive !== undefined) {
        nextStatus = validation.data.isActive;
      }
    } catch (e) {
      // Body might be empty, toggle defaults
    }

    const updatedService = await prisma.service.update({
      where: { id },
      data: { isActive: nextStatus },
    });

    return NextResponse.json({
      message: `Service status updated to ${nextStatus ? 'active' : 'inactive'}`,
      service: updatedService,
    });

  } catch (error) {
    console.error('Toggle service status error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
