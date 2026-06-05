import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const salons = await prisma.salon.findMany({
      where: {
        isActive: true,
        avgRating: { gte: 4.0 },
      },
      include: {
        services: { where: { isActive: true } },
      },
      orderBy: [
        { avgRating: 'desc' },
        { totalReviews: 'desc' },
      ],
      take: 10,
    });

    return NextResponse.json({ salons });
  } catch (error) {
    console.error('Fetch featured salons error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
