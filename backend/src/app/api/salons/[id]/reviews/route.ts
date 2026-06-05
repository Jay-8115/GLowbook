import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/utils/db';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const reviews = await prisma.review.findMany({
      where: { salonId: id },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error('Fetch salon reviews error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
