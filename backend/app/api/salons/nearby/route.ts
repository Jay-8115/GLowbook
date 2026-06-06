import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius') || '10'; // default 10 km
    const sort = searchParams.get('sort') || 'nearest'; // nearest, rating, popularity

    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Latitude (lat) and Longitude (lng) query parameters are required.' },
        { status: 400 }
      );
    }

    const latVal = parseFloat(lat);
    const lngVal = parseFloat(lng);
    const radiusVal = parseFloat(radius);

    if (isNaN(latVal) || isNaN(lngVal) || isNaN(radiusVal)) {
      return NextResponse.json(
        { error: 'Invalid coordinates or radius.' },
        { status: 400 }
      );
    }

    // Haversine formula calculation in raw SQL to get IDs and distance
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
    `;

    // Filter by radius and get matching IDs
    const matchedSalons = rawSalons.filter((s) => s.distance <= radiusVal);
    const matchedIds = matchedSalons.map((s) => s.id);

    // Fetch full Salon details
    const salons = await prisma.salon.findMany({
      where: {
        id: { in: matchedIds },
        isActive: true,
      },
      include: {
        services: { where: { isActive: true } },
      },
    });

    // Map the calculated distance back to the salon object
    const salonsWithDistance = salons.map((salon) => {
      const match = matchedSalons.find((ms) => ms.id === salon.id);
      return {
        ...salon,
        distance: match ? parseFloat(match.distance.toFixed(2)) : 0,
      };
    });

    // Apply sorting
    if (sort === 'nearest') {
      salonsWithDistance.sort((a, b) => a.distance - b.distance);
    } else if (sort === 'rating') {
      salonsWithDistance.sort((a, b) => b.avgRating - a.avgRating);
    } else if (sort === 'popularity') {
      salonsWithDistance.sort((a, b) => b.totalBookings - a.totalBookings);
    }

    return NextResponse.json(salonsWithDistance);

  } catch (error) {
    console.error('Fetch nearby salons error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
