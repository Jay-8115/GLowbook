import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ serviceId: string }> }
) {
  try {
    const { serviceId } = await context.params;

    // Fetch staff mapped to the service
    const staffMappings = await prisma.staffService.findMany({
      where: { serviceId },
      include: {
        staff: {
          include: {
            bookings: {
              where: { status: 'COMPLETED' },
              include: { review: true }
            }
          }
        }
      }
    });

    const response = staffMappings.map((mapping) => {
      const staff = mapping.staff;
      
      // Calculate average rating from completed reviews
      const completedBookings = staff.bookings.filter(b => b.status === 'COMPLETED');
      const reviews = completedBookings.map(b => b.review).filter(Boolean);
      const avgRating = reviews.length > 0
        ? parseFloat((reviews.reduce((acc, curr: any) => acc + curr.rating, 0) / reviews.length).toFixed(1))
        : 4.8; // default fallback rating

      return {
        staffId: staff.id,
        name: staff.name,
        specialization: staff.specialization,
        rating: avgRating,
        experience: staff.experience,
        avatarUrl: staff.avatarUrl
      };
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Fetch staff for service error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
