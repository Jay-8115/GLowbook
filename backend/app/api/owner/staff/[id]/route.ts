import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/middleware';
import { z } from 'zod';

const updateStaffSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  specialization: z.string().min(1).optional(),
  avatarUrl: z.preprocess((val) => val === '' ? null : val, z.string().nullable().optional()),
  phone: z.preprocess((val) => val === '' ? null : val, z.string().nullable().optional()),
  email: z.preprocess((val) => val === '' ? null : val, z.string().email().nullable().optional()),
  workingDays: z.array(z.string()).optional(),
  workingHours: z.preprocess((val) => val === '' ? null : val, z.string().nullable().optional()),
  experience: z.number().int().nonnegative().optional(),
  languages: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(req, ['OWNER', 'ADMIN']);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await context.params;
    const body = await req.json();
    const validation = updateStaffSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 });
    }

    const data = validation.data;

    // Verify staff exists and belongs to owner's salon
    const staff = await prisma.staff.findUnique({
      where: { id },
      include: { salon: true },
    });

    if (!staff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    if (staff.salon.ownerId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
    }

    // Update staff
    const updatedStaff = await prisma.staff.update({
      where: { id },
      data: {
        name: data.name,
        role: data.role,
        specialization: data.specialization,
        avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : undefined,
        phone: data.phone !== undefined ? data.phone : undefined,
        email: data.email !== undefined ? data.email : undefined,
        workingDays: data.workingDays,
        workingHours: data.workingHours !== undefined ? data.workingHours : undefined,
        experience: data.experience,
        languages: data.languages,
        isActive: data.isActive,
        isAvailable: data.isAvailable,
      },
    });

    return NextResponse.json({
      message: 'Staff member updated successfully',
      staff: updatedStaff,
    });
  } catch (error) {
    console.error('Update owner staff error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(req, ['OWNER', 'ADMIN']);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await context.params;

    // Verify staff exists and belongs to owner's salon
    const staff = await prisma.staff.findUnique({
      where: { id },
      include: { salon: true },
    });

    if (!staff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    if (staff.salon.ownerId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
    }

    // Delete staff
    await prisma.staff.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Staff member deleted successfully',
    });
  } catch (error) {
    console.error('Delete owner staff error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
