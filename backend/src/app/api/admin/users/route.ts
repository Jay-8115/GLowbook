import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/utils/db';
import { authenticate } from '@/src/utils/middleware';
import { z } from 'zod';

const editUserSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['USER', 'OWNER', 'ADMIN']).optional(),
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await authenticate(req, ['ADMIN']);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const role = searchParams.get('role') || undefined;

    const users = await prisma.user.findMany({
      where: {
        role: role as any,
        OR: search
          ? [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Fetch admin users error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await authenticate(req, ['ADMIN']);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const validation = editUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 });
    }

    const { id, ...data } = validation.data;

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: auth.user.id,
        action: 'ADMIN_USER_UPDATED',
        details: `Updated user ${updatedUser.email} properties: ${JSON.stringify(data)}`,
      },
    });

    return NextResponse.json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Admin edit user error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
