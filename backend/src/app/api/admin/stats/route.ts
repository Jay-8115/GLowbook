import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/utils/db';
import { authenticate } from '@/src/utils/middleware';

export async function GET(req: NextRequest) {
  const auth = await authenticate(req, ['ADMIN']);
  if (auth instanceof NextResponse) return auth;

  try {
    const totalUsers = await prisma.user.count({ where: { role: 'USER' } });
    const totalOwners = await prisma.user.count({ where: { role: 'OWNER' } });
    const totalSalons = await prisma.salon.count();
    const totalBookings = await prisma.booking.count();
    
    // Status breakdowns
    const pendingBookings = await prisma.booking.count({ where: { status: 'PENDING' } });
    const completedBookings = await prisma.booking.count({ where: { status: 'COMPLETED' } });
    const cancelledBookings = await prisma.booking.count({ where: { status: 'CANCELLED' } });
    
    // Revenue aggregates
    const completedPayments = await prisma.payment.findMany({
      where: { status: 'COMPLETED' },
      select: { amount: true },
    });
    const totalRevenue = completedPayments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);

    return NextResponse.json({
      stats: {
        totalUsers,
        totalOwners,
        totalSalons,
        totalBookings,
        pendingBookings,
        completedBookings,
        cancelledBookings,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      },
    });
  } catch (error) {
    console.error('Fetch admin stats error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
