import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/middleware';
import { z } from 'zod';

const createStaffSchema = z.object({
  salonId: z.string().uuid(),
  name: z.string().min(1),
  role: z.string().min(1),
  specialization: z.string().min(1),
  avatarUrl: z.preprocess((val) => val === '' ? null : val, z.string().nullable().optional()),
  phone: z.preprocess((val) => val === '' ? null : val, z.string().nullable().optional()),
  email: z.preprocess((val) => val === '' ? null : val, z.string().email().nullable().optional()),
  workingDays: z.array(z.string()),
  workingHours: z.preprocess((val) => val === '' ? null : val, z.string().nullable().optional()),
  experience: z.number().int().nonnegative().default(0),
  languages: z.array(z.string()),
  isActive: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const auth = await authenticate(req, ['OWNER', 'ADMIN']);
  if (auth instanceof NextResponse) return auth;

  try {
    // 1. Fetch salons owned by the owner
    const salons = await prisma.salon.findMany({
      where: { ownerId: auth.user.id },
      select: { id: true },
    });
    const salonIds = salons.map((s) => s.id);

    if (salonIds.length === 0) {
      return NextResponse.json({ staff: [] });
    }

    // 2. Fetch staff members
    const staffMembers = await prisma.staff.findMany({
      where: { salonId: { in: salonIds } },
      include: {
        salon: { select: { id: true, name: true } },
        services: { include: { service: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ staff: staffMembers });
  } catch (error) {
    console.error('Fetch owner staff error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req, ['OWNER', 'ADMIN']);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const validation = createStaffSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 });
    }

    const data = validation.data;

    // Verify ownership of the salon
    const salon = await prisma.salon.findFirst({
      where: { id: data.salonId, ownerId: auth.user.id },
    });

    if (!salon) {
      return NextResponse.json({ error: 'Forbidden: You do not own this salon' }, { status: 403 });
    }

    // Create staff member
    const newStaff = await prisma.staff.create({
      data: {
        salonId: data.salonId,
        name: data.name,
        role: data.role,
        specialization: data.specialization,
        avatarUrl: data.avatarUrl || null,
        phone: data.phone || null,
        email: data.email || null,
        workingDays: data.workingDays,
        workingHours: data.workingHours || null,
        experience: data.experience,
        languages: data.languages,
        isActive: data.isActive,
        isAvailable: true,
      },
    });

    return NextResponse.json({
      message: 'Staff member created successfully',
      staff: newStaff,
    }, { status: 201 });
  } catch (error) {
    console.error('Create owner staff error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
