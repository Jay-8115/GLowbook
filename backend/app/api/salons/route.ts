import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticate } from '@/lib/middleware';
import { z } from 'zod';

const createSalonSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(5),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  lat: z.number(),
  lng: z.number(),
  phone: z.string().min(5),
  imageUrl: z.string().url(),
  images: z.array(z.string().url()).default([]),
  openTime: z.string(), // "09:00"
  closeTime: z.string(), // "21:00"
  totalSeats: z.number().int().min(1).default(1),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const categoryId = searchParams.get('categoryId') || undefined;
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius') || '10'; // default 10 km

    let salons;

    if (lat && lng) {
      const latVal = parseFloat(lat);
      const lngVal = parseFloat(lng);
      const radiusVal = parseFloat(radius);

      // Perform Haversine formula calculation in raw SQL to get IDs and distance
      const rawSalons: { id: string; distance: number }[] = await prisma.$queryRaw`
        SELECT id, (
          6371 * acos(
            cos(radians(${latVal})) * cos(radians(lat)) *
            cos(radians(lng) - radians(${lngVal})) +
            sin(radians(${latVal})) * sin(radians(lat))
          )
        ) AS distance
        FROM "Salon"
        WHERE "isActive" = true
        ORDER BY distance ASC
      `;

      // Filter by radius in JS and fetch full objects
      const matchingSalonIds = rawSalons
        .filter((s) => s.distance <= radiusVal)
        .map((s) => s.id);

      salons = await prisma.salon.findMany({
        where: {
          id: { in: matchingSalonIds },
          isActive: true,
          name: search ? { contains: search, mode: 'insensitive' } : undefined,
          services: categoryId
            ? {
                some: {
                  categoryId,
                  isActive: true,
                },
              }
            : undefined,
        },
        include: {
          services: { where: { isActive: true } },
        },
      });

      // Inject distance back into objects
      salons = salons.map((salon: any) => {
        const match = rawSalons.find((rs) => rs.id === salon.id);
        return {
          ...salon,
          distance: match ? parseFloat(match.distance.toFixed(2)) : null,
        };
      }).sort((a: any, b: any) => (a.distance ?? 0) - (b.distance ?? 0));

    } else {
      salons = await prisma.salon.findMany({
        where: {
          isActive: true,
          OR: search
            ? [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ]
            : undefined,
          services: categoryId
            ? {
                some: {
                  categoryId,
                  isActive: true,
                },
              }
            : undefined,
        },
        include: {
          services: { where: { isActive: true } },
        },
        orderBy: { avgRating: 'desc' },
      });
    }

    return NextResponse.json({ salons });
  } catch (error) {
    console.error('Fetch salons error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req, ['OWNER', 'ADMIN']);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const validation = createSalonSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 });
    }

    const salon = await prisma.salon.create({
      data: {
        ...validation.data,
        ownerId: auth.user.id,
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: auth.user.id,
        action: 'SALON_CREATED',
        details: `Created salon ${salon.name} (ID: ${salon.id})`,
      },
    });

    return NextResponse.json({
      message: 'Salon created successfully',
      salon,
    }, { status: 201 });

  } catch (error) {
    console.error('Create salon error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
