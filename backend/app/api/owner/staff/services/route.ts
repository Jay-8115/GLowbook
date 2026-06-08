import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/middleware';
import { z } from 'zod';

const assignServicesSchema = z.object({
  staffId: z.string().uuid(),
  serviceIds: z.array(z.string().uuid()),
});

export async function POST(req: NextRequest) {
  const auth = await authenticate(req, ['OWNER', 'ADMIN']);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const validation = assignServicesSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 });
    }

    const { staffId, serviceIds } = validation.data;

    // Verify staff exists and belongs to owner's salon
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      include: { salon: true },
    });

    if (!staff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    if (staff.salon.ownerId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
    }

    // Verify all serviceIds belong to the same salon
    const servicesCount = await prisma.service.count({
      where: {
        id: { in: serviceIds },
        salonId: staff.salonId,
      },
    });

    if (servicesCount !== serviceIds.length) {
      return NextResponse.json({ error: 'Invalid serviceIds: Services must belong to the staff member\'s salon outlet' }, { status: 400 });
    }

    // Use transaction to drop and recreate mappings
    await prisma.$transaction([
      prisma.staffService.deleteMany({
        where: { staffId },
      }),
      prisma.staffService.createMany({
        data: serviceIds.map((serviceId) => ({
          staffId,
          serviceId,
        })),
      }),
    ]);

    // Fetch updated mapping list
    const updatedServices = await prisma.staffService.findMany({
      where: { staffId },
      include: { service: true },
    });

    return NextResponse.json({
      message: 'Services assigned successfully',
      assignedServices: updatedServices.map((m) => m.service),
    });
  } catch (error) {
    console.error('Assign services to staff error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
