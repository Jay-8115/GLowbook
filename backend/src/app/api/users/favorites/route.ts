import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/utils/db';
import { authenticate } from '@/src/utils/middleware';

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: auth.user.id },
      include: {
        salon: {
          select: {
            id: true,
            name: true,
            description: true,
            address: true,
            city: true,
            state: true,
            phone: true,
            imageUrl: true,
            avgRating: true,
            totalReviews: true,
            totalSeats: true,
            openTime: true,
            closeTime: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      favorites: favorites.map((fav: any) => fav.salon),
    });
  } catch (error) {
    console.error('Fetch favorites error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
