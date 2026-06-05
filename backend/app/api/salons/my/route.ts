import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/middleware';

export async function GET(req: NextRequest) {
  const auth = await authenticate(req, ['OWNER', 'ADMIN']);
  if (auth instanceof NextResponse) return auth;

  try {
    const salons = await prisma.salon.findMany({
      where: { ownerId: auth.user.id },
      include: {
        services: true,
        staff: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ salons });
  } catch (error) {
    console.error('Fetch owner salons error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
