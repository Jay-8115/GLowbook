import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/utils/db';
import { authenticate } from '@/src/utils/middleware';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ salonId: string }> }
) {
  const auth = await authenticate(req);
  if (auth instanceof NextResponse) return auth;

  const { salonId } = await context.params;

  try {
    // Check if salon exists
    const salon = await prisma.salon.findUnique({ where: { id: salonId } });
    if (!salon) {
      return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
    }

    // Check if already favorited
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_salonId: {
          userId: auth.user.id,
          salonId,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ message: 'Salon is already favorited' });
    }

    // Create favorite
    await prisma.favorite.create({
      data: {
        userId: auth.user.id,
        salonId,
      },
    });

    return NextResponse.json({ message: 'Salon added to favorites' }, { status: 201 });
  } catch (error) {
    console.error('Add favorite error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ salonId: string }> }
) {
  const auth = await authenticate(req);
  if (auth instanceof NextResponse) return auth;

  const { salonId } = await context.params;

  try {
    // Check if favorited
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_salonId: {
          userId: auth.user.id,
          salonId,
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Favorite not found' }, { status: 404 });
    }

    // Delete favorite
    await prisma.favorite.delete({
      where: {
        userId_salonId: {
          userId: auth.user.id,
          salonId,
        },
      },
    });

    return NextResponse.json({ message: 'Salon removed from favorites' });
  } catch (error) {
    console.error('Delete favorite error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
